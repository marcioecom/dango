use std::{path::Path, sync::Mutex};

use rusqlite::{params, Connection, OptionalExtension, Row};

use super::{
    AnkiProfile, ApprovedCard, DeliveryRecord, DeliverySummary, OperationError, RemoteStatus,
};

const SCHEMA: &str = r#"
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;

CREATE TABLE IF NOT EXISTS anki_profiles (
    account_id TEXT PRIMARY KEY NOT NULL,
    deck_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    front_field TEXT NOT NULL,
    back_field TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS anki_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT NOT NULL,
    capture_id TEXT NOT NULL,
    approval_id TEXT NOT NULL,
    approved_at TEXT NOT NULL,
    sentence TEXT NOT NULL,
    target_text TEXT NOT NULL,
    target_form TEXT NOT NULL,
    translations_pt_br TEXT NOT NULL,
    remote_status TEXT NOT NULL CHECK (remote_status IN ('approved', 'pending_anki')),
    status TEXT NOT NULL CHECK (status IN (
        'awaiting_remote_confirmation', 'queued', 'sending', 'audio_failed', 'anki_failed', 'sent'
    )),
    error_code TEXT,
    error_message TEXT,
    anki_note_id INTEGER,
    delivered_at TEXT,
    remote_sent_synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (account_id, capture_id, approval_id),
    UNIQUE (account_id, approval_id)
);

CREATE INDEX IF NOT EXISTS anki_deliveries_account_status
    ON anki_deliveries (account_id, remote_status, status, id);
"#;

pub(super) struct Store {
    connection: Mutex<Connection>,
}

impl Store {
    pub(super) fn open(path: &Path) -> Result<Self, OperationError> {
        let connection = Connection::open(path).map_err(|_| OperationError::local_storage())?;
        Self::initialize(connection)
    }

    #[cfg(test)]
    fn in_memory() -> Result<Self, OperationError> {
        let connection =
            Connection::open_in_memory().map_err(|_| OperationError::local_storage())?;
        Self::initialize(connection)
    }

    fn initialize(connection: Connection) -> Result<Self, OperationError> {
        connection
            .execute_batch(SCHEMA)
            .map_err(|_| OperationError::local_storage())?;
        connection
            .execute(
                "UPDATE anki_deliveries
                 SET status = 'anki_failed',
                     error_code = 'DELIVERY_INTERRUPTED',
                     error_message = 'A entrega foi interrompida e está pronta para nova tentativa.',
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE status = 'sending'",
                [],
            )
            .map_err(|_| OperationError::local_storage())?;
        Ok(Self {
            connection: Mutex::new(connection),
        })
    }

    pub(super) fn load_profile(
        &self,
        account_id: &str,
    ) -> Result<Option<AnkiProfile>, OperationError> {
        let connection = self.lock()?;
        connection
            .query_row(
                "SELECT account_id, deck_name, model_name, front_field, back_field
                 FROM anki_profiles WHERE account_id = ?1",
                [account_id],
                |row| {
                    Ok(AnkiProfile {
                        account_id: row.get(0)?,
                        deck_name: row.get(1)?,
                        model_name: row.get(2)?,
                        front_field: row.get(3)?,
                        back_field: row.get(4)?,
                    })
                },
            )
            .optional()
            .map_err(|_| OperationError::local_storage())
    }

