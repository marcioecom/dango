import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authBaseUrl, authClient } from "../../../lib/auth-client";
import { authRequest, responseError } from "../session";

const signUpSchema = z.object({
  email: z.email("validation.email"),
  name: z.string().trim().min(1, "validation.name").max(80),
  password: z.string().min(8, "validation.passwordLength").max(128),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function useSignUpForm(onSuccess: () => void) {
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", name: "", password: "" },
  });

  const signUpMutation = useMutation({
    mutationFn: async (values: SignUpFormValues) => {
      const { error } = await authRequest(() =>
        authClient.signUp.email({
          ...values,
          callbackURL: `${authBaseUrl}/email-verified`,
        }),
      );
      if (error) throw responseError(error, "errors.signUp");
    },
    onSuccess,
  });

  async function onSubmit(values: SignUpFormValues) {
    signUpMutation.reset();
    try {
      await signUpMutation.mutateAsync(values);
    } catch {
      // The view renders the mutation error in its accessible alert.
    }
  }

  return { form, onSubmit, signUpMutation };
}
