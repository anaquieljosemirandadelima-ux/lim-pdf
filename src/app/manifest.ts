import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LIM PDF — Ferramentas PDF gratuitas",
    short_name: "LIM PDF",
    description: "Organize, converta, edite e compacte PDFs gratuitamente no navegador.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ef151c",
    lang: "pt-BR",
    categories: ["productivity", "utilities"],
    shortcuts: [
      { name: "Editar PDF", short_name: "Editar", url: "/ferramentas/editar-pdf", icons: [{ src: "/brand/lim-pdf-icon-192.png", sizes: "192x192" }] },
      { name: "Comprimir PDF", short_name: "Comprimir", url: "/ferramentas/compactar-pdf", icons: [{ src: "/brand/lim-pdf-icon-192.png", sizes: "192x192" }] },
      { name: "OCR e digitalização", short_name: "OCR", url: "/ferramentas/ocr-pdf", icons: [{ src: "/brand/lim-pdf-icon-192.png", sizes: "192x192" }] },
    ],
    icons: [
      { src: "/brand/lim-pdf-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/lim-pdf-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
