from pathlib import Path

# Este módulo é carregado automaticamente pelo Python antes de
# scripts/apply-release-patches.py. Ele existe apenas para consolidar a árvore
# da release; é removido pela própria limpeza quando a validação final passa.

ROOT = Path.cwd()

TEMP_WORKFLOWS = [
    "office-fidelity-browser.yml",
    "office-fidelity-patch.yml",
    "pro-compare-patch.yml",
    "pro-links-patch.yml",
    "pro-suite-autopatch.yml",
    "pro-suite-complete-gate.yml",
    "pro-suite-form-patch.yml",
    "pro-suite-review-fixes.yml",
    "scan-orientation-patch.yml",
    "studio-pro-browser.yml",
    "studio-pro-dock-patch.yml",
    "studio-pro-integration.yml",
    "studio-pro-test-patch.yml",
    "studio-source-check.yml",
    "release-top-finalize.yml",
    "release-build-fix.yml",
    "editor3-integrate.yml",
]
for name in TEMP_WORKFLOWS:
    path = ROOT / ".github" / "workflows" / name
    if path.exists():
        path.unlink()

# Depois deste primeiro gate, validate.yml volta a ser um workflow normal:
# sem autoedição da branch e sem permissão de escrita.
validate = ROOT / ".github" / "workflows" / "validate.yml"
if validate.exists():
    text = validate.read_text()
    text = text.replace("permissions:\n  contents: write\n", "permissions:\n  contents: read\n")
    start = text.find("      - name: Integrate release branch patches\n")
    if start >= 0:
        end = text.find("      - name: Setup Node\n", start)
        if end > start:
            text = text[:start] + text[end:]
    validate.write_text(text)

# Organiza a toolbar principal por objetivo sem aumentar a quantidade de ações.
studio = ROOT / "src" / "components" / "PdfEditorStudio.tsx"
if studio.exists():
    text = studio.read_text()
    flat = '<aside className="studio-tools">{([ ["select","Selecionar",MousePointer2], ["text","Texto",Type], ["pen","Caneta",PencilLine], ["highlight","Destacar",PencilLine], ["line","Linha",ArrowRight], ["arrow","Seta",ArrowRight], ["rect","Retângulo",Grid2X2], ["ellipse","Círculo",CircleOff], ["redact","Redigir",ShieldCheck], ["comment","Comentário",FileText], ["stamp","Carimbo",CheckCircle2], ["signature","Assinar",Signature] ] as const).map(([id,label,Icon]) => <button key={id} type="button" className={tool === id ? "active" : ""} onClick={() => setTool(id)}><Icon size={19} /><span>{label}</span></button>)}<button type="button" onClick={() => imageInputRef.current?.click()}><ImagePlus size={19} /><span>Imagem</span></button><input ref={imageInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={(event) => event.target.files?.[0] && void addImage(event.target.files[0])} /></aside>'
    grouped = '<aside className="studio-tools"><div className="studio-tool-group"><small>Selecionar</small><button type="button" className={tool === "select" ? "active" : ""} onClick={() => setTool("select")}><MousePointer2 size={19} /><span>Selecionar</span></button></div><div className="studio-tool-group"><small>Criar</small>{([ ["text","Texto",Type], ["pen","Caneta",PencilLine], ["line","Linha",ArrowRight], ["arrow","Seta",ArrowRight], ["rect","Retângulo",Grid2X2], ["ellipse","Círculo",CircleOff] ] as const).map(([id,label,Icon]) => <button key={id} type="button" className={tool === id ? "active" : ""} onClick={() => setTool(id)}><Icon size={19} /><span>{label}</span></button>)}<button type="button" onClick={() => imageInputRef.current?.click()}><ImagePlus size={19} /><span>Imagem</span></button><input ref={imageInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={(event) => event.target.files?.[0] && void addImage(event.target.files[0])} /></div><div className="studio-tool-group"><small>Revisar</small>{([ ["highlight","Destacar",PencilLine], ["redact","Redigir",ShieldCheck], ["comment","Comentário",FileText], ["stamp","Carimbo",CheckCircle2] ] as const).map(([id,label,Icon]) => <button key={id} type="button" className={tool === id ? "active" : ""} onClick={() => setTool(id)}><Icon size={19} /><span>{label}</span></button>)}</div><div className="studio-tool-group"><small>Assinar</small><button type="button" className={tool === "signature" ? "active" : ""} onClick={() => setTool("signature")}><Signature size={19} /><span>Assinar</span></button></div></aside>'
    if flat in text:
        text = text.replace(flat, grouped, 1)
    studio.write_text(text)

# Refina o agrupamento e os estados sem animações excessivas.
css = ROOT / "src" / "app" / "editor-release.css"
if css.exists():
    text = css.read_text()
    marker = "/* organized-release-v1 */"
    if marker not in text:
        text += '''\n/* organized-release-v1 */\n.studio-tool-group{position:relative}.studio-tool-group>small{display:block}.studio-tool-group button{position:relative}.studio-tool-group button:hover{background:#f5f7fa}.studio-tool-group button.active{box-shadow:inset 3px 0 0 #e11926}.editor-utility-ocr{display:grid;gap:9px;margin-top:13px;padding-top:12px;border-top:1px solid #eceff3}.editor-utility-ocr>div{display:grid;gap:2px}.editor-utility-ocr small{color:#717b88}.editor-utility-ocr label{display:grid;gap:4px}.editor-utility-ocr label span{font-size:10px;font-weight:800;color:#697382;text-transform:uppercase}.editor-utility-ocr select{min-height:37px;border:1px solid #dce2e9;border-radius:9px;background:#fff;padding:0 9px}.editor-mode-note{margin:0 0 10px;padding:9px 12px;border:1px solid #e8ebef;border-radius:11px;background:#fafbfc;color:#697381;font-size:11px;line-height:1.45}.studio-tools{scrollbar-width:thin}.studio-top-actions{animation:studioActionsIn .24s ease both}@keyframes studioActionsIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.studio-top-actions{animation:none!important}}\n'''
        css.write_text(text)
