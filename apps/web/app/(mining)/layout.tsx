import { BrandMark } from "@dango/ui/components/brand-mark";
import Link from "next/link";
import type { ReactNode } from "react";

import { AccountActions } from "@/modules/auth/ui/components/account-actions";
import { requireAuth } from "@/modules/auth/server/auth-utils";
import { LanguageSwitcher } from "@/modules/auth/ui/components/language-switcher";
import { AppNavigation } from "@/modules/shell/ui/components/app-navigation";

export default async function MiningLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth();

  return (
    <div className="min-h-svh pb-[calc(4rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:pb-0">
      <header className="border-b border-border px-5">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4">
          <Link className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]" href="/inbox">
            <BrandMark className="size-8" />
            <span>Dango</span>
          </Link>
          <AppNavigation />
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <AccountActions email={session.user.email} name={session.user.name} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-5 py-8">{children}</main>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <AppNavigation mobile />
      </div>
    </div>
  );
}
