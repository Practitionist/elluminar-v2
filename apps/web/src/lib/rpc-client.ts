import { hc } from "hono/client";
import type { AppType } from "@/server/app";

export type { AppType };

export function createElluminarApiClient(baseUrl = "") {
  return hc<AppType>(baseUrl);
}
