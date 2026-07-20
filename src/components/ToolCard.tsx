"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolIcon } from "@/components/ToolIcon";
import type { ToolDefinition } from "@/lib/tools";

interface ToolCardProps {
  tool: ToolDefinition;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Link className="tool-card" href={`/ferramentas/${tool.slug}`}>
      <span className={`tool-icon accent-${tool.accent}`}>
        <ToolIcon icon={tool.icon} />
      </span>
      <span className="tool-card-copy">
        <strong>{tool.name}</strong>
        <small>{tool.shortDescription}</small>
      </span>
      <ArrowRight className="tool-arrow" size={18} aria-hidden="true" />
    </Link>
  );
}
