from pathlib import Path
import json


def patch(path: str, transforms: list[tuple[str, str]]) -> None:
    file = Path(path)
    text = file.read_text()
    for old, new in transforms:
        text = text.replace(old, new)
    file.write_text(text)


# Compatibilidade com a versão atual de lucide-react.
patch("src/components/OfficeFidelityWorkspace.tsx", [
    ("FileSpreadsheet, ", ""), ("Presentation, ", ""), ("<FileSpreadsheet ", "<FileText "), ("<Presentation ", "<FileText "),
])
patch("src/components/PageNormalizeWorkspace.tsx", [("Maximize2", "Grid2X2")])
patch("src/components/PreflightWorkspace.tsx", [
    ("AlertTriangle, ", ""), ("ClipboardCheck, ", ""), ("<AlertTriangle ", "<ShieldCheck "), ("<ClipboardCheck ", "<CheckCircle2 "),
])
patch("src/components/PremiumToolExperience.tsx", [("Maximize2, ", ""), ("icon: Maximize2", "icon: Grid2X2")])
patch("src/components/ProLinksWorkspace.tsx", [
    ("Link2, ", ""), ("RefreshCcw, ", ""), ("<Link2 ", "<ExternalLink "), ("<RefreshCcw ", "<LoaderCircle "),
])
patch("src/components/ProNavigationWorkspace.tsx", [
    ("Link2, ", ""), ("ListTree, ", ""), ("Plus, ", ""), ("<Link2 ", "<FileText "), ("<ListTree ", "<FileText "), ("<Plus ", "<CheckCircle2 "),
])
patch("src/components/StudioProDock.tsx", [
    ('import { CopyPlus, Group, Layers3, Ruler, Save, ScanSearch, Trash2, Ungroup }', 'import { CopyPlus, Layers3, Save, Search, Trash2 }'),
    ("<Group ", "<Layers3 "), ("<Ungroup ", "<Layers3 "), ("<Ruler ", "<Layers3 "), ("<ScanSearch ", "<Search "),
])
patch("src/components/ToolEditorialContent.tsx", [
    ("Lightbulb, ", ""), ("TriangleAlert, ", ""), ("<Lightbulb ", "<Sparkles "), ("<TriangleAlert ", "<ShieldCheck "),
])
patch("src/components/UnifiedConverterWorkspace.tsx", [
    ("FileSpreadsheet, ", ""), ("Presentation, ", ""), ("<FileSpreadsheet ", "<FileText "), ("<Presentation ", "<FileText "),
])

p = Path("src/components/PageNormalizeWorkspace.tsx")
s = p.read_text()
head = s.split('from "lucide-react"', 1)[0]
if "Grid2X2" in s and "Grid2X2" not in head:
    s = s.replace("import { ", "import { Grid2X2, ", 1)
p.write_text(s)

p = Path("src/components/ToolEditorialContent.tsx")
s = p.read_text()
if "<Sparkles " in s and "Sparkles" not in s.split('from "lucide-react"', 1)[0]:
    s = s.replace("import { ", "import { Sparkles, ", 1)
p.write_text(s)

# Tipo explícito da rotação de scanner.
p = Path("src/components/ProPdfWorkspace.tsx")
s = p.read_text()
if "type ScanRotation" not in s:
    s = s.replace("type BookmarkDraft, type FormFieldDraft, type MetadataDraft,", "type BookmarkDraft, type FormFieldDraft, type MetadataDraft, type ScanRotation,")
s = s.replace("const [cleanRotate, setCleanRotate] = useState(0);", "const [cleanRotate, setCleanRotate] = useState<ScanRotation>(0);")
s = s.replace("setCleanRotate(Number(event.target.value))", "setCleanRotate(Number(event.target.value) as ScanRotation)")
p.write_text(s)

