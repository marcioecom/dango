import { useQuery } from "@tanstack/react-query";

import { setAuthToken } from "../../../lib/auth-client";
import { getAuthenticatedUser } from "../session";
import { deleteSessionToken, loadSessionToken } from "../keychain";
import { authQueryKeys } from "./query-keys";

export function useAuthSession() {
  return useQuery({
    queryKey: authQueryKeys.session,
    queryFn: async () => {
      const token = await loadSessionToken();
      if (!token) {
        setAuthToken(null);
        return null;
      }

      setAuthToken(token);
      const user = await getAuthenticatedUser();
      if (user) return user;

      await deleteSessionToken();
      setAuthToken(null);
      return null;
    },
    retry: false,
  });
}
