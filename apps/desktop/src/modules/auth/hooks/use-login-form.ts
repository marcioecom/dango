import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authClient, setAuthToken } from "../../../lib/auth-client";
import { deleteSessionToken, saveSessionToken } from "../keychain";
import { authRequest, getAuthenticatedUser, signInResponseError } from "../session";
import { AuthenticationError } from "../types";
import { authQueryKeys } from "./query-keys";

const loginSchema = z.object({
  email: z.email("validation.email"),
  password: z.string().min(1, "validation.password"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function useLoginForm() {
  const queryClient = useQueryClient();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      let nextToken: string | null = null;
      const { error } = await authRequest(() =>
        authClient.signIn.email(values, {
          onSuccess(context) {
            nextToken = context.response.headers.get("set-auth-token");
          },
        }),
      );

      if (error) throw signInResponseError(error);
      if (!nextToken) throw new AuthenticationError("errors.missingToken");

      setAuthToken(nextToken);
      try {
        const user = await getAuthenticatedUser();
        if (!user) throw new AuthenticationError("errors.invalidSession");

        try {
          await saveSessionToken(nextToken);
        } catch {
          throw new AuthenticationError("errors.keychain");
        }
        return user;
      } catch (sessionError) {
        try {
          const { error } = await authRequest(() => authClient.signOut());
          if (error) throw error;
        } catch {
          // This login never became active. Cleanup stays best effort and must not mask its error.
        }
        try {
          await deleteSessionToken();
        } catch {
          // The failed session must not remain active when local cleanup also fails.
        }
        setAuthToken(null);
        throw sessionError;
      }
    },
    onSuccess(user) {
      queryClient.setQueryData(authQueryKeys.session, user);
    },
  });

  async function onSubmit(values: LoginFormValues) {
    loginMutation.reset();
    try {
      await loginMutation.mutateAsync(values);
    } catch {
      // The view renders the mutation error in its accessible alert.
    }
  }

  return { form, loginMutation, onSubmit };
}