# E2E original compatível com o conversor unificado.
p = Path("scripts/e2e-browser.ts")
s = p.read_text()
s = s.replace('await page.waitForSelector(".selected-files", { timeout: 10_000 });', 'await page.waitForSelector(".selected-files,.converter-file-summary", { timeout: 10_000 });')
s = s.replace('"pdf-para-word", "pdf-para-excel", "extrair-texto-pdf",', '"pdf-para-word", "pdf-para-excel",')
if 'tool.slug === "extrair-texto-pdf"' not in s:
    marker = '''      if (zipOutputs.has(tool.slug)) {\n        assert.ok(output.bytes[0] === 0x50 && output.bytes[1] === 0x4b, `${tool.slug}: saída não é ZIP`);\n      } else {\n'''
    replacement = '''      if (zipOutputs.has(tool.slug)) {\n        assert.ok(output.bytes[0] === 0x50 && output.bytes[1] === 0x4b, `${tool.slug}: saída não é ZIP`);\n      } else if (tool.slug === "extrair-texto-pdf") {\n        assert.ok(output.filename.toLowerCase().endsWith(".txt"), `${tool.slug}: saída deveria ser TXT`);\n        assert.ok(new TextDecoder().decode(output.bytes).trim().length > 0, `${tool.slug}: TXT vazio`);\n      } else {\n'''
    if marker in s:
        s = s.replace(marker, replacement, 1)
p.write_text(s)

# Modo preciso não captura atalhos enquanto está oculto.
p = Path("src/components/PdfEditorWorkspaceHardened.tsx")
s = p.read_text()
marker = "  function handleKey(event: KeyboardEvent) {\n"
if 'dataset.limpdfEditorMode !== "precise"' not in s and marker in s:
    s = s.replace(marker, marker + '    if (document.body.dataset.limpdfEditorMode !== "precise") return;\n', 1)
p.write_text(s)

# Studio 3.0: dimensionamento, OCR integrado, Studio Pro e exportação coerente.
p = Path("src/components/PdfEditorStudio.tsx")
s = p.read_text()
if "EditorUtilityDock" not in s:
    marker = 'import { SignaturePad } from "./SignaturePad";\n'
    s = s.replace(marker, 'import { EditorUtilityDock, type StudioOcrDetail, type StudioPageSizeDetail } from "./EditorUtilityDock";\nimport { SignaturePad } from "./SignaturePad";\nimport { StudioProDock } from "./StudioProDock";\n')
if "type PageResizeMode" not in s:
    marker = "type Point = { x: number; y: number };\n"
    s = s.replace(marker, marker + 'type PageResizeMode = "fit" | "center" | "fill" | "stretch";\n', 1)
    s = s.replace("  blank?: boolean;\n};", "  blank?: boolean;\n  resizeMode?: PageResizeMode;\n  sourceWidth?: number;\n  sourceHeight?: number;\n};", 1)
    s = s.replace("  hidden?: boolean;\n};", "  hidden?: boolean;\n  groupId?: string;\n};", 1)
if "function pagePlacement(" not in s:
    marker = '''function pdfSize(page: PageModel) {\n  return { width: page.width / page.scale, height: page.height / page.scale };\n}\n'''
    addition = marker + '''\nfunction pagePlacement(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, mode: PageResizeMode) {\n  if (mode === "stretch") return { x: 0, y: 0, width: targetWidth, height: targetHeight, scaleX: targetWidth / sourceWidth, scaleY: targetHeight / sourceHeight };\n  if (mode === "center") return { x: (targetWidth - sourceWidth) / 2, y: (targetHeight - sourceHeight) / 2, width: sourceWidth, height: sourceHeight, scaleX: 1, scaleY: 1 };\n  const scale = mode === "fill" ? Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight) : Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);\n  const width = sourceWidth * scale; const height = sourceHeight * scale;\n  return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height, scaleX: scale, scaleY: scale };\n}\nfunction resizeStudioObject(object: StudioObject, oldWidth: number, oldHeight: number, targetWidth: number, targetHeight: number, mode: PageResizeMode): StudioObject {\n  const placement = pagePlacement(oldWidth, oldHeight, targetWidth, targetHeight, mode); const next = cloneObject(object);\n  next.x = placement.x + object.x * placement.scaleX; next.y = placement.y + object.y * placement.scaleY; next.width = Math.max(MIN_SIZE, object.width * placement.scaleX); next.height = Math.max(MIN_SIZE, object.height * placement.scaleY);\n  if (isTextObject(next)) next.fontSize = Math.max(6, next.fontSize * Math.min(placement.scaleX, placement.scaleY));\n  if (next.kind === "pen" || next.kind === "line" || next.kind === "arrow" || next.kind === "rect" || next.kind === "ellipse") next.strokeWidth = Math.max(.5, next.strokeWidth * Math.min(placement.scaleX, placement.scaleY));\n  return next;\n}\n'''
    if marker in s:
        s = s.replace(marker, addition, 1)
