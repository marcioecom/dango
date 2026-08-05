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
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <label>
        {t("fields.email")}
        <input
          aria-describedby={emailError ? "login-email-error" : undefined}
          aria-invalid={Boolean(emailError)}
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          type="email"
          {...form.register("email")}
        />
        {emailError ? (
          <span className="field-error" id="login-email-error">
            {t(emailError)}
          </span>
        ) : null}
      </label>
      <label>
        {t("fields.password")}
        <input
          aria-describedby={passwordError ? "login-password-error" : undefined}
          aria-invalid={Boolean(passwordError)}
          autoComplete="current-password"
          maxLength={128}
          type="password"
          {...form.register("password")}
        />
        {passwordError ? (
          <span className="field-error" id="login-password-error">
            {t(passwordError)}
          </span>
        ) : null}
      </label>
      {rootError ? (
        <p className="error-message" role="alert">
          {rootError}
        </p>
      ) : null}
      <button className="primary-button" disabled={loginMutation.isPending} type="submit">
        {loginMutation.isPending ? t("login.submitting") : t("login.submit")}
      </button>
    </form>
  );
}
