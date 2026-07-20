import { ADSENSE_PUBLISHER_ID } from "@/lib/adsense";

export function GET() {
  const body = `google.com, pub-${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
