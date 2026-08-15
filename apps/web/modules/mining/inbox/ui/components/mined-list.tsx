"use client";

import type { Capture } from "@dango/domain";
import { Button } from "@dango/ui/components/button";
import { Input } from "@dango/ui/components/input";
import { NativeSelect } from "@dango/ui/components/native-select";
import { Skeleton } from "@dango/ui/components/skeleton";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useMinedCaptures } from "../../hooks/use-mined-captures";
import { CaptureDetailDialog } from "./capture-detail-dialog";
import { CaptureListItem } from "./capture-list-item";

export function MinedList() {
  const { t } = useTranslation();
  const { items, query, search, setSearch, setStatus, status } = useMinedCaptures();
  const [detailCapture, setDetailCapture] = useState<Capture | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const hasActiveFilters = search.trim() !== "" || status !== "";

  return (
    <section aria-labelledby="mined-list-title">
      <h1 id="mined-list-title" className="text-2xl font-semibold tracking-[-0.03em]">
        {t("minedTitle")}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("minedHint")}</p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label={t("minedSearchLabel")}
          placeholder={t("minedSearchPlaceholder")}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <NativeSelect
          aria-label={t("minedFilterLabel")}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">{t("minedFilterAll")}</option>
          <option value="approved">{t("readyForAnki")}</option>
          <option value="pending_anki">{t("statusPendingAnki")}</option>
          <option value="sent_to_anki">{t("statusSentToAnki")}</option>
        </NativeSelect>
      </div>

      {query.isLoading && !query.data ? (
        <div className="mt-6 space-y-3" aria-label={t("minedTitle")}>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {query.isError ? (
        <div className="mt-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          <p>{query.error.message}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => query.refetch()}>
            {t("tryAgain")}
          </Button>
        </div>
      ) : null}

      {items.length === 0 && query.data ? (
        <div className="mt-6 border-y border-border py-8">
          {hasActiveFilters ? (
            <p className="text-sm text-muted-foreground">{t("minedEmptySearch")}</p>
          ) : (
            <>
              <p className="font-medium">{t("minedEmptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("minedEmptyDescription")}</p>
            </>
          )}
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="mt-6 divide-y divide-border border-y border-border">
            {items.map((capture) => (
              <CaptureListItem
                capture={capture}
                checked={false}
                key={capture.id}
                onCheckedChange={() => {}}
                onOpenDetails={() => setDetailCapture(capture)}
                selectable={false}
              />
            ))}
          </div>
          {isFetchingNextPage ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : null}
          {!hasNextPage ? (
            <p className="mt-4 text-center text-xs text-muted-foreground">{t("minedLoadEnd")}</p>
          ) : null}
          <div aria-hidden="true" className="h-1" ref={sentinelRef} />
        </>
      ) : null}

      {detailCapture ? (
        <CaptureDetailDialog capture={detailCapture} onClose={() => setDetailCapture(null)} />
      ) : null}
    </section>
  );
}
