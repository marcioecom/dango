import { queryOptions } from "@tanstack/react-query";

import { listCaptures } from "./api";
import { miningQueryKeys } from "./query-keys";

export const capturesQuery = queryOptions({
  queryKey: miningQueryKeys.captures,
  queryFn: listCaptures,
  refetchInterval: (query) =>
    query.state.data?.captures.some((capture) => capture.status === "generating") ? 2_000 : false,
});