if "async function sanitizedResizedPage" not in s:
    marker = "export function PdfEditorStudio() {\n"
    helper = '''async function sanitizedResizedPage(document: PdfJsDocument, sourceIndex: number, targetWidth: number, targetHeight: number, mode: PageResizeMode, redactions: AreaObject[]) {\n  const sourcePage = await document.getPage(sourceIndex + 1);\n  try {\n    const base = sourcePage.getViewport({ scale: 1 }); const sourceScale = safeScale(base.width, base.height, 2.15, MAX_SANITIZE_PIXELS); const viewport = sourcePage.getViewport({ scale: sourceScale });\n    const sourceCanvas = window.document.createElement("canvas"); sourceCanvas.width = Math.ceil(viewport.width); sourceCanvas.height = Math.ceil(viewport.height); const sourceContext = sourceCanvas.getContext("2d", { alpha: false }); if (!sourceContext) throw new Error("Canvas indisponível");\n    await sourcePage.render({ canvas: sourceCanvas, canvasContext: sourceContext, viewport }).promise;\n    const outputScale = safeScale(targetWidth, targetHeight, 2.15, MAX_SANITIZE_PIXELS); const canvas = window.document.createElement("canvas"); canvas.width = Math.ceil(targetWidth * outputScale); canvas.height = Math.ceil(targetHeight * outputScale); const context = canvas.getContext("2d", { alpha: false }); if (!context) throw new Error("Canvas indisponível"); context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);\n    const placement = pagePlacement(base.width, base.height, targetWidth, targetHeight, mode); context.drawImage(sourceCanvas, placement.x * outputScale, canvas.height - (placement.y + placement.height) * outputScale, placement.width * outputScale, placement.height * outputScale); context.fillStyle = "#000";\n    redactions.forEach((object) => context.fillRect(Math.floor(object.x * outputScale) - 2, Math.floor(canvas.height - (object.y + object.height) * outputScale) - 2, Math.ceil(object.width * outputScale) + 4, Math.ceil(object.height * outputScale) + 4));\n    const blob = await canvasToBlob(canvas, "image/jpeg", .95); const bytes = await blob.arrayBuffer(); sourceCanvas.width = 1; canvas.width = 1; return { bytes, width: targetWidth, height: targetHeight };\n  } finally { sourcePage.cleanup(); }\n}\n\n'''
    if marker in s:
        s = s.replace(marker, helper + marker, 1)
