import { MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";

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

const MB = 1024 * 1024;

export const PLAN_ENTITLEMENTS: Record<ProductPlan, PlanEntitlements> = {
  free: {
    label: "Gratuito",
    description: "Ferramentas essenciais para uso ocasional, com processamento local.",
    maxFileBytes: MAX_LOCAL_PDF_BYTES,
    maxBatchFiles: 20,
    maxLocalHistoryItems: 12,
    capabilities: ["local-processing", "large-files"],
    ads: "shown",
  },
  premium: {
    label: "Premium",
    description: "Automação e produtividade para quem trabalha com PDFs com frequência.",
    maxFileBytes: 500 * MB,
    maxBatchFiles: 100,
    maxLocalHistoryItems: 50,
    capabilities: ["local-processing", "large-files", "batch-processing", "ocr-batch", "pdf-comparison", "permanent-redaction", "security-report"],
    ads: "not-shown",
  },
  professional: {
    label: "Profissional",
    description: "Conformidade, assinatura e ferramentas para escritórios e documentos críticos.",
    maxFileBytes: 500 * MB,
    maxBatchFiles: 250,
    maxLocalHistoryItems: 100,
    capabilities: ["local-processing", "large-files", "batch-processing", "ocr-batch", "pdf-comparison", "permanent-redaction", "pdf-a-compliance", "security-report", "pades-signatures"],
    ads: "not-shown",
  },
  team: {
    label: "Equipe",
    description: "Presets e fluxos compartilhados para pequenas equipes.",
    maxFileBytes: 500 * MB,
    maxBatchFiles: 500,
    maxLocalHistoryItems: 200,
    capabilities: ["local-processing", "large-files", "batch-processing", "ocr-batch", "pdf-comparison", "permanent-redaction", "pdf-a-compliance", "security-report", "pades-signatures", "shared-presets", "team-workspaces"],
    ads: "not-shown",
  },
  enterprise: {
    label: "Enterprise",
    description: "Governança, identidade e implantação conforme a política da organização.",
    maxFileBytes: 500 * MB,
    maxBatchFiles: 1000,
    maxLocalHistoryItems: 500,
    capabilities: ["local-processing", "large-files", "batch-processing", "ocr-batch", "pdf-comparison", "permanent-redaction", "pdf-a-compliance", "security-report", "pades-signatures", "shared-presets", "team-workspaces", "cloud-storage", "sso-and-audit"],
    ads: "not-shown",
  },
};

export const PREMIUM_CAPABILITY_LABELS: Record<PremiumCapability, string> = {
  "local-processing": "Processamento local",
  "large-files": "Arquivos grandes",
  "batch-processing": "Processamento em lote",
  "ocr-batch": "OCR em lote",
  "pdf-comparison": "Comparação de PDFs",
  "permanent-redaction": "Redação permanente",
  "pdf-a-compliance": "Conformidade PDF/A",
  "security-report": "Relatório de segurança",
  "pades-signatures": "Assinaturas PAdES",
  "shared-presets": "Presets compartilhados",
  "team-workspaces": "Espaços de equipe",
  "cloud-storage": "Armazenamento em nuvem",
  "sso-and-audit": "SSO e auditoria corporativa",
};

export function planHasCapability(plan: ProductPlan, capability: PremiumCapability) {
  return PLAN_ENTITLEMENTS[plan].capabilities.includes(capability);
}

export function getPlanEntitlements(plan: ProductPlan) {
  return PLAN_ENTITLEMENTS[plan];
}