    pub(super) fn save_profile(&self, profile: &AnkiProfile) -> Result<(), OperationError> {
        let connection = self.lock()?;
        connection
            .execute(
                "INSERT INTO anki_profiles (
                    account_id, deck_name, model_name, front_field, back_field
                 ) VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(account_id) DO UPDATE SET
                    deck_name = excluded.deck_name,
                    model_name = excluded.model_name,
                    front_field = excluded.front_field,
                    back_field = excluded.back_field,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
                params![
                    profile.account_id,
                    profile.deck_name,
                    profile.model_name,
                    profile.front_field,
                    profile.back_field,
                ],
            )
            .map_err(|_| OperationError::local_storage())?;
        Ok(())
    }

    pub(super) fn enqueue(
        &self,
        account_id: &str,
        card: &ApprovedCard,
    ) -> Result<DeliverySummary, OperationError> {
        let translations = serde_json::to_string(&card.translations_pt_br)
            .map_err(|_| OperationError::local_storage())?;
        let initial_status = match card.remote_status {
            RemoteStatus::Approved => "awaiting_remote_confirmation",
            RemoteStatus::PendingAnki => "queued",
        };
        let remote_status = card.remote_status.as_str();

        let mut connection = self.lock()?;
        let transaction = connection
            .transaction()
            .map_err(|_| OperationError::local_storage())?;
        transaction
            .execute(
                "INSERT INTO anki_deliveries (
                    account_id, capture_id, approval_id, approved_at, sentence,
                    target_text, target_form, translations_pt_br, remote_status, status
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                 ON CONFLICT(account_id, capture_id, approval_id) DO UPDATE SET
                    remote_status = CASE
                        WHEN excluded.remote_status = 'pending_anki' THEN 'pending_anki'
                        ELSE anki_deliveries.remote_status
                    END,
                    status = CASE
                        WHEN excluded.remote_status = 'pending_anki'
                         AND anki_deliveries.status = 'awaiting_remote_confirmation'
                        THEN 'queued'
                        ELSE anki_deliveries.status
                    END,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
                params![
                    account_id,
                    card.capture_id,
                    card.approval_id,
                    card.approved_at,
                    card.sentence,
                    card.target_text,
                    card.target_form,
                    translations,
                    remote_status,
                    initial_status,
                ],
            )
            .map_err(|_| OperationError::local_storage())?;
        let delivery = query_delivery_summary(
            &transaction,
            "WHERE account_id = ?1 AND capture_id = ?2 AND approval_id = ?3",
            params![account_id, card.capture_id, card.approval_id],
        )?;
        transaction
            .commit()
            .map_err(|_| OperationError::local_storage())?;
        Ok(delivery)
    }

    pub(super) fn mark_pending(
        &self,
        account_id: &str,
        approval_id: &str,
    ) -> Result<DeliverySummary, OperationError> {
        let connection = self.lock()?;
        let changed = connection
            .execute(
                "UPDATE anki_deliveries
                 SET remote_status = 'pending_anki',
                     status = CASE
                         WHEN status = 'awaiting_remote_confirmation' THEN 'queued'
                         ELSE status
                     END,
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE account_id = ?1 AND approval_id = ?2",
                params![account_id, approval_id],
            )
            .map_err(|_| OperationError::local_storage())?;
        if changed == 0 {
            return Err(OperationError::delivery_not_found());
        }
        query_delivery_summary(
            &connection,
            "WHERE account_id = ?1 AND approval_id = ?2 ORDER BY id DESC LIMIT 1",
            params![account_id, approval_id],
        )
    }

    pub(super) fn list(&self, account_id: &str) -> Result<Vec<DeliverySummary>, OperationError> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT capture_id, approval_id, status, error_code, error_message,
                        anki_note_id, approved_at, delivered_at, remote_sent_synced_at
                 FROM anki_deliveries
                 WHERE account_id = ?1
                 ORDER BY id ASC",
            )
            .map_err(|_| OperationError::local_storage())?;
        let rows = statement
            .query_map([account_id], delivery_summary_from_row)
            .map_err(|_| OperationError::local_storage())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| OperationError::local_storage())
    }

    pub(super) fn processable(
        &self,
        account_id: &str,
    ) -> Result<Vec<DeliveryRecord>, OperationError> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(
                "SELECT id, account_id, capture_id, approval_id, sentence, target_text,
                        target_form, translations_pt_br
                 FROM anki_deliveries
                 WHERE account_id = ?1
                   AND remote_status = 'pending_anki'
                   AND status IN ('queued', 'audio_failed', 'anki_failed')
                 ORDER BY id ASC",
            )
            .map_err(|_| OperationError::local_storage())?;
        let rows = statement
            .query_map([account_id], |row| {
                let translations_json: String = row.get(7)?;
                let translations_pt_br =
                    serde_json::from_str(&translations_json).map_err(|error| {
                        rusqlite::Error::FromSqlConversionFailure(
                            7,
                            rusqlite::types::Type::Text,
                            Box::new(error),
                        )
                    })?;
                Ok(DeliveryRecord {
                    id: row.get(0)?,
                    account_id: row.get(1)?,
                    capture_id: row.get(2)?,
                    approval_id: row.get(3)?,
                    sentence: row.get(4)?,
                    target_text: row.get(5)?,
                    target_form: row.get(6)?,
                    translations_pt_br,
                })
            })
            .map_err(|_| OperationError::local_storage())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| OperationError::local_storage())
    }

    pub(super) fn claim(&self, account_id: &str, delivery_id: i64) -> Result<bool, OperationError> {
        let connection = self.lock()?;
        let changed = connection
            .execute(
                "UPDATE anki_deliveries
                 SET status = 'sending', error_code = NULL, error_message = NULL,
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE id = ?1 AND account_id = ?2
                   AND remote_status = 'pending_anki'
                   AND status IN ('queued', 'audio_failed', 'anki_failed')",
                params![delivery_id, account_id],
            )
            .map_err(|_| OperationError::local_storage())?;
        Ok(changed == 1)
    }

    pub(super) fn fail(
        &self,
        account_id: &str,
        delivery_id: i64,
        status: &str,
        error: &OperationError,
    ) -> Result<(), OperationError> {
        debug_assert!(matches!(status, "audio_failed" | "anki_failed"));
        let connection = self.lock()?;
        connection
            .execute(
                "UPDATE anki_deliveries
                 SET status = ?1, error_code = ?2, error_message = ?3,
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE id = ?4 AND account_id = ?5 AND status = 'sending'",
                params![status, error.code, error.message, delivery_id, account_id],
            )
            .map_err(|_| OperationError::local_storage())?;
        Ok(())
    }

    pub(super) fn fail_processable(
        &self,
        account_id: &str,
        error: &OperationError,
    ) -> Result<(), OperationError> {
        let connection = self.lock()?;
        connection
            .execute(
                "UPDATE anki_deliveries
                 SET status = 'anki_failed', error_code = ?1, error_message = ?2,
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE account_id = ?3
                   AND remote_status = 'pending_anki'
                   AND status IN ('queued', 'audio_failed', 'anki_failed')",
                params![error.code, error.message, account_id],
            )
            .map_err(|_| OperationError::local_storage())?;
        Ok(())
    }

    pub(super) fn mark_sent(
        &self,
        account_id: &str,
        delivery_id: i64,
        note_id: i64,
    ) -> Result<(), OperationError> {
        let connection = self.lock()?;
        connection
            .execute(
                "UPDATE anki_deliveries
                 SET status = 'sent', error_code = NULL, error_message = NULL,
                     anki_note_id = ?1,
                     delivered_at = COALESCE(
                         delivered_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                     ),
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE id = ?2 AND account_id = ?3 AND status = 'sending'",
                params![note_id, delivery_id, account_id],
            )
            .map_err(|_| OperationError::local_storage())?;
        Ok(())
    }

    pub(super) fn mark_sent_synced(
        &self,
        account_id: &str,
        approval_id: &str,
    ) -> Result<DeliverySummary, OperationError> {
        let connection = self.lock()?;
        let changed = connection
            .execute(
                "UPDATE anki_deliveries
                 SET remote_sent_synced_at = COALESCE(
                         remote_sent_synced_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                     ),
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE account_id = ?1 AND approval_id = ?2 AND status = 'sent'",
                params![account_id, approval_id],
            )
            .map_err(|_| OperationError::local_storage())?;
        if changed == 0 {
            let exists = connection
                .query_row(
                    "SELECT 1 FROM anki_deliveries WHERE account_id = ?1 AND approval_id = ?2",
                    params![account_id, approval_id],
                    |_| Ok(()),
                )
                .optional()
                .map_err(|_| OperationError::local_storage())?;
            return Err(if exists.is_some() {
                OperationError::new(
                    "DELIVERY_NOT_SENT",
                    "A entrega ainda não foi confirmada pelo Anki.",
                )
            } else {
                OperationError::delivery_not_found()
            });
        }
        query_delivery_summary(
            &connection,
            "WHERE account_id = ?1 AND approval_id = ?2 ORDER BY id DESC LIMIT 1",
            params![account_id, approval_id],
        )
    }

    pub(super) fn sent_audio_keys(
        &self,
        account_id: Option<&str>,
    ) -> Result<Vec<(String, String)>, OperationError> {
        let connection = self.lock()?;
        let (sql, parameter) = match account_id {
            Some(account_id) => (
                "SELECT account_id, approval_id FROM anki_deliveries
                 WHERE status = 'sent' AND account_id = ?1",
                Some(account_id),
            ),
            None => (
                "SELECT account_id, approval_id FROM anki_deliveries WHERE status = 'sent'",
                None,
            ),
        };
        let mut statement = connection
            .prepare(sql)
            .map_err(|_| OperationError::local_storage())?;
        let keys = if let Some(parameter) = parameter {
            let rows = statement.query_map([parameter], audio_key_from_row);
            rows.map_err(|_| OperationError::local_storage())?
                .collect::<Result<Vec<_>, _>>()
        } else {
            let rows = statement.query_map([], audio_key_from_row);
            rows.map_err(|_| OperationError::local_storage())?
                .collect::<Result<Vec<_>, _>>()
        };
        keys.map_err(|_| OperationError::local_storage())
    }

    pub(super) fn set_cleanup_result(
        &self,
        account_id: &str,
        approval_id: &str,
        error: Option<&OperationError>,
    ) -> Result<(), OperationError> {
        let connection = self.lock()?;
        if let Some(error) = error {
            connection.execute(
                "UPDATE anki_deliveries
                 SET error_code = ?1, error_message = ?2,
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE account_id = ?3 AND approval_id = ?4 AND status = 'sent'",
                params![error.code, error.message, account_id, approval_id],
            )
        } else {
            connection.execute(
                "UPDATE anki_deliveries
                 SET error_code = NULL, error_message = NULL,
                     updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE account_id = ?1 AND approval_id = ?2 AND status = 'sent'
                   AND error_code = 'AUDIO_CLEANUP_FAILED'",
                params![account_id, approval_id],
            )
        }
        .map_err(|_| OperationError::local_storage())?;
        Ok(())
    }

    fn lock(&self) -> Result<std::sync::MutexGuard<'_, Connection>, OperationError> {
        self.connection
            .lock()
            .map_err(|_| OperationError::local_storage())
    }
}

