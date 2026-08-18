"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolIcon } from "@/components/ToolIcon";
import type { AnyToolDefinition } from "@/lib/all-tools";
import { getProductToolLabel, getProductToolMeta } from "@/lib/product-catalog";

interface ToolCardProps {
  tool: AnyToolDefinition;
}

export function ToolCard({ tool }: ToolCardProps) {
  const meta = getProductToolMeta(tool.slug);
  return (
    <Link className="tool-card" href={`/ferramentas/${tool.slug}`}>
      <span className={`tool-icon accent-${tool.accent}`}>
        <ToolIcon icon={tool.icon} />
      </span>
      <span className="tool-card-copy">
        <strong>{tool.name}</strong>
        <small>{tool.shortDescription}</small>
        <span className="tool-card-meta"><span>{getProductToolLabel(tool.slug)}</span>{meta.processingMode === "local" ? <span>Processamento local</span> : null}</span>
      </span>
      <ArrowRight className="tool-arrow" size={18} aria-hidden="true" />
    </Link>
  );
}
