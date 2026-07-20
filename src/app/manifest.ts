import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LIM PDF — Ferramentas PDF gratuitas",
    short_name: "LIM PDF",
    description: "Organize, converta, edite e compacte PDFs gratuitamente no navegador.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ef151c",
    lang: "pt-BR",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/brand/lim-pdf-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/lim-pdf-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
