"use client";

import {
  Grid2X2,
  PencilLine,
  Repeat2,
  ShieldCheck,
  Signature,
  SlidersHorizontal,
  TableProperties,
} from "lucide-react";
import type { NavigationGroup } from "@/lib/navigation";

const icons = {
  organize: Grid2X2,
  edit: PencilLine,
  convert: Repeat2,
  forms: TableProperties,
  sign: Signature,
  security: ShieldCheck,
  optimize: SlidersHorizontal,
};

export function CategoryIcon({ icon, size = 22 }: { icon: NavigationGroup["icon"]; size?: number }) {
  const Icon = icons[icon];
  return <Icon size={size} strokeWidth={1.9} aria-hidden="true" />;
}