if "limpdf:studio-page-size" not in s:
    marker = "  function eventPoint(event: React.PointerEvent<HTMLElement>) {\n"
    effects = '''  useEffect(() => {\n    const handleResize = (event: Event) => {\n      const detail = (event as CustomEvent<StudioPageSizeDetail>).detail; if (!detail) return; const targetWidth = detail.widthMm * 72 / 25.4; const targetHeight = detail.heightMm * 72 / 25.4;\n      const targetIds = new Set(detail.scope === "all" ? pages.map((item) => item.id) : pages[currentPage] ? [pages[currentPage].id] : []); if (!targetIds.size) return;\n      const sizes = new Map(pages.filter((item) => targetIds.has(item.id)).map((item) => [item.id, pdfSize(item)])); pushHistory();\n      setObjects((current) => current.map((object) => { const oldSize = sizes.get(object.pageId); return oldSize ? resizeStudioObject(object, oldSize.width, oldSize.height, targetWidth, targetHeight, detail.mode) : object; }));\n      setPages((current) => current.map((item) => { if (!targetIds.has(item.id)) return item; const oldSize = pdfSize(item); return { ...item, sourceWidth: item.sourceWidth || oldSize.width, sourceHeight: item.sourceHeight || oldSize.height, resizeMode: detail.mode, width: targetWidth * item.scale, height: targetHeight * item.scale, previewUrl: item.blank ? blankPreview(targetWidth * item.scale, targetHeight * item.scale) : item.previewUrl }; }));\n      setSearchHit(null); setMessage(`${detail.scope === "all" ? "Páginas" : "Página"} dimensionada(s) para ${detail.widthMm} × ${detail.heightMm} mm.`);\n    };\n    window.addEventListener("limpdf:studio-page-size", handleResize); return () => window.removeEventListener("limpdf:studio-page-size", handleResize);\n  }, [currentPage, pages, pushHistory]);\n  useEffect(() => {\n    const handleOcr = (event: Event) => { const detail = (event as CustomEvent<StudioOcrDetail>).detail; if (!file || !detail || status === "loading" || status === "exporting") return; if (objects.length) { setMessage("Execute OCR antes de criar camadas no Studio, para não perder alterações visuais já feitas."); return; }\n      void (async () => { try { setStatus("loading"); setMessage("OCR dentro do editor: preparando motor e idiomas…"); const { ocrPdf } = await import("@/lib/pro-pdf-engines"); const result = await ocrPdf(file, detail.languages, (label, percent) => setMessage(`${label}${typeof percent === "number" ? ` · ${percent}%` : ""}`)); const nextFile = new File([Uint8Array.from(result.bytes).buffer], result.filename, { type: "application/pdf", lastModified: Date.now() }); cleanupUrls(); setFiles([nextFile]); setMessage("OCR concluído. Reabrindo a cópia pesquisável no Studio…"); } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Não foi possível concluir o OCR dentro do editor."); } })(); };\n    window.addEventListener("limpdf:studio-ocr", handleOcr); return () => window.removeEventListener("limpdf:studio-ocr", handleOcr);\n  }, [cleanupUrls, file, objects.length, setFiles, status]);\n  useEffect(() => {\n    const handlePro = (event: Event) => { const detail = (event as CustomEvent<{ action: string; ids: string[]; targetPage?: number; styleName?: string }>).detail; if (!detail) return; const ids = new Set(detail.ids || []); const selectedObjects = objects.filter((object) => ids.has(object.id)); if (detail.action !== "apply-style" && !selectedObjects.length) return;\n      if (["group", "ungroup", "duplicate", "delete-selection", "copy-page"].includes(detail.action)) pushHistory();\n      if (detail.action === "group") { const groupId = crypto.randomUUID(); setObjects((current) => current.map((object) => ids.has(object.id) ? { ...object, groupId } as StudioObject : object)); setMessage(`${selectedObjects.length} objetos agrupados.`); return; }\n      if (detail.action === "ungroup") { const groups = new Set(selectedObjects.map((object) => object.groupId).filter(Boolean)); setObjects((current) => current.map((object) => object.groupId && groups.has(object.groupId) ? { ...object, groupId: undefined } as StudioObject : object)); setMessage("Grupo desfeito."); return; }\n      if (detail.action === "delete-selection") { setObjects((current) => current.filter((object) => !ids.has(object.id) || object.locked)); setSelectedId(null); setMessage("Seleção removida; camadas bloqueadas foram preservadas."); return; }\n      if (detail.action === "duplicate") { const copies = selectedObjects.filter((object) => !object.locked).map((object, index) => ({ ...cloneObject(object), id: crypto.randomUUID(), x: object.x + 14, y: object.y - 14, z: nextZ + index, groupId: object.groupId ? crypto.randomUUID() : undefined } as StudioObject)); setObjects((current) => [...current, ...copies]); setSelectedId(copies[0]?.id || null); setMessage(`${copies.length} objeto(s) duplicado(s).`); return; }\n      if (detail.action === "copy-page") { const target = pages[Math.max(0, (detail.targetPage || 1) - 1)]; if (!target) return setMessage("Página de destino inexistente."); const copies = selectedObjects.map((object, index) => ({ ...cloneObject(object), id: crypto.randomUUID(), pageId: target.id, z: nextZ + index, groupId: undefined } as StudioObject)); setObjects((current) => [...current, ...copies]); setCurrentPage(Math.max(0, (detail.targetPage || 1) - 1)); setSelectedId(copies[0]?.id || null); setMessage(`${copies.length} objeto(s) copiado(s) para a página ${detail.targetPage || 1}.`); return; }\n      const key = `limpdf:studio-style:${(detail.styleName || "Meu estilo").trim().toLocaleLowerCase("pt-BR")}`;\n      if (detail.action === "save-style") { const source = selectedObjects[0]; if (!source) return; const style: Record<string, unknown> = { opacity: source.opacity, rotation: source.rotation }; if (isTextObject(source)) Object.assign(style, { fontSize: source.fontSize, fontFamily: source.fontFamily, bold: source.bold, italic: source.italic, color: source.color }); if ("stroke" in source) Object.assign(style, { stroke: source.stroke, strokeWidth: source.strokeWidth }); if ("fill" in source) Object.assign(style, { fill: source.fill }); try { localStorage.setItem(key, JSON.stringify(style)); window.dispatchEvent(new Event("limpdf:studio-pro-style-saved")); setMessage("Estilo salvo neste navegador."); } catch { setMessage("O navegador bloqueou o armazenamento do estilo."); } return; }\n      if (detail.action === "apply-style") { try { const style = JSON.parse(localStorage.getItem(key) || "null") as Record<string, unknown> | null; if (!style) return setMessage("Estilo não encontrado neste navegador."); pushHistory(); setObjects((current) => current.map((object) => ids.has(object.id) ? ({ ...object, ...style } as StudioObject) : object)); setMessage("Estilo aplicado à seleção."); } catch { setMessage("Não foi possível aplicar esse estilo."); } }\n    };\n    window.addEventListener("limpdf:studio-pro", handlePro); return () => window.removeEventListener("limpdf:studio-pro", handlePro);\n  }, [nextZ, objects, pages, pushHistory]);\n\n'''
    if marker in s:
        s = s.replace(marker, effects + marker, 1)

