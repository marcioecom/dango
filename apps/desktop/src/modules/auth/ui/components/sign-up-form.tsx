import { Button } from "@dango/ui/components/button";
import { Input } from "@dango/ui/components/input";
import { Label } from "@dango/ui/components/label";
import { useTranslation } from "react-i18next";

import { useSignUpForm } from "../../hooks/use-sign-up-form";
import { errorKey } from "../../session";

export function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const { form, onSubmit, signUpMutation } = useSignUpForm(onSuccess);
  const errors = form.formState.errors;
  const rootError = signUpMutation.error
    ? t(errorKey(signUpMutation.error, "errors.signUp"))
    : null;

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="sign-up-name">{t("fields.name")}</Label>
        <Input
          id="sign-up-name"
          aria-describedby={errors.name ? "sign-up-name-error" : undefined}
          aria-invalid={Boolean(errors.name)}
          autoComplete="name"
          maxLength={80}
          {...form.register("name")}
        />
        {errors.name?.message ? (
          <span className="text-xs font-medium text-destructive" id="sign-up-name-error">
            {t(errors.name.message)}
          </span>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sign-up-email">{t("fields.email")}</Label>
        <Input
          id="sign-up-email"
          aria-describedby={errors.email ? "sign-up-email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          type="email"
          {...form.register("email")}
        />
        {errors.email?.message ? (
          <span className="text-xs font-medium text-destructive" id="sign-up-email-error">
            {t(errors.email.message)}
          </span>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sign-up-password">{t("fields.password")}</Label>
        <Input
          id="sign-up-password"
          aria-describedby={
            errors.password ? "password-hint sign-up-password-error" : "password-hint"
          }
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
          maxLength={128}
          type="password"
          {...form.register("password")}
        />
        <span className="text-xs text-muted-foreground" id="password-hint">
          {t("fields.passwordHint")}
        </span>
        {errors.password?.message ? (
          <span className="text-xs font-medium text-destructive" id="sign-up-password-error">
            {t(errors.password.message)}
          </span>
        ) : null}
      </div>
      {rootError ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm leading-6 text-destructive" role="alert">
          {rootError}
        </p>
      ) : null}
      <Button disabled={signUpMutation.isPending} type="submit">
        {signUpMutation.isPending ? t("signUp.submitting") : t("signUp.submit")}
      </Button>
    </form>
  );
}
