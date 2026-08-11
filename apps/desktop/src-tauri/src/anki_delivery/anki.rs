use base64::{engine::general_purpose::STANDARD, Engine};
use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::{json, Map, Value};

use super::{card::RenderedCard, AnkiCatalog, AnkiModel, AnkiProfile, OperationError};

const ANKI_CONNECT_ENDPOINT: &str = "http://127.0.0.1:8765";
const ANKI_CONNECT_VERSION: u8 = 6;

pub(super) struct AnkiClient {
    http: reqwest::Client,
    endpoint: String,
}

impl AnkiClient {
    pub(super) fn new(http: reqwest::Client) -> Self {
        Self {
            http,
            endpoint: ANKI_CONNECT_ENDPOINT.to_owned(),
        }
    }

    pub(super) async fn version(&self) -> Result<u64, OperationError> {
        let version = self.invoke("version", json!({})).await?;
        if version != u64::from(ANKI_CONNECT_VERSION) {
            return Err(OperationError::new(
                "ANKI_VERSION_MISMATCH",
                "A versão do AnkiConnect não é compatível com o Dango.",
            ));
        }
        Ok(version)
    }

    pub(super) async fn catalog(&self) -> Result<AnkiCatalog, OperationError> {
        let decks: Vec<String> = self.invoke("deckNames", json!({})).await?;
        let model_names: Vec<String> = self.invoke("modelNames", json!({})).await?;
        let mut models = Vec::with_capacity(model_names.len());
        for name in model_names {
            let fields = self.model_fields(&name).await?;
            models.push(AnkiModel { name, fields });
        }
        Ok(AnkiCatalog { decks, models })
    }

    pub(super) async fn validate_profile(
        &self,
        profile: &AnkiProfile,
    ) -> Result<(), OperationError> {
        let decks: Vec<String> = self.invoke("deckNames", json!({})).await?;
        if !decks.contains(&profile.deck_name) {
            return Err(OperationError::new(
                "PROFILE_DECK_NOT_FOUND",
                "O baralho configurado não existe no Anki.",
            ));
        }

        let models: Vec<String> = self.invoke("modelNames", json!({})).await?;
        if !models.contains(&profile.model_name) {
            return Err(OperationError::new(
                "PROFILE_MODEL_NOT_FOUND",
                "O tipo de nota configurado não existe no Anki.",
            ));
        }

        let fields = self.model_fields(&profile.model_name).await?;
        if !fields.contains(&profile.front_field) {
            return Err(OperationError::new(
                "PROFILE_FRONT_FIELD_NOT_FOUND",
                "O campo de frente configurado não existe no tipo de nota.",
            ));
        }
        if !fields.contains(&profile.back_field) {
            return Err(OperationError::new(
                "PROFILE_BACK_FIELD_NOT_FOUND",
                "O campo de verso configurado não existe no tipo de nota.",
            ));
        }
        if profile.front_field == profile.back_field {
            return Err(OperationError::new(
                "PROFILE_FIELDS_MUST_DIFFER",
                "Os campos de frente e verso devem ser diferentes.",
            ));
        }
        Ok(())
    }

    async fn model_fields(&self, model_name: &str) -> Result<Vec<String>, OperationError> {
        self.invoke("modelFieldNames", json!({ "modelName": model_name }))
            .await
    }

    pub(super) async fn store_media(
        &self,
        filename: &str,
        data: &[u8],
    ) -> Result<String, OperationError> {
        self.invoke(
            "storeMediaFile",
            json!({
                "filename": filename,
                "data": STANDARD.encode(data),
            }),
        )
        .await
    }

