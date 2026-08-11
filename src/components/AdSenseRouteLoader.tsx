"use client";

import { usePathname } from "next/navigation";
import { AdSenseLoader } from "@/components/AdSenseLoader";

export function AdSenseRouteLoader({ client }: { client?: string }) {
  const pathname = usePathname();
  // O editor e os workspaces possuem muitos botões de ação/download.
  // Não carregamos Auto Ads nessas rotas para evitar anúncios colados a controles
  // e reduzir risco de clique acidental. Conteúdo/editorial continua monetizável.
  const interactiveWorkspace = pathname.startsWith("/ferramentas/");
  if (interactiveWorkspace) return null;
  return <AdSenseLoader client={client} />;
}
