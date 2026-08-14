"use client";

import type { Capture } from "@dango/domain";
import { Skeleton } from "@dango/ui/components/skeleton";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function ReviewGeneratingState({ capture }: { capture: Capture }) {
  const { t } = useTranslation();
  const elapsedSeconds = useElapsedSeconds(capture.updatedAt);

  return (
    <section className="mt-10" aria-labelledby="generating-title">
      <h1 id="generating-title" className="text-2xl font-semibold tracking-[-0.03em]">
        {capture.text}
      </h1>
      <p className="mt-4 flex items-center gap-2 text-sm font-medium" role="status">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-primary motion-safe:animate-pulse"
        />
        {t("generating")}
        <span className="text-muted-foreground">
          {t("generatingElapsed", { seconds: elapsedSeconds })}
        </span>
      </p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {t("generatingHint")}
      </p>

      <div aria-hidden="true" className="mt-8 border border-primary/20 bg-primary/5 px-5 py-5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-4 h-3 w-2/3" />
      </div>
      <div aria-hidden="true" className="mt-6 divide-y divide-border border-y border-border">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="flex items-center gap-3 py-4" key={index}>
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4" style={{ width: `${88 - index * 9}%` }} />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function useElapsedSeconds(since: string) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const startedAt = new Date(since).getTime();
    const tick = () =>
      setSeconds(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [since]);
  return seconds;
}