    pub(super) async fn upsert_note(
        &self,
        profile: &AnkiProfile,
        card: &RenderedCard,
    ) -> Result<i64, OperationError> {
        let notes: Vec<i64> = self
            .invoke("findNotes", json!({ "query": format!("tag:{}", card.tag) }))
            .await?;
        let fields = note_fields(profile, card);

        if let Some(note_id) = notes.first().copied() {
            let _: Value = self
                .invoke(
                    "updateNoteFields",
                    json!({ "note": { "id": note_id, "fields": fields } }),
                )
                .await?;
            return Ok(note_id);
        }

        self.invoke(
            "addNote",
            json!({
                "note": {
                    "deckName": profile.deck_name,
                    "modelName": profile.model_name,
                    "fields": fields,
                    "options": { "allowDuplicate": true },
                    "tags": [card.tag],
                }
            }),
        )
        .await
    }

    async fn invoke<R>(&self, action: &str, params: Value) -> Result<R, OperationError>
    where
        R: DeserializeOwned,
    {
        let response = self
            .http
            .post(&self.endpoint)
            .json(&json!({
                "action": action,
                "version": ANKI_CONNECT_VERSION,
                "params": params,
            }))
            .send()
            .await
            .map_err(map_anki_request_error)?;

        if !response.status().is_success() {
            return Err(OperationError::new(
                "ANKI_HTTP_ERROR",
                "O AnkiConnect retornou um erro HTTP.",
            ));
        }

        let body = response.text().await.map_err(|_| {
            OperationError::new(
                "ANKI_INVALID_RESPONSE",
                "A resposta do AnkiConnect é inválida.",
            )
        })?;
        parse_anki_response(&body)
    }
}

fn note_fields(profile: &AnkiProfile, card: &RenderedCard) -> Value {
    let mut fields = Map::new();
    fields.insert(
        profile.front_field.clone(),
        Value::String(card.front.clone()),
    );
    fields.insert(profile.back_field.clone(), Value::String(card.back.clone()));
    Value::Object(fields)
}

fn map_anki_request_error(error: reqwest::Error) -> OperationError {
    if error.is_timeout() {
        OperationError::new(
            "ANKI_TIMEOUT",
            "O AnkiConnect demorou demais para responder.",
        )
    } else {
        OperationError::new(
            "ANKI_UNAVAILABLE",
            "Não foi possível acessar o AnkiConnect. Confirme que o Anki está aberto.",
        )
    }
}

#[derive(Deserialize)]
struct AnkiResponse {
    result: Value,
    error: Option<String>,
}

fn parse_anki_response<R>(body: &str) -> Result<R, OperationError>
where
    R: DeserializeOwned,
{
    let response: AnkiResponse = serde_json::from_str(body).map_err(|_| {
        OperationError::new(
            "ANKI_INVALID_RESPONSE",
            "A resposta do AnkiConnect é inválida.",
        )
    })?;

    if response.error.is_some() {
        return Err(OperationError::new(
            "ANKI_API_ERROR",
            "O AnkiConnect rejeitou a operação.",
        ));
    }

    serde_json::from_value(response.result).map_err(|_| {
        OperationError::new(
            "ANKI_INVALID_RESPONSE",
            "O resultado retornado pelo AnkiConnect é inválido.",
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_successful_anki_response() {
        let version: u64 = parse_anki_response(r#"{"result":6,"error":null}"#).unwrap();
        assert_eq!(version, 6);
    }

    #[test]
    fn classifies_an_anki_api_error_without_exposing_its_text() {
        let error = parse_anki_response::<u64>(
            r#"{"result":null,"error":"private field content in provider error"}"#,
        )
        .unwrap_err();

        assert_eq!(error.code, "ANKI_API_ERROR");
        assert!(!error.message.contains("private field"));
    }

    #[test]
    fn rejects_an_unexpected_result_shape() {
        let error = parse_anki_response::<Vec<String>>(r#"{"result":6,"error":null}"#).unwrap_err();
        assert_eq!(error.code, "ANKI_INVALID_RESPONSE");
    }

    #[test]
    fn accepts_a_null_result_for_anki_mutations() {
        let result: Value = parse_anki_response(r#"{"result":null,"error":null}"#).unwrap();
        assert_eq!(result, Value::Null);
    }
}
