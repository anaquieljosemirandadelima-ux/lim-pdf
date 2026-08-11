"use client";

import { usePathname } from "next/navigation";
import { AdSenseLoader } from "@/components/AdSenseLoader";

export function AdSenseRouteLoader({ client }: { client?: string }) {
  const pathname = usePathname();
  const interactiveWorkspace = pathname.startsWith("/ferramentas/");
  if (interactiveWorkspace) return null;
  return <AdSenseLoader client={client} />;
}
