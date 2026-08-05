import type { ComponentProps } from "react";

import { cn } from "@dango/ui/lib/utils";

function BrandMark({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={cn("size-9 shrink-0", className)}
      {...props}
    >
      <path
        d="M2.5 37.5 37.5 2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <circle cx="12" cy="26" r="7" fill="var(--brand-azuki)" />
      <circle cx="20" cy="19" r="7" fill="var(--primary)" />
      <circle cx="28" cy="12" r="7" fill="var(--brand-yomogi-soft)" />
    </svg>
  );
}

export { BrandMark };
