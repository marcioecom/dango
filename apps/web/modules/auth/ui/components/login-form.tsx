"use client";

import { Button } from "@dango/ui/components/button";
import { Input } from "@dango/ui/components/input";
import { Label } from "@dango/ui/components/label";
import { useTranslation } from "react-i18next";

import { useLoginForm } from "../../hooks/use-login-form";

export function LoginForm() {
  const { t } = useTranslation();
  const { form, onSubmit } = useLoginForm();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = form;

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </div>
      {errors.root ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {errors.root.message}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}
