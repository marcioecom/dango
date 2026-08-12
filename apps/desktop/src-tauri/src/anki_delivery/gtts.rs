use std::{
    fs::{self, File},
    io::Write,
    path::Path,
};

use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::header::{CONTENT_TYPE, REFERER, USER_AGENT};
use serde_json::{json, Value};

use super::OperationError;

const GOOGLE_TTS_ENDPOINT: &str =
    "https://translate.google.com/_/TranslateWebserverUi/data/batchexecute";
const GOOGLE_TTS_MAX_CHARS: usize = 100;
const GOOGLE_TTS_RPC: &str = "jQ1olc";
const GOOGLE_TTS_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; WOW64) \
AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36";

pub(super) struct GttsClient {
    http: reqwest::Client,
    endpoint: String,
}

impl GttsClient {
    pub(super) fn new(http: reqwest::Client) -> Self {
        Self {
            http,
            endpoint: GOOGLE_TTS_ENDPOINT.to_owned(),
        }
    }

    pub(super) async fn synthesize_to(
        &self,
        text: &str,
        destination: &Path,
    ) -> Result<(), OperationError> {
        let segments = segment_text(text, GOOGLE_TTS_MAX_CHARS)?;
        let mut audio = Vec::new();
        for segment in segments {
            audio.extend(self.synthesize_segment(&segment).await?);
        }

        if audio.is_empty() {
            return Err(OperationError::new(
                "TTS_EMPTY_RESPONSE",
                "O serviço de áudio retornou um arquivo vazio.",
            ));
        }
        atomic_write(destination, &audio)
    }

    async fn synthesize_segment(&self, text: &str) -> Result<Vec<u8>, OperationError> {
        let response = self
            .http
            .post(&self.endpoint)
            .header(REFERER, "http://translate.google.com/")
            .header(USER_AGENT, GOOGLE_TTS_USER_AGENT)
            .form(&[("f.req", package_rpc(text)?)])
            .send()
            .await
            .map_err(map_tts_request_error)?;

        if !response.status().is_success() {
            return Err(OperationError::new(
                "TTS_HTTP_ERROR",
                "O serviço de áudio recusou a solicitação.",
            ));
        }

        if let Some(content_type) = response.headers().get(CONTENT_TYPE) {
            let content_type = content_type.to_str().unwrap_or_default();
            if !content_type.contains("json") && !content_type.starts_with("text/") {
                return Err(OperationError::new(
                    "TTS_INVALID_CONTENT_TYPE",
                    "O serviço de áudio retornou um formato inesperado.",
                ));
            }
        }

        let body = response.text().await.map_err(|_| {
            OperationError::new("TTS_INVALID_RESPONSE", "A resposta de áudio é inválida.")
        })?;
        parse_rpc_audio(&body)
    }
}

fn map_tts_request_error(error: reqwest::Error) -> OperationError {
    if error.is_timeout() {
        OperationError::new(
            "TTS_TIMEOUT",
            "O serviço de áudio demorou demais para responder.",
        )
    } else {
        OperationError::new(
            "TTS_UNAVAILABLE",
            "Não foi possível acessar o serviço de áudio.",
        )
    }
}

fn package_rpc(text: &str) -> Result<String, OperationError> {
    let parameters = serde_json::to_string(&json!([text, "en", null, "null"]))
        .map_err(|_| OperationError::local_storage())?;
    serde_json::to_string(&json!([[[GOOGLE_TTS_RPC, parameters, null, "generic"]]]))
        .map_err(|_| OperationError::local_storage())
}

fn parse_rpc_audio(body: &str) -> Result<Vec<u8>, OperationError> {
    if body.trim().is_empty() {
        return Err(OperationError::new(
            "TTS_EMPTY_RESPONSE",
            "O serviço de áudio retornou uma resposta vazia.",
        ));
    }

    for line in body
        .lines()
        .map(str::trim)
        .filter(|line| line.starts_with('['))
    {
        if let Ok(value) = serde_json::from_str::<Value>(line) {
            if let Some(audio) = find_audio_in_rpc(&value)? {
                if audio.is_empty() {
                    break;
                }
                return Ok(audio);
            }
        }
    }

    Err(OperationError::new(
        "TTS_INVALID_RESPONSE",
        "O serviço de áudio não retornou dados MP3 válidos.",
    ))
}

