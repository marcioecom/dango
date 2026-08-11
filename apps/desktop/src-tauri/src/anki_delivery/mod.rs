mod anki;
mod card;
mod gtts;
mod store;

use std::{
    fs,
    path::{Path, PathBuf},
    time::Duration,
};

use serde::{Deserialize, Serialize};
use tauri::State;

use self::{anki::AnkiClient, card::render_card, gtts::GttsClient, store::Store};

#[derive(Debug)]
pub struct OperationError {
    code: &'static str,
    message: String,
}

impl OperationError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    fn local_storage() -> Self {
        Self::new(
            "LOCAL_STORAGE_ERROR",
            "Não foi possível acessar o armazenamento local.",
        )
    }

    fn delivery_not_found() -> Self {
        Self::new("DELIVERY_NOT_FOUND", "A entrega local não foi encontrada.")
    }
}

impl std::fmt::Display for OperationError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl std::error::Error for OperationError {}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    error_code: String,
    message: String,
}

impl From<OperationError> for CommandError {
    fn from(error: OperationError) -> Self {
        Self {
            error_code: error.code.to_owned(),
            message: error.message,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnkiStatus {
    connected: bool,
    version: Option<u64>,
    error_code: Option<String>,
    message: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnkiCatalog {
    decks: Vec<String>,
    models: Vec<AnkiModel>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnkiModel {
    name: String,
    fields: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AnkiProfile {
    account_id: String,
    deck_name: String,
    model_name: String,
    front_field: String,
    back_field: String,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
enum RemoteStatus {
    Approved,
    PendingAnki,
}

impl RemoteStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Approved => "approved",
            Self::PendingAnki => "pending_anki",
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedCard {
    capture_id: String,
    approval_id: String,
    approved_at: String,
    sentence: String,
    target_text: String,
    target_form: String,
    translations_pt_br: Vec<String>,
    remote_status: RemoteStatus,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeliverySummary {
    capture_id: String,
    approval_id: String,
    status: String,
    error_code: Option<String>,
    error_message: Option<String>,
    anki_note_id: Option<i64>,
    approved_at: String,
    delivered_at: Option<String>,
    remote_sent_synced_at: Option<String>,
}

#[derive(Debug)]
struct DeliveryRecord {
    id: i64,
    account_id: String,
    capture_id: String,
    approval_id: String,
    sentence: String,
    target_text: String,
    target_form: String,
    translations_pt_br: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessedDeliveries {
    deliveries: Vec<DeliverySummary>,
}

pub struct NativeDeliveryState {
    store: Store,
    anki: AnkiClient,
    gtts: GttsClient,
    audio_root: PathBuf,
}

impl NativeDeliveryState {
    pub fn initialize(app_data_dir: PathBuf) -> Result<Self, OperationError> {
        fs::create_dir_all(&app_data_dir).map_err(|_| OperationError::local_storage())?;
        let audio_root = app_data_dir.join("audio");
        fs::create_dir_all(&audio_root).map_err(|_| OperationError::local_storage())?;

        let store = Store::open(&app_data_dir.join("dango.sqlite3"))?;
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|_| {
                OperationError::new("HTTP_CLIENT_ERROR", "Falha ao iniciar o cliente HTTP.")
            })?;
        let state = Self {
            store,
            anki: AnkiClient::new(http.clone()),
            gtts: GttsClient::new(http),
            audio_root,
        };
        state.cleanup_sent_audio(None)?;
        Ok(state)
    }

    fn audio_path(&self, account_id: &str, approval_id: &str) -> Result<PathBuf, OperationError> {
        validate_identifier("accountId", account_id)?;
        validate_identifier("approvalId", approval_id)?;
        Ok(self
            .audio_root
            .join(account_id)
            .join(format!("{approval_id}.mp3")))
    }

    fn cleanup_sent_audio(&self, account_id: Option<&str>) -> Result<(), OperationError> {
        for (stored_account_id, approval_id) in self.store.sent_audio_keys(account_id)? {
            let result = self
                .audio_path(&stored_account_id, &approval_id)
                .and_then(|path| remove_audio_if_present(&path));
            match result {
                Ok(()) => self
                    .store
                    .set_cleanup_result(&stored_account_id, &approval_id, None)?,
                Err(_) => {
                    let cleanup_error = OperationError::new(
                        "AUDIO_CLEANUP_FAILED",
                        "A nota foi enviada, mas o áudio local ainda não pôde ser removido.",
                    );
                    self.store.set_cleanup_result(
                        &stored_account_id,
                        &approval_id,
                        Some(&cleanup_error),
                    )?;
                }
            }
        }
        Ok(())
    }
}

#[tauri::command]
pub async fn get_anki_status(
    state: State<'_, NativeDeliveryState>,
) -> Result<AnkiStatus, CommandError> {
    Ok(match state.anki.version().await {
        Ok(version) => AnkiStatus {
            connected: true,
            version: Some(version),
            error_code: None,
            message: None,
        },
        Err(error) => AnkiStatus {
            connected: false,
            version: None,
            error_code: Some(error.code.to_owned()),
            message: Some(error.message),
        },
    })
}

#[tauri::command]
pub async fn get_anki_catalog(
    state: State<'_, NativeDeliveryState>,
) -> Result<AnkiCatalog, CommandError> {
    state.anki.catalog().await.map_err(Into::into)
}

#[tauri::command(rename_all = "camelCase")]
pub fn load_anki_profile(
    state: State<'_, NativeDeliveryState>,
    account_id: String,
) -> Result<Option<AnkiProfile>, CommandError> {
    validate_identifier("accountId", &account_id)?;
    state.store.load_profile(&account_id).map_err(Into::into)
}

#[tauri::command]
pub async fn save_anki_profile(
    state: State<'_, NativeDeliveryState>,
    profile: AnkiProfile,
) -> Result<AnkiProfile, CommandError> {
    validate_profile_input(&profile)?;
    state.anki.validate_profile(&profile).await?;
    state.store.save_profile(&profile)?;
    Ok(profile)
}

#[tauri::command(rename_all = "camelCase")]
pub fn enqueue_anki_delivery(
    state: State<'_, NativeDeliveryState>,
    account_id: String,
    card: ApprovedCard,
) -> Result<DeliverySummary, CommandError> {
    validate_identifier("accountId", &account_id)?;
    validate_identifier("captureId", &card.capture_id)?;
    validate_identifier("approvalId", &card.approval_id)?;
    if card.approved_at.trim().is_empty() {
        return Err(OperationError::new(
            "APPROVED_AT_REQUIRED",
            "A data da aprovação é obrigatória.",
        )
        .into());
    }
    state.store.enqueue(&account_id, &card).map_err(Into::into)
}

#[tauri::command(rename_all = "camelCase")]
pub fn mark_anki_delivery_pending(
    state: State<'_, NativeDeliveryState>,
    account_id: String,
    approval_id: String,
) -> Result<DeliverySummary, CommandError> {
    validate_identifier("accountId", &account_id)?;
    validate_identifier("approvalId", &approval_id)?;
    state
        .store
        .mark_pending(&account_id, &approval_id)
        .map_err(Into::into)
}

#[tauri::command(rename_all = "camelCase")]
pub fn list_anki_deliveries(
    state: State<'_, NativeDeliveryState>,
    account_id: String,
) -> Result<Vec<DeliverySummary>, CommandError> {
    validate_identifier("accountId", &account_id)?;
    state.store.list(&account_id).map_err(Into::into)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn process_anki_deliveries(
    state: State<'_, NativeDeliveryState>,
    account_id: String,
) -> Result<ProcessedDeliveries, CommandError> {
    validate_identifier("accountId", &account_id)?;
    state.cleanup_sent_audio(Some(&account_id))?;

    let processable = state.store.processable(&account_id)?;
    if processable.is_empty() {
        return Ok(ProcessedDeliveries {
            deliveries: state.store.list(&account_id)?,
        });
    }

    let Some(profile) = state.store.load_profile(&account_id)? else {
        return Ok(ProcessedDeliveries {
            deliveries: state.store.list(&account_id)?,
        });
    };

    if let Err(error) = state.anki.validate_profile(&profile).await {
        state.store.fail_processable(&account_id, &error)?;
        return Ok(ProcessedDeliveries {
            deliveries: state.store.list(&account_id)?,
        });
    }

    for delivery in processable {
        if !state.store.claim(&account_id, delivery.id)? {
            continue;
        }

        if let Err(failure) = process_delivery(&state, &profile, &delivery).await {
            state
                .store
                .fail(&account_id, delivery.id, failure.status, &failure.error)?;
        }
    }

    Ok(ProcessedDeliveries {
        deliveries: state.store.list(&account_id)?,
    })
}

async fn process_delivery(
    state: &NativeDeliveryState,
    profile: &AnkiProfile,
    delivery: &DeliveryRecord,
) -> Result<(), DeliveryFailure> {
    debug_assert_eq!(delivery.account_id, profile.account_id);
    let audio_path = state
        .audio_path(&delivery.account_id, &delivery.approval_id)
        .map_err(DeliveryFailure::audio)?;
    if !is_nonempty_file(&audio_path) {
        state
            .gtts
            .synthesize_to(&delivery.sentence, &audio_path)
            .await
            .map_err(DeliveryFailure::audio)?;
    }

    let audio = fs::read(&audio_path)
        .map_err(|_| DeliveryFailure::audio(OperationError::local_storage()))?;
    if audio.is_empty() {
        return Err(DeliveryFailure::audio(OperationError::new(
            "TTS_EMPTY_FILE",
            "O arquivo de áudio local está vazio.",
        )));
    }

    let card = render_card(
        &delivery.sentence,
        &delivery.target_text,
        &delivery.target_form,
        &delivery.translations_pt_br,
        &delivery.capture_id,
        &delivery.approval_id,
    )
    .map_err(DeliveryFailure::anki)?;
    state
        .anki
        .store_media(&card.media_filename, &audio)
        .await
        .map_err(DeliveryFailure::anki)?;
    let note_id = state
        .anki
        .upsert_note(profile, &card)
        .await
        .map_err(DeliveryFailure::anki)?;
    state
        .store
        .mark_sent(&delivery.account_id, delivery.id, note_id)
        .map_err(DeliveryFailure::anki)?;
    state
        .cleanup_sent_audio(Some(&delivery.account_id))
        .map_err(DeliveryFailure::anki)?;
    Ok(())
}

struct DeliveryFailure {
    status: &'static str,
    error: OperationError,
}

impl DeliveryFailure {
    fn audio(error: OperationError) -> Self {
        Self {
            status: "audio_failed",
            error,
        }
    }

    fn anki(error: OperationError) -> Self {
        Self {
            status: "anki_failed",
            error,
        }
    }
}

#[tauri::command(rename_all = "camelCase")]
pub fn mark_anki_delivery_sent_synced(
    state: State<'_, NativeDeliveryState>,
    account_id: String,
    approval_id: String,
) -> Result<DeliverySummary, CommandError> {
    validate_identifier("accountId", &account_id)?;
    validate_identifier("approvalId", &approval_id)?;
    state
        .store
        .mark_sent_synced(&account_id, &approval_id)
        .map_err(Into::into)
}

fn validate_profile_input(profile: &AnkiProfile) -> Result<(), CommandError> {
    validate_identifier("accountId", &profile.account_id)?;
    for value in [
        &profile.deck_name,
        &profile.model_name,
        &profile.front_field,
        &profile.back_field,
    ] {
        if value.trim().is_empty() {
            return Err(OperationError::new(
                "PROFILE_FIELD_REQUIRED",
                "Todos os campos do perfil Anki são obrigatórios.",
            )
            .into());
        }
    }
    Ok(())
}

fn validate_identifier(name: &str, value: &str) -> Result<(), OperationError> {
    if value.is_empty()
        || value == "."
        || value == ".."
        || value.contains('/')
        || value.contains('\\')
        || value.contains('\0')
    {
        return Err(OperationError::new(
            "INVALID_IDENTIFIER",
            format!("{name} possui um formato inválido."),
        ));
    }
    Ok(())
}

fn remove_audio_if_present(path: &Path) -> Result<(), OperationError> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err(OperationError::local_storage()),
    }
}

fn is_nonempty_file(path: &Path) -> bool {
    path.metadata()
        .map(|metadata| metadata.len() > 0)
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_path_traversal_identifiers() {
        assert_eq!(
            validate_identifier("accountId", "../another-account")
                .unwrap_err()
                .code,
            "INVALID_IDENTIFIER"
        );
        assert!(validate_identifier("accountId", "account-123").is_ok());
    }

    #[test]
    fn serializes_command_contracts_in_camel_case() {
        let profile = AnkiProfile {
            account_id: "account-1".to_owned(),
            deck_name: "Deck".to_owned(),
            model_name: "Basic".to_owned(),
            front_field: "Front".to_owned(),
            back_field: "Back".to_owned(),
        };
        let serialized = serde_json::to_value(&profile).unwrap();
        assert_eq!(serialized["accountId"], "account-1");
        assert_eq!(serialized["frontField"], "Front");
        assert!(serialized.get("account_id").is_none());

        let card: ApprovedCard = serde_json::from_value(serde_json::json!({
            "captureId": "capture-1",
            "approvalId": "approval-1",
            "approvedAt": "2026-08-10T12:00:00Z",
            "sentence": "I learn.",
            "targetText": "learn",
            "targetForm": "learn",
            "translationsPtBr": ["aprender"],
            "remoteStatus": "pending_anki"
        }))
        .unwrap();
        assert!(matches!(card.remote_status, RemoteStatus::PendingAnki));
    }
}
