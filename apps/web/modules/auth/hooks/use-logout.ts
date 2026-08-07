"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    setSignOutError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setIsSigningOut(false);
        setSignOutError(true);
        return;
      }
      queryClient.clear();
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setIsSigningOut(false);
      setSignOutError(true);
    }
  }

  return { isSigningOut, signOut, signOutError };
}