fn find_audio_in_rpc(value: &Value) -> Result<Option<Vec<u8>>, OperationError> {
    let Value::Array(values) = value else {
        return Ok(None);
    };

    for (index, item) in values.iter().enumerate() {
        if item.as_str() == Some(GOOGLE_TTS_RPC) {
            let encoded_result =
                values
                    .get(index + 1)
                    .and_then(Value::as_str)
                    .ok_or_else(|| {
                        OperationError::new(
                            "TTS_INVALID_RESPONSE",
                            "A resposta de áudio é inválida.",
                        )
                    })?;
            let encoded_audio: Vec<String> =
                serde_json::from_str(encoded_result).map_err(|_| {
                    OperationError::new("TTS_INVALID_RESPONSE", "A resposta de áudio é inválida.")
                })?;
            let encoded_audio = encoded_audio.first().ok_or_else(|| {
                OperationError::new(
                    "TTS_EMPTY_RESPONSE",
                    "O serviço de áudio não retornou dados.",
                )
            })?;
            return STANDARD.decode(encoded_audio).map(Some).map_err(|_| {
                OperationError::new("TTS_INVALID_RESPONSE", "A resposta de áudio é inválida.")
            });
        }

        if let Some(audio) = find_audio_in_rpc(item)? {
            return Ok(Some(audio));
        }
    }
    Ok(None)
}

pub(super) fn segment_text(text: &str, max_chars: usize) -> Result<Vec<String>, OperationError> {
    if max_chars == 0 {
        return Err(OperationError::new(
            "TTS_INVALID_SEGMENT_SIZE",
            "O limite de segmentação de áudio é inválido.",
        ));
    }

    let mut remaining = text.trim();
    if remaining.is_empty() {
        return Err(OperationError::new(
            "TTS_EMPTY_TEXT",
            "A frase aprovada não pode estar vazia.",
        ));
    }

    let mut segments = Vec::new();
    while remaining.chars().count() > max_chars {
        let boundary = remaining
            .char_indices()
            .nth(max_chars)
            .map(|(index, _)| index)
            .unwrap_or(remaining.len());
        let candidate = &remaining[..boundary];
        let split_at = candidate
            .char_indices()
            .rev()
            .find(|(_, character)| is_split_character(*character))
            .map(|(index, character)| index + character.len_utf8())
            .unwrap_or(boundary);

        let segment = remaining[..split_at].trim();
        if !segment.is_empty() {
            segments.push(segment.to_owned());
        }
        remaining = remaining[split_at..].trim_start();
    }

    if !remaining.is_empty() {
        segments.push(remaining.to_owned());
    }
    Ok(segments)
}

fn is_split_character(character: char) -> bool {
    character.is_whitespace() || matches!(character, '.' | ',' | ';' | ':' | '!' | '?')
}

fn atomic_write(destination: &Path, bytes: &[u8]) -> Result<(), OperationError> {
    let parent = destination
        .parent()
        .ok_or_else(OperationError::local_storage)?;
    fs::create_dir_all(parent).map_err(|_| OperationError::local_storage())?;

    let mut temporary =
        tempfile::NamedTempFile::new_in(parent).map_err(|_| OperationError::local_storage())?;
    temporary
        .write_all(bytes)
        .map_err(|_| OperationError::local_storage())?;
    temporary
        .as_file()
        .sync_all()
        .map_err(|_| OperationError::local_storage())?;
    temporary
        .persist(destination)
        .map_err(|_| OperationError::local_storage())?;
    File::open(parent)
        .and_then(|directory| directory.sync_all())
        .map_err(|_| OperationError::local_storage())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn segments_by_unicode_characters_without_cutting_utf8() {
        let text = format!("{} fim", "á".repeat(101));
        let segments = segment_text(&text, 100).unwrap();

        assert_eq!(segments[0].chars().count(), 100);
        assert!(segments.iter().all(|part| part.chars().count() <= 100));
        assert_eq!(segments.concat(), text);
    }

    #[test]
    fn prefers_a_word_boundary_within_the_limit() {
        let segments = segment_text("one two three four", 8).unwrap();
        assert_eq!(segments, vec!["one two", "three", "four"]);
    }

    #[test]
    fn rejects_empty_text() {
        assert_eq!(segment_text("  ", 100).unwrap_err().code, "TTS_EMPTY_TEXT");
    }

    #[test]
    fn parses_the_nested_gtts_rpc_response() {
        let encoded = STANDARD.encode(b"mp3-data");
        let nested = json!([["wrb.fr", GOOGLE_TTS_RPC, format!("[\"{encoded}\"]"), null]]);
        let response = format!(")]}}'\n{}\n", serde_json::to_string(&nested).unwrap());

        assert_eq!(parse_rpc_audio(&response).unwrap(), b"mp3-data");
    }

    #[test]
    fn rejects_a_response_without_audio() {
        let error = parse_rpc_audio(")]}'\n[[\"other\"]]").unwrap_err();
        assert_eq!(error.code, "TTS_INVALID_RESPONSE");
    }
}
