import type { ComponentProps } from "react";

import { cn } from "@dango/ui/lib/utils";

function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-11 rounded-md border border-input bg-background px-3 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-200 hover:border-foreground/35 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
