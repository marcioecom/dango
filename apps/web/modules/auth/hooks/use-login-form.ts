"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function useLoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await authClient.signIn.email(values);
      if (result.error) {
        form.setError("root", { message: t("invalidCredentials") });
        return;
      }
      queryClient.clear();
      router.replace("/inbox");
      router.refresh();
    } catch {
      form.setError("root", { message: t("invalidCredentials") });
    }
  }

  return { form, onSubmit };
}
