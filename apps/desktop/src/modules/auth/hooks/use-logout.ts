import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authClient, setAuthToken } from "../../../lib/auth-client";
import { deleteSessionToken } from "../keychain";
import { authRequest, responseError } from "../session";
import { authQueryKeys } from "./query-keys";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await authRequest(() => authClient.signOut());
      if (error) throw responseError(error, "errors.logout");

      await deleteSessionToken();
      setAuthToken(null);
    },
    onSuccess() {
      queryClient.setQueryData(authQueryKeys.session, null);
      queryClient.removeQueries({ queryKey: authQueryKeys.all, type: "inactive" });
    },
  });
}
