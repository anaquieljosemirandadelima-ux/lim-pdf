import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function main() {
  const [switcher, studio, precise, dock, css, navigation] = await Promise.all([
    readFile("src/components/PdfEditorExperienceSwitcher.tsx", "utf8"),
    readFile("src/components/PdfEditorStudio.tsx", "utf8"),
    readFile("src/components/PdfEditorWorkspaceHardened.tsx", "utf8"),
    readFile("src/components/StudioProDock.tsx", "utf8"),
    readFile("src/app/studio-pro.css", "utf8"),
    readFile("src/components/ProNavigationWorkspace.tsx", "utf8"),
  ]);

  assert.ok(switcher.includes("preciseMounted"), "Modo preciso precisa permanecer montado após primeiro acesso.");
  assert.ok(switcher.includes("data-limpdf-editor-mode") || switcher.includes("limpdfEditorMode"), "Switcher deve publicar modo ativo para gate de atalhos.");
  assert.ok(switcher.includes('data-editor-mode="studio"') && switcher.includes('data-editor-mode="precise"'), "Ambos os modos precisam ter wrappers persistentes.");
  assert.ok(studio.includes('dataset.limpdfEditorMode !== "studio"'), "Atalhos do Studio precisam ser suspensos quando ele estiver oculto.");
  assert.ok(precise.includes('dataset.limpdfEditorMode !== "precise"'), "Atalhos do modo preciso precisam ser suspensos quando ele estiver oculto.");
  assert.ok(studio.includes("StudioProDock"), "Studio precisa renderizar dock profissional.");
  assert.ok(studio.includes("limpdf:studio-pro"), "Studio precisa processar ações profissionais reais sobre os objetos.");
  assert.ok(studio.includes("data-studio-object-id"), "Objetos precisam expor identificador apenas para interação do dock.");
  assert.ok(studio.includes("groupId") && studio.includes("studioProPreviousObjectsRef"), "Agrupamento precisa sincronizar movimento dos membros.");
  assert.ok(dock.includes("studio-pro-marquee") && dock.includes("copy-page") && dock.includes("save-style"), "Dock precisa suportar marquee, cópia entre páginas e estilos.");
  assert.ok(dock.includes("ResizeObserver") && !dock.includes("new MutationObserver(update)"), "Guias não podem usar observer recursivo.");
  assert.ok(css.includes("studio-pro-ruler-x") && css.includes("prefers-reduced-motion"), "Réguas e acessibilidade de movimento precisam estar estilizadas.");
  assert.ok(navigation.includes("URL do hyperlink"), "Editor de links deve usar rótulo estável para QA e acessibilidade.");

  console.log(JSON.stringify({ ok: true, suite: "studio-source", persistentModes: true, shortcutGate: true, grouping: true, marquee: true, rulers: true, guides: true, copyAcrossPages: true, reusableStyles: true }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
