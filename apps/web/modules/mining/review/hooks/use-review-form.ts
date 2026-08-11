"use client";

import { sentenceContainsTarget, type ApprovalSource } from "@dango/domain";
import { useState } from "react";

import type { ReviewCapture, ReviewOption } from "../types";
import { useApproveCapture } from "./use-approve-capture";

// TODO: maybe use react-hook-form
export function useReviewForm(capture: ReviewCapture) {
  const generation = capture.generation;
  const isSentence = capture.kind === "sentence";
  const hasOriginalContext =
    capture.kind === "term" &&
    Boolean(
      capture.originalSentence &&
      sentenceContainsTarget(capture.originalSentence, capture.text),
    );
  const options: ReviewOption[] = [
    ...(isSentence
      ? [
          {
            generatedPosition: null,
            key: "original",
            sentence: capture.text,
            source: "original" as const,
            targetForm: capture.text,
            translation: generation.sentenceTranslationPtBr ?? null,
          },
        ]
      : hasOriginalContext && capture.originalSentence
        ? [
            {
              generatedPosition: null,
              key: "original",
              sentence: capture.originalSentence,
              source: "original" as const,
              targetForm: capture.text,
              translation: generation.originalSentenceTranslationPtBr ?? null,
            },
          ]
        : []),
    ...generation.examples.map((example, index) => ({
      generatedPosition: index + 1,
      key: `generated-${index}`,
      sentence: example.sentenceEn,
      source: "generated" as const,
      targetForm: example.targetForm,
      translation: example.translationPtBr,
    })),
  ];
  const initialOption = isSentence ? options[0] : undefined;
  const [selectedKey, setSelectedKey] = useState(initialOption?.key ?? "");
  const [sentence, setSentence] = useState(initialOption?.sentence ?? "");
  const [baseSelection, setBaseSelection] = useState<{
    sentence: string;
    source: ApprovalSource;
    targetForm: string;
  }>({
    sentence: initialOption?.sentence ?? "",
    source: initialOption?.source ?? "generated",
    targetForm: initialOption?.targetForm ?? capture.text,
  });
  const [showTranslations, setShowTranslations] = useState(false);
  const [showContexts, setShowContexts] = useState(!isSentence);
  const approval = useApproveCapture(capture.id);

  function choose(option: ReviewOption) {
    setSelectedKey(option.key);
    setSentence(option.sentence);
    setBaseSelection({
      sentence: option.sentence,
      source: option.source,
      targetForm: option.targetForm,
    });
  }

  function approve() {
    approval.mutate({
      generationId: generation.id,
      sentence,
      source:
        sentence === baseSelection.sentence ? baseSelection.source : "edited",
      targetForm: baseSelection.targetForm,
    });
  }

  return {
    approval,
    approve,
    choose,
    generation,
    isSentence,
    options,
    selectedKey,
    sentence,
    setSentence,
    showContexts,
    showTranslations,
    toggleContexts: () => setShowContexts((value) => !value),
    toggleTranslations: () => setShowTranslations((value) => !value),
  };
}
