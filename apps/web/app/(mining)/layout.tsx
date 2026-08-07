import { BrandMark } from "@dango/ui/components/brand-mark";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AccountActions } from "@/modules/auth/ui/components/account-actions";
import { getCurrentSession } from "@/modules/auth/server/current-session";

export default async function MiningLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-svh pb-[max(2rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <header className="border-b border-border px-5">
        <div className="mx-auto flex h-16 w-full max-w-xl items-center justify-between">
          <div className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
            <BrandMark className="size-8" />
            <span>Dango</span>
          </div>
          <AccountActions />
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-5 py-8">{children}</main>
    </div>
  );
}
