"use client";

import { AdSenseLoader } from "@/components/AdSenseLoader";

export function AdSenseRouteLoader({ client }: { client?: string }) {
  return <AdSenseLoader client={client} />;
}
