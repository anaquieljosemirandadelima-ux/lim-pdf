import { MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";

/**
 * Os nomes de plano abaixo permanecem por compatibilidade com versões antigas.
 * O produto público do LIM PDF é gratuito: todos os planos legados apontam
 * para a mesma política local e não existem bloqueios de pagamento.
 */
export type ProductPlan = "free" | "premium" | "professional" | "team" | "enterprise";
export type PremiumCapability =
  | "local-processing"
  | "large-files"
  | "batch-processing"
  | "ocr-batch"
  | "pdf-comparison"
  | "permanent-redaction"
  | "pdf-a-compliance"
  | "security-report"
  | "pades-signatures"
  | "shared-presets"
  | "team-workspaces"
  | "cloud-storage"
  | "sso-and-audit";

type PlanEntitlements = {
  label: string;
  description: string;
  maxFileBytes: number;
  maxBatchFiles: number;
  maxLocalHistoryItems: number;
  capabilities: readonly PremiumCapability[];
  ads: "shown" | "not-shown";
};

const FREE_CAPABILITIES: readonly PremiumCapability[] = [
  "local-processing",
  "large-files",
  "batch-processing",
  "ocr-batch",
  "pdf-comparison",
  "permanent-redaction",
  "pdf-a-compliance",
  "security-report",
  "pades-signatures",
];

const FREE_ENTITLEMENTS: PlanEntitlements = {
  label: "Gratuito",
  description: "Todas as ferramentas publicadas, com processamento local e sem paywall.",
  maxFileBytes: Math.max(MAX_LOCAL_PDF_BYTES, 500 * 1024 * 1024),
  maxBatchFiles: 20,
  maxLocalHistoryItems: 12,
  capabilities: FREE_CAPABILITIES,
  ads: "shown",
};

export const PLAN_ENTITLEMENTS: Record<ProductPlan, PlanEntitlements> = {
  free: FREE_ENTITLEMENTS,
  premium: FREE_ENTITLEMENTS,
  professional: FREE_ENTITLEMENTS,
  team: FREE_ENTITLEMENTS,
  enterprise: FREE_ENTITLEMENTS,
};

export const PREMIUM_CAPABILITY_LABELS: Record<PremiumCapability, string> = {
  "local-processing": "Processamento local",
  "large-files": "Arquivos de até 500 MB",
  "batch-processing": "Processamento em lote",
  "ocr-batch": "OCR em lote",
  "pdf-comparison": "Comparação de PDFs",
  "permanent-redaction": "Redação permanente",
  "pdf-a-compliance": "Preparação PDF/A",
  "security-report": "Relatórios de segurança",
  "pades-signatures": "Assinaturas PAdES",
  "shared-presets": "Presets locais",
  "team-workspaces": "Espaços de equipe locais",
  "cloud-storage": "Armazenamento em nuvem opcional",
  "sso-and-audit": "SSO e auditoria externa",
};

export function planHasCapability(plan: ProductPlan, capability: PremiumCapability) {
  return PLAN_ENTITLEMENTS[plan].capabilities.includes(capability);
}

export function getPlanEntitlements(plan: ProductPlan) {
  void plan;
  return FREE_ENTITLEMENTS;
}
