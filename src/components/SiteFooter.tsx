import Link from "next/link";
import { PrivacyPreferencesButton } from "@/components/ConsentBanner";

export function SiteFooter() {
  return (
    <footer className="site-footer minimal-site-footer">
      <span>© {new Date().getFullYear()} LIM PDF · LIM PDF pertence ao LIM Group.</span>
      <nav aria-label="Políticas do LIM PDF">
        <Link href="/privacidade">Privacidade</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/termos">Termos</Link>
        <PrivacyPreferencesButton />
      </nav>
    </footer>
  );
}