old_drag = '''  function moveDrag(event: React.PointerEvent<HTMLElement>) {\n    const drag = dragRef.current;\n    if (!drag || drag.pointerId !== event.pointerId || !page) return;\n    event.preventDefault();\n    const scale = page.scale * zoom;\n    const dx = (event.clientX - drag.startClientX) / scale;\n    const dy = (event.clientY - drag.startClientY) / scale;\n    setObjects((current) => current.map((object) => {\n      if (object.id !== drag.id) return object;\n      if (drag.mode === "move") return { ...object, ...snapped(drag.startObject, drag.startObject.x + dx, drag.startObject.y - dy) } as StudioObject;\n      const width = Math.max(MIN_SIZE, drag.startObject.width + dx);\n      const height = Math.max(MIN_SIZE, drag.startObject.height + dy);\n      return { ...object, width, height, y: drag.startObject.y - (height - drag.startObject.height) } as StudioObject;\n    }));\n  }\n'''
if "const groupId = drag.startObject.groupId;" not in s and old_drag in s:
    s = s.replace(old_drag, '''  function moveDrag(event: React.PointerEvent<HTMLElement>) {\n    const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId || !page) return; event.preventDefault(); const scale = page.scale * zoom; const dx = (event.clientX - drag.startClientX) / scale; const dy = (event.clientY - drag.startClientY) / scale; const groupId = drag.startObject.groupId; const primaryNext = drag.mode === "move" ? snapped(drag.startObject, drag.startObject.x + dx, drag.startObject.y - dy) : null; const shiftX = primaryNext ? primaryNext.x - drag.startObject.x : 0; const shiftY = primaryNext ? primaryNext.y - drag.startObject.y : 0;\n    setObjects((current) => current.map((object) => { const original = drag.snapshot.objects.find((item) => item.id === object.id); if (drag.mode === "move" && groupId && original?.groupId === groupId && !original.locked) { const size = pdfSize(page); return { ...object, x: Math.max(0, Math.min(size.width - object.width, original.x + shiftX)), y: Math.max(0, Math.min(size.height - object.height, original.y + shiftY)) } as StudioObject; } if (object.id !== drag.id) return object; if (drag.mode === "move" && primaryNext) return { ...object, ...primaryNext } as StudioObject; const width = Math.max(MIN_SIZE, drag.startObject.width + dx); const height = Math.max(MIN_SIZE, drag.startObject.height + dy); return { ...object, width, height, y: drag.startObject.y - (height - drag.startObject.height) } as StudioObject; }));\n  }\n''', 1)

