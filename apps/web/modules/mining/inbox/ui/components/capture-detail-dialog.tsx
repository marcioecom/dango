"use client";

import type { Capture } from "@dango/domain";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useTranslation } from "react-i18next";

const approvedStatuses: Record<string, true> = {
  approved: true,
  pending_anki: true,
  sent_to_anki: true,
};

export function CaptureDetailDialog({
  capture,
  onClose,
}: {
  capture: Capture;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const generation =
    capture.generation && capture.generation.status === "succeeded"
      ? capture.generation
      : null;
  const showApprovedSentence =
    capture.approval !== null && approvedStatuses[capture.status] === true;

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-border bg-background p-6 text-foreground shadow-lg outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold tracking-[-0.03em] break-words">
              {capture.text}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("detailClose")}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>

          {showApprovedSentence ? (
            <div className="mt-6">
              <h2 className="text-sm font-semibold">{t("detailApprovedSentence")}</h2>
              <div className="mt-2 border border-primary/30 bg-primary/10 px-5 py-5">
                <p className="text-base leading-7 text-foreground">
                  {capture.approval?.sentence}
                </p>
              </div>
            </div>
          ) : null}

          {generation ? (
            <>
              {capture.originalSentence ? (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold">{t("detailOriginalSentence")}</h2>
                  <p className="mt-2 text-base leading-7 text-foreground">
                    {capture.originalSentence}
                  </p>
                  {generation.originalSentenceTranslationPtBr ? (
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {generation.originalSentenceTranslationPtBr}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 border border-primary/30 bg-primary/10 px-5 py-5">
                <p className="text-base leading-7 text-foreground">{generation.explanationPtBr}</p>
                {capture.kind === "sentence" ? (
                  generation.sentenceTranslationPtBr ? (
                    <p className="mt-4 text-sm font-semibold text-primary">
                      {generation.sentenceTranslationPtBr}
                    </p>
                  ) : null
                ) : generation.translationsPtBr.length > 0 ? (
                  <p className="mt-4 text-sm font-semibold text-primary">
                    {generation.translationsPtBr.map((translation) => translation.text).join(", ")}
                  </p>
                ) : null}
                {generation.ambiguityNotePtBr ? (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {generation.ambiguityNotePtBr}
                  </p>
                ) : null}
              </div>

              {generation.examples.length > 0 ? (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold">{t("detailExamples")}</h2>
                  <ul className="mt-2 divide-y divide-border border-y border-border">
                    {generation.examples.map((example) => (
                      <li className="py-3" key={example.sentenceEn}>
                        <p className="text-sm leading-6 text-foreground">
                          {example.sentenceEn}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {example.translationPtBr}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-6 text-sm leading-6 text-muted-foreground">
              {t("detailNoGeneration")}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
