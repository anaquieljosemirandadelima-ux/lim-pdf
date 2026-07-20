"use client";

import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type React from "react";

type IconName = keyof typeof Icons;

const iconMap = Icons as Record<string, React.ComponentType<LucideProps>>;

export function LucideClientIcon({ name, ...props }: { name: IconName } & LucideProps) {
  const Icon = iconMap[name as string];
  if (!Icon) return null;
  return <Icon {...props} />;
}
