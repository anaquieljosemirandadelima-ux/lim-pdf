export function GET() {
  const email = process.env.SECURITY_CONTACT_EMAIL;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://lim-pdf-preview.vercel.app";
  const lines = [email ? `Contact: mailto:${email}` : `Contact: ${site}/contato`, `Policy: ${site}/seguranca`, `Preferred-Languages: pt-BR, en`, `Canonical: ${site}/.well-known/security.txt`, `Expires: 2027-07-18T00:00:00.000Z`];
  return new Response(`${lines.join("\n")}\n`, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" } });
}
