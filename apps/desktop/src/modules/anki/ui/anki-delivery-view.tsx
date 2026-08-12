import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@dango/ui/components/button";
import { Label } from "@dango/ui/components/label";
import { NativeSelect } from "@dango/ui/components/native-select";
import type { TFunction } from "i18next";
import { useEffect } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useAnkiDelivery } from "../hooks/use-anki-delivery";
import {
  AnkiCommandError,
  ankiProfileSchema,
  type AnkiDelivery,
  type AnkiProfile,
} from "../types";

const DEFAULT_DECK = "English::Mining";
const DEFAULT_MODEL = "Basic";
const DEFAULT_FRONT_FIELD = "Front";
const DEFAULT_BACK_FIELD = "Back";

export function AnkiDeliveryView({ accountId }: { accountId: string }) {
  const { t } = useTranslation();
  const anki = useAnkiDelivery(accountId);
  const form = useForm<AnkiProfile>({
    defaultValues: emptyProfile(accountId),
    resolver: zodResolver(ankiProfileSchema),
  });
  const selectedModelName = useWatch({ control: form.control, name: "modelName" });
  const selectedModel = anki.catalog.data?.models.find(
    (model) => model.name === selectedModelName,
  );

  useEffect(() => {
    if (form.formState.isDirty || !anki.catalog.data) return;
    if (anki.profile.data) {
      form.reset(anki.profile.data);
      return;
    }

    const modelName = anki.catalog.data.models.some((model) => model.name === DEFAULT_MODEL)
      ? DEFAULT_MODEL
      : "";
    const fields = anki.catalog.data.models.find((model) => model.name === modelName)?.fields ?? [];
    form.reset({
      accountId,
      backField: fields.includes(DEFAULT_BACK_FIELD) ? DEFAULT_BACK_FIELD : "",
      deckName: anki.catalog.data.decks.includes(DEFAULT_DECK) ? DEFAULT_DECK : "",
      frontField: fields.includes(DEFAULT_FRONT_FIELD) ? DEFAULT_FRONT_FIELD : "",
      modelName,
    });
  }, [accountId, anki.catalog.data, anki.profile.data, form]);

  useEffect(() => {
    const fields = selectedModel?.fields ?? [];
    if (!fields.includes(form.getValues("frontField"))) {
      form.setValue(
        "frontField",
        fields.includes(DEFAULT_FRONT_FIELD) ? DEFAULT_FRONT_FIELD : "",
        { shouldDirty: true },
      );
    }
    if (!fields.includes(form.getValues("backField"))) {
      form.setValue(
        "backField",
        fields.includes(DEFAULT_BACK_FIELD) ? DEFAULT_BACK_FIELD : "",
        { shouldDirty: true },
      );
    }
  }, [form, selectedModel]);

  async function submit(profile: AnkiProfile) {
    const saved = await anki.saveProfile.mutateAsync(profile);
    form.reset(saved);
  }

  const items = anki.deliveries.data ?? [];
  const sentCount = items.filter((item) => item.status === "sent").length;
  const failedCount = items.filter(isFailed).length;
  const pendingCount = items.length - sentCount - failedCount;
  const latestFailure = items.slice().reverse().find(isFailed);

  return (
    <section className="mt-9 border-y border-border" aria-labelledby="anki-title">
      <header className="flex flex-wrap items-start justify-between gap-4 py-5">
        <div>
          <h3 id="anki-title" className="text-lg font-semibold tracking-[-0.02em] text-balance">
            {t("anki.title")}
          </h3>
          <p className="mt-1 max-w-[62ch] text-sm leading-6 text-muted-foreground text-pretty">
            {t("anki.description")}
          </p>
        </div>
        <ConnectionStatus connected={anki.status.data?.connected === true} pending={anki.status.isPending} />
      </header>

      <div className="grid gap-7 border-t border-border py-6 md:grid-cols-[minmax(0,1fr)_14rem]">
        <form className="space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              disabled={!anki.catalog.data}
              error={form.formState.errors.deckName?.message}
              id="anki-deck"
              label={t("anki.deck")}
              options={anki.catalog.data?.decks ?? []}
              register={form.register("deckName")}
              placeholder={t("anki.selectDeck")}
            />
            <SelectField
              disabled={!anki.catalog.data}
              error={form.formState.errors.modelName?.message}
              id="anki-model"
              label={t("anki.noteType")}
              options={anki.catalog.data?.models.map((model) => model.name) ?? []}
              register={form.register("modelName")}
              placeholder={t("anki.selectNoteType")}
            />
            <SelectField
              disabled={!selectedModel}
              error={form.formState.errors.frontField?.message}
              id="anki-front"
              label={t("anki.frontField")}
              options={selectedModel?.fields ?? []}
              register={form.register("frontField")}
              placeholder={t("anki.selectField")}
            />
            <SelectField
              disabled={!selectedModel}
              error={form.formState.errors.backField?.message}
              id="anki-back"
              label={t("anki.backField")}
              options={selectedModel?.fields ?? []}
              register={form.register("backField")}
              placeholder={t("anki.selectField")}
            />
          </div>

          {anki.saveProfile.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {profileErrorMessage(anki.saveProfile.error, t)}
            </p>
          ) : null}
          {!anki.status.isPending && !anki.status.data?.connected ? (
            <p className="text-sm leading-6 text-muted-foreground">{t("anki.openAnkiHint")}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={!anki.catalog.data || anki.saveProfile.isPending}
              size="sm"
              type="submit"
            >
              {anki.saveProfile.isPending ? t("anki.saving") : t("anki.saveProfile")}
            </Button>
            <Button
              disabled={anki.sync.isPending}
              onClick={() => anki.sync.mutate()}
              size="sm"
              type="button"
              variant="outline"
            >
              {anki.sync.isPending ? t("anki.syncing") : t("anki.syncNow")}
            </Button>
          </div>
        </form>

        <div className="border-t border-border pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">
          <h4 className="text-sm font-semibold">{t("anki.deliveries")}</h4>
          <dl className="mt-3 space-y-2 text-sm">
            <SummaryRow label={t("anki.pending")} value={pendingCount} />
            <SummaryRow label={t("anki.failed")} value={failedCount} />
            <SummaryRow label={t("anki.sent")} value={sentCount} />
          </dl>
          {latestFailure ? (
            <p className="mt-4 text-sm leading-6 text-destructive" role="alert">
              {deliveryErrorMessage(latestFailure, t)}
            </p>
          ) : null}
          {anki.sync.isError && !latestFailure ? (
            <p className="mt-4 text-sm leading-6 text-destructive" role="alert">
              {t("anki.errors.sync")}
            </p>
          ) : null}
          {items.length === 0 && !anki.deliveries.isPending ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("anki.empty")}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ConnectionStatus({ connected, pending }: { connected: boolean; pending: boolean }) {
  const { t } = useTranslation();
  const label = pending ? t("anki.checking") : connected ? t("anki.connected") : t("anki.unavailable");
  return (
    <span
      className={
        connected
          ? "rounded-full bg-success/12 px-3 py-1.5 text-xs font-semibold text-success"
          : "rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground"
      }
      role="status"
    >
      {label}
    </span>
  );
}

function SelectField({
  disabled,
  error,
  id,
  label,
  options,
  placeholder,
  register,
}: {
  disabled: boolean;
  error?: string;
  id: string;
  label: string;
  options: string[];
  placeholder: string;
  register: UseFormRegisterReturn;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        aria-invalid={Boolean(error)}
        className="w-full"
        disabled={disabled}
        id={id}
        {...register}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function emptyProfile(accountId: string): AnkiProfile {
  return { accountId, backField: "", deckName: "", frontField: "", modelName: "" };
}

function isFailed(delivery: AnkiDelivery) {
  return delivery.status === "audio_failed" || delivery.status === "anki_failed";
}

function profileErrorMessage(error: Error, t: TFunction) {
  if (!(error instanceof AnkiCommandError)) return t("anki.errors.profile");
  if (error.code === "PROFILE_FIELDS_MUST_DIFFER") return t("anki.errors.fieldsMustDiffer");
  if (error.code.startsWith("PROFILE_")) return t("anki.errors.profileChanged");
  return t("anki.errors.profile");
}

function deliveryErrorMessage(delivery: AnkiDelivery, t: TFunction) {
  if (delivery.status === "audio_failed") return t("anki.errors.audio");
  if (delivery.errorCode === "ANKI_UNAVAILABLE") return t("anki.errors.unavailable");
  if (delivery.errorCode?.startsWith("PROFILE_")) return t("anki.errors.profileChanged");
  return t("anki.errors.delivery");
}
