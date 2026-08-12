use regex::RegexBuilder;
use sha2::{Digest, Sha256};

use super::OperationError;

#[derive(Debug, PartialEq)]
pub(super) struct RenderedCard {
    pub(super) front: String,
    pub(super) back: String,
    pub(super) tag: String,
    pub(super) media_filename: String,
}

pub(super) fn render_card(
    sentence: &str,
    target_text: &str,
    target_form: &str,
    translations: &[String],
    capture_id: &str,
    approval_id: &str,
) -> Result<RenderedCard, OperationError> {
    if target_form.is_empty() {
        return Err(OperationError::new(
            "TARGET_FORM_EMPTY",
            "A forma da expressão não pode estar vazia.",
        ));
    }

    let highlighted = highlight_target(sentence, target_form)?;
    let media_filename = media_filename(approval_id);
    let front = format!("{highlighted}<br>[sound:{media_filename}]");

    let translations = translations
        .iter()
        .map(|translation| escape_html(translation))
        .collect::<Vec<_>>()
        .join(", ");
    let back = format!("<b>{}</b>: {translations}", escape_html(target_text));

    Ok(RenderedCard {
        front,
        back,
        tag: capture_tag(capture_id),
        media_filename,
    })
}

fn highlight_target(sentence: &str, target_form: &str) -> Result<String, OperationError> {
    let pattern = target_form
        .split_whitespace()
        .map(regex::escape)
        .collect::<Vec<_>>()
        .join(r"\s+");
    let starts_with_word = target_form
        .chars()
        .next()
        .is_some_and(char::is_alphanumeric);
    let ends_with_word = target_form
        .chars()
        .next_back()
        .is_some_and(char::is_alphanumeric);
    let matcher = RegexBuilder::new(&pattern)
        .case_insensitive(true)
        .build()
        .map_err(|_| {
            OperationError::new(
                "TARGET_FORM_INVALID",
                "A forma aprovada não pôde ser processada.",
            )
        })?;
    let matches = matcher
        .find_iter(sentence)
        .filter(|found| {
            let previous = sentence[..found.start()].chars().next_back();
            let next = sentence[found.end()..].chars().next();
            (!starts_with_word || previous.is_none_or(|character| !character.is_alphanumeric()))
                && (!ends_with_word || next.is_none_or(|character| !character.is_alphanumeric()))
        })
        .collect::<Vec<_>>();
    if matches.is_empty() {
        return Err(OperationError::new(
            "TARGET_FORM_NOT_FOUND",
            "A forma aprovada não foi encontrada na frase.",
        ));
    }

    let mut output = String::new();
    let mut cursor = 0;
    for found in matches {
        output.push_str(&escape_html(&sentence[cursor..found.start()]));
        output.push_str("<b>");
        output.push_str(&escape_html(found.as_str()));
        output.push_str("</b>");
        cursor = found.end();
    }
    output.push_str(&escape_html(&sentence[cursor..]));
    Ok(output)
}

fn escape_html(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    for character in value.chars() {
        match character {
            '&' => escaped.push_str("&amp;"),
            '<' => escaped.push_str("&lt;"),
            '>' => escaped.push_str("&gt;"),
            '"' => escaped.push_str("&quot;"),
            '\'' => escaped.push_str("&#39;"),
            _ => escaped.push(character),
        }
    }
    escaped
}

pub(super) fn capture_tag(capture_id: &str) -> String {
    format!("dango_capture_{}", stable_hash(capture_id))
}

pub(super) fn media_filename(approval_id: &str) -> String {
    format!("dango_{}.mp3", stable_hash(approval_id))
}

fn stable_hash(value: &str) -> String {
    format!("{:x}", Sha256::digest(value.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_every_text_and_highlights_the_target() {
        let card = render_card(
            "Use <rock & roll> twice: <rock & roll>.",
            "<rock & roll>",
            "<rock & roll>",
            &[
                "aspas \"duplas\" & simples '".to_owned(),
                "segunda <tradução>".to_owned(),
            ],
            "capture-user-content-must-not-leak",
            "approval-1",
        )
        .unwrap();

        assert_eq!(
            card.front,
            format!(
                "Use <b>&lt;rock &amp; roll&gt;</b> twice: <b>&lt;rock &amp; roll&gt;</b>.<br>[sound:{}]",
                card.media_filename
            )
        );
        assert_eq!(
            card.back,
            "<b>&lt;rock &amp; roll&gt;</b>: aspas &quot;duplas&quot; &amp; simples &#39;, segunda &lt;tradução&gt;"
        );
    }

    #[test]
    fn rejects_a_sentence_without_the_approved_form() {
        let error =
            render_card("Another sentence", "target", "missing", &[], "c", "a").unwrap_err();
        assert_eq!(error.code, "TARGET_FORM_NOT_FOUND");
    }

    #[test]
    fn highlights_the_target_without_changing_its_original_case() {
        let card = render_card(
            "Turn down the offer.",
            "turn down",
            "turn down",
            &["recusar".to_owned()],
            "c",
            "a",
        )
        .unwrap();

        assert!(card.front.starts_with("<b>Turn down</b> the offer."));
        assert_eq!(card.back, "<b>turn down</b>: recusar");
    }

    #[test]
    fn follows_lexical_boundaries_and_normalized_whitespace() {
        let card = render_card(
            "She said he should turn   down the offer.",
            "turn down",
            "turn down",
            &["recusar".to_owned()],
            "c",
            "a",
        )
        .unwrap();

        assert!(card
            .front
            .contains("She said he should <b>turn   down</b> the offer."));
        let short_target = render_card(
            "She said he left.",
            "he",
            "he",
            &["ele".to_owned()],
            "c2",
            "a2",
        )
        .unwrap();
        assert!(short_target.front.starts_with("She said <b>he</b> left."));
        assert!(!short_target.front.starts_with("S<b>he</b>"));
    }

    #[test]
    fn tag_and_filename_are_stable_and_do_not_contain_ids() {
        let tag = capture_tag("private capture");
        let filename = media_filename("private approval");

        assert_eq!(tag, capture_tag("private capture"));
        assert_eq!(filename, media_filename("private approval"));
        assert_ne!(tag, capture_tag("another capture"));
        assert!(!tag.contains("private"));
        assert!(!filename.contains("private"));
        assert!(filename.ends_with(".mp3"));
    }
}
