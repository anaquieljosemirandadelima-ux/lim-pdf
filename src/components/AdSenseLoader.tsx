import { ADSENSE_SCRIPT_SRC } from "@/lib/adsense";

export function AdSenseLoader({ client }: { client?: string }) {
  if (!client) return null;

  return (
    <script
      id="limpdf-adsense"
      async
      src={ADSENSE_SCRIPT_SRC}
      crossOrigin="anonymous"
    />
  );
}
