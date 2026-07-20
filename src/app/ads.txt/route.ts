export function GET() {
  const publisher = process.env.ADSENSE_PUBLISHER_ID || process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.replace("ca-pub-", "");
  const body = publisher ? `google.com, pub-${publisher}, DIRECT, f08c47fec0942fa0\n` : "# Configure ADSENSE_PUBLISHER_ID para ativar o ads.txt\n";
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
