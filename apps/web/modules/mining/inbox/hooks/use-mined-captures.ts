"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { listMinedCaptures, type MinedCapturesPage } from "@/modules/mining/shared/hooks/api";
import { miningQueryKeys } from "@/modules/mining/shared/hooks/query-keys";

export function useMinedCaptures() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useInfiniteQuery({
    getNextPageParam: (last: MinedCapturesPage) => last.nextCursor,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      listMinedCaptures({
        cursor: pageParam,
        search: debouncedSearch || undefined,
        status: status || undefined,
      }),
    queryKey: miningQueryKeys.minedCaptures({ search: debouncedSearch, status }),
  });

  const items = query.data?.pages.flatMap((page) => page.captures) ?? [];

  return { items, query, search, setSearch, setStatus, status };
}