old_export = '''        if (item.sourceIndex === null) {\n          const size = pdfSize(item);\n          targetPage = output.addPage([size.width, size.height]);\n        } else if (redactions.length && renderDocument) {\n          const sanitized = await sanitizedPage(renderDocument, item.sourceIndex, redactions);\n          targetPage = output.addPage([sanitized.width, sanitized.height]);\n          const image = await output.embedJpg(sanitized.bytes);\n          targetPage.drawImage(image, { x: 0, y: 0, width: sanitized.width, height: sanitized.height });\n        } else {\n          const [copied] = await output.copyPages(sourcePdf, [item.sourceIndex]);\n          targetPage = output.addPage(copied);\n        }\n'''
if "sanitizedResizedPage(renderDocument" not in s and old_export in s:
    s = s.replace(old_export, '''        if (item.sourceIndex === null) { const size = pdfSize(item); targetPage = output.addPage([size.width, size.height]); }\n        else if (item.resizeMode) { const targetSize = pdfSize(item); if (redactions.length && renderDocument) { const sanitized = await sanitizedResizedPage(renderDocument, item.sourceIndex, targetSize.width, targetSize.height, item.resizeMode, redactions); targetPage = output.addPage([sanitized.width, sanitized.height]); const image = await output.embedJpg(sanitized.bytes); targetPage.drawImage(image, { x: 0, y: 0, width: sanitized.width, height: sanitized.height }); } else { const sourcePage = sourcePdf.getPage(item.sourceIndex); const sourceSize = sourcePage.getSize(); const embedded = await output.embedPage(sourcePage); const placement = pagePlacement(sourceSize.width, sourceSize.height, targetSize.width, targetSize.height, item.resizeMode); targetPage = output.addPage([targetSize.width, targetSize.height]); targetPage.drawPage(embedded, { x: placement.x, y: placement.y, width: placement.width, height: placement.height }); } }\n        else if (redactions.length && renderDocument) { const sanitized = await sanitizedPage(renderDocument, item.sourceIndex, redactions); targetPage = output.addPage([sanitized.width, sanitized.height]); const image = await output.embedJpg(sanitized.bytes); targetPage.drawImage(image, { x: 0, y: 0, width: sanitized.width, height: sanitized.height }); }\n        else { const [copied] = await output.copyPages(sourcePdf, [item.sourceIndex]); targetPage = output.addPage(copied); }\n''', 1)

old_catch = '''    } catch {\n      setStatus("error");\n      setMessage("Não foi possível exportar. Remova a última camada ou use o Modo preciso para este arquivo.");\n'''
if old_catch in s:
    s = s.replace(old_catch, '''    } catch (error) {\n      setStatus("error");\n      setMessage(error instanceof Error ? error.message : "Não foi possível exportar. Remova a última camada ou use o Modo preciso para este arquivo.");\n''', 1)

if "<StudioProDock />" not in s:
    old = '<div className="studio-top-actions"><button className="secondary-button" type="button" onClick={closeDocument}>Fechar</button><button className="primary-button" type="button" onClick={exportPdf}'
    if old in s:
        s = s.replace(old, '<div className="studio-top-actions"><StudioProDock /><EditorUtilityDock /><button className="secondary-button" type="button" onClick={closeDocument}>Fechar</button><button className="primary-button" type="button" onClick={exportPdf}', 1)
if "data-studio-object-id={object.id}" not in s:
    old = '<button key={object.id} type="button" className={`studio-object kind-${object.kind} ${selectedId === object.id ? "selected" : ""} ${object.locked ? "locked" : ""}`} style={objectStyle(object,page,zoom)}'
    if old in s:
        s = s.replace(old, '<button key={object.id} type="button" data-studio-object-id={object.id} data-grouped={object.groupId ? "true" : "false"} aria-selected={selectedId === object.id} className={`studio-object kind-${object.kind} ${selectedId === object.id ? "selected" : ""} ${object.locked ? "locked" : ""}`} style={objectStyle(object,page,zoom)}', 1)
if "studio-page-size-badge" not in s:
    old = '<img className="studio-page-image" src={page.previewUrl} alt={`Página ${currentPage + 1}`} draggable={false} />'
    if old in s:
        s = s.replace(old, '<img className={`studio-page-image ${page.resizeMode ? `resized-${page.resizeMode}` : ""}`} src={page.previewUrl} alt={`Página ${currentPage + 1}`} draggable={false} />{page.resizeMode ? <span className="studio-page-size-badge">{Math.round(pdfSize(page).width * 25.4 / 72 * 10) / 10} × {Math.round(pdfSize(page).height * 25.4 / 72 * 10) / 10} mm</span> : null}', 1)
s = s.replace("Studio 2.0", "Studio 3.0").replace("Desenho livre, formas, setas, tipografia, carimbos, comentários, imagens, assinatura e redação segura — tudo no navegador.", "Texto, imagens, desenho, formas, revisão, assinatura, OCR integrado, dimensionamento de página e redação segura — tudo no navegador.", 1)
p.write_text(s)

# Script permanente da release.
p = Path("package.json")
data = json.loads(p.read_text())
data["scripts"]["test:e2e:release"] = "tsx scripts/e2e-release-browser.ts"
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