fn query_delivery_summary<P: rusqlite::Params>(
    connection: &Connection,
    clause: &str,
    parameters: P,
) -> Result<DeliverySummary, OperationError> {
    let sql = format!(
        "SELECT capture_id, approval_id, status, error_code, error_message,
                anki_note_id, approved_at, delivered_at, remote_sent_synced_at
         FROM anki_deliveries {clause}"
    );
    connection
        .query_row(&sql, parameters, delivery_summary_from_row)
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => OperationError::delivery_not_found(),
            _ => OperationError::local_storage(),
        })
}

fn delivery_summary_from_row(row: &Row<'_>) -> rusqlite::Result<DeliverySummary> {
    Ok(DeliverySummary {
        capture_id: row.get(0)?,
        approval_id: row.get(1)?,
        status: row.get(2)?,
        error_code: row.get(3)?,
        error_message: row.get(4)?,
        anki_note_id: row.get(5)?,
        approved_at: row.get(6)?,
        delivered_at: row.get(7)?,
        remote_sent_synced_at: row.get(8)?,
    })
}

fn audio_key_from_row(row: &Row<'_>) -> rusqlite::Result<(String, String)> {
    Ok((row.get(0)?, row.get(1)?))
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    fn card(remote_status: RemoteStatus) -> ApprovedCard {
        ApprovedCard {
            capture_id: "capture-1".to_owned(),
            approval_id: "approval-1".to_owned(),
            approved_at: "2026-08-10T12:00:00Z".to_owned(),
            sentence: "I learn from tests.".to_owned(),
            target_text: "learn".to_owned(),
            target_form: "learn".to_owned(),
            translations_pt_br: vec!["aprender".to_owned()],
            remote_status,
        }
    }

    #[test]
    fn enqueue_is_idempotent_and_can_promote_remote_confirmation() {
        let store = Store::in_memory().unwrap();

        let first = store
            .enqueue("account-1", &card(RemoteStatus::Approved))
            .unwrap();
        let second = store
            .enqueue("account-1", &card(RemoteStatus::Approved))
            .unwrap();
        assert!(store.processable("account-1").unwrap().is_empty());
        let promoted = store
            .enqueue("account-1", &card(RemoteStatus::PendingAnki))
            .unwrap();

        assert_eq!(first.status, "awaiting_remote_confirmation");
        assert_eq!(second.approval_id, first.approval_id);
        assert_eq!(promoted.status, "queued");
        assert_eq!(store.list("account-1").unwrap().len(), 1);
    }

    #[test]
    fn account_queries_are_isolated() {
        let store = Store::in_memory().unwrap();
        let profile = AnkiProfile {
            account_id: "account-1".to_owned(),
            deck_name: "Deck".to_owned(),
            model_name: "Basic".to_owned(),
            front_field: "Front".to_owned(),
            back_field: "Back".to_owned(),
        };
        store.save_profile(&profile).unwrap();
        store
            .enqueue("account-1", &card(RemoteStatus::PendingAnki))
            .unwrap();

        assert_eq!(store.load_profile("account-1").unwrap(), Some(profile));
        assert_eq!(store.load_profile("account-2").unwrap(), None);
        assert!(store.list("account-2").unwrap().is_empty());
    }

    #[test]
    fn reopening_the_database_recovers_an_interrupted_send() {
        let directory = tempdir().unwrap();
        let database_path = directory.path().join("state.sqlite3");

        {
            let store = Store::open(&database_path).unwrap();
            store
                .enqueue("account-1", &card(RemoteStatus::PendingAnki))
                .unwrap();
            let delivery = store.processable("account-1").unwrap().remove(0);
            assert!(store.claim("account-1", delivery.id).unwrap());
            assert_eq!(store.list("account-1").unwrap()[0].status, "sending");
        }

        let reopened = Store::open(&database_path).unwrap();
        let recovered = &reopened.list("account-1").unwrap()[0];
        assert_eq!(recovered.status, "anki_failed");
        assert_eq!(
            recovered.error_code.as_deref(),
            Some("DELIVERY_INTERRUPTED")
        );
        assert_eq!(reopened.processable("account-1").unwrap().len(), 1);
    }

    #[test]
    fn remote_sent_ack_is_idempotent_and_requires_anki_confirmation() {
        let store = Store::in_memory().unwrap();
        store
            .enqueue("account-1", &card(RemoteStatus::PendingAnki))
            .unwrap();
        let delivery = store.processable("account-1").unwrap().remove(0);

        assert_eq!(
            store
                .mark_sent_synced("account-1", "approval-1")
                .unwrap_err()
                .code,
            "DELIVERY_NOT_SENT"
        );

        store.claim("account-1", delivery.id).unwrap();
        store.mark_sent("account-1", delivery.id, 42).unwrap();
        let first = store.mark_sent_synced("account-1", "approval-1").unwrap();
        let second = store.mark_sent_synced("account-1", "approval-1").unwrap();
        assert_eq!(first.remote_sent_synced_at, second.remote_sent_synced_at);
        assert_eq!(second.anki_note_id, Some(42));
    }
}
