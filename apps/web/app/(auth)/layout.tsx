import { BrandMark } from "@dango/ui/components/brand-mark";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-svh px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-sm flex-col">
        <header className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
          <BrandMark className="size-9" />
          <span>Dango</span>
        </header>
        <div className="flex flex-1 items-center py-10">{children}</div>
      </div>
    </main>
  );
}
