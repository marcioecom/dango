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
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <label>
        {t("fields.name")}
        <input
          aria-describedby={errors.name ? "sign-up-name-error" : undefined}
          aria-invalid={Boolean(errors.name)}
          autoComplete="name"
          maxLength={80}
          {...form.register("name")}
        />
        {errors.name?.message ? (
          <span className="field-error" id="sign-up-name-error">
            {t(errors.name.message)}
          </span>
        ) : null}
      </label>
      <label>
        {t("fields.email")}
        <input
          aria-describedby={errors.email ? "sign-up-email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          type="email"
          {...form.register("email")}
        />
        {errors.email?.message ? (
          <span className="field-error" id="sign-up-email-error">
            {t(errors.email.message)}
          </span>
        ) : null}
      </label>
      <label>
        {t("fields.password")}
        <input
          aria-describedby={
            errors.password ? "password-hint sign-up-password-error" : "password-hint"
          }
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
          maxLength={128}
          type="password"
          {...form.register("password")}
        />
        <span className="field-hint" id="password-hint">
          {t("fields.passwordHint")}
        </span>
        {errors.password?.message ? (
          <span className="field-error" id="sign-up-password-error">
            {t(errors.password.message)}
          </span>
        ) : null}
      </label>
      {rootError ? (
        <p className="error-message" role="alert">
          {rootError}
        </p>
      ) : null}
      <button className="primary-button" disabled={signUpMutation.isPending} type="submit">
        {signUpMutation.isPending ? t("signUp.submitting") : t("signUp.submit")}
      </button>
    </form>
  );
}
