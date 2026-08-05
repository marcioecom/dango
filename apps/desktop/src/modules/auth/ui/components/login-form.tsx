import { Button } from "@dango/ui/components/button";
import { Input } from "@dango/ui/components/input";
import { Label } from "@dango/ui/components/label";
import { useTranslation } from "react-i18next";

import { useLoginForm } from "../../hooks/use-login-form";
import { errorKey } from "../../session";

export function LoginForm() {
  const { t } = useTranslation();
  const { form, loginMutation, onSubmit } = useLoginForm();
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;
  const rootError = loginMutation.error ? t(errorKey(loginMutation.error)) : null;

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="login-email">{t("fields.email")}</Label>
        <Input
          id="login-email"
          aria-describedby={emailError ? "login-email-error" : undefined}
          aria-invalid={Boolean(emailError)}
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          type="email"
          {...form.register("email")}
        />
        {emailError ? (
          <span className="text-xs font-medium text-destructive" id="login-email-error">
            {t(emailError)}
          </span>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="login-password">{t("fields.password")}</Label>
        <Input
          id="login-password"
          aria-describedby={passwordError ? "login-password-error" : undefined}
          aria-invalid={Boolean(passwordError)}
          autoComplete="current-password"
          maxLength={128}
          type="password"
          {...form.register("password")}
        />
        {passwordError ? (
          <span className="text-xs font-medium text-destructive" id="login-password-error">
            {t(passwordError)}
          </span>
        ) : null}
      </div>
      {rootError ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm leading-6 text-destructive" role="alert">
          {rootError}
        </p>
      ) : null}
      <Button disabled={loginMutation.isPending} type="submit">
        {loginMutation.isPending ? t("login.submitting") : t("login.submit")}
      </Button>
    </form>
  );
}
