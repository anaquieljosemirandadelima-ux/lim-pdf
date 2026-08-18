"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, FileOutput, FileText, LoaderCircle, RotateCw, Trash2, UploadCloud, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { humanSize, outputName as buildOutputName } from "@/lib/browser-files";
import { formatFileSizeLimit, getFileSizeGuidance, isFileWithinLimit, isPdfFile, MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";
import { loadPdfJsDocument, renderPdfPagesSequentially } from "@/lib/pdf-render";
import { buildPrintPlan, nUpGrid, PRINT_PAPERS, pageLabel, bookletSheets, type DuplexEdge, type PrintMode, type PrintPaper } from "@/lib/pdf-print";
import { useLocalJobQueue } from "@/lib/use-local-job-queue";

type PrintStatus = "idle" | "loading" | "ready" | "error";

type Thumbnail = { page: number; dataUrl: string };

const MODE_COPY: Record<PrintMode, { label: string; description: string }> = {
  standard: { label: "Impressão normal", description: "Uma página por folha, mantendo a ordem original." },
  booklet: { label: "Livreto dobrado", description: "Imposição frente e verso para dobrar e grampear no centro." },
  nup: { label: "Páginas por folha", description: "Agrupe 2, 4, 6, 9 ou 16 páginas em cada folha." },
};

export function PrintCenterWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [mode, setMode] = useState<PrintMode>("standard");
  const [paper, setPaper] = useState<PrintPaper>("A4");
  const [pagesPerSheet, setPagesPerSheet] = useState(4);
  const [duplexEdge, setDuplexEdge] = useState<DuplexEdge>("short");
  const [margin, setMargin] = useState("6");
  const [status, setStatus] = useState<PrintStatus>("idle");
  const [message, setMessage] = useState("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("");
  const { jobs, activeJob, enqueue, cancel, retry, clearFinished } = useLocalJobQueue();

  useEffect(() => () => { if (outputUrl) URL.revokeObjectURL(outputUrl); }, [outputUrl]);

  async function inspect(selected: File) {
    setStatus("loading");
    setMessage("Lendo páginas localmente…");
    setThumbnails([]);
    try {
      const bytes = await selected.arrayBuffer();
      const document = await loadPdfJsDocument(bytes.slice(0));
      setPageCount(document.numPages);
      await document.cleanup();
      const next: Thumbnail[] = [];
      await renderPdfPagesSequentially(bytes, 0.34, ({ pageNumber, canvas }) => {
        if (pageNumber <= 4) next.push({ page: pageNumber, dataUrl: canvas.toDataURL("image/jpeg", 0.82) });
      });
      setThumbnails(next);
      setStatus("ready");
      if (!processingRef.current) setMessage("Arquivo pronto para configurar.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível ler este PDF.");
    }
  }

  function selectFile(selected: File | null) {
    if (!selected) return;
    if (!isPdfFile(selected)) { setStatus("error"); setMessage("Selecione um arquivo PDF."); return; }
    if (!isFileWithinLimit(selected, MAX_LOCAL_PDF_BYTES)) { setStatus("error"); setMessage(`O PDF ultrapassa ${formatFileSizeLimit()}.`); return; }
    setFile(selected);
    setOutputUrl(null);
    setOutputName("");
    void inspect(selected);
  }

  function clearFile() {
    setFile(null); setPageCount(0); setThumbnails([]); setOutputUrl(null); setOutputName(""); setStatus("idle"); setMessage("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function createOutput() {
    if (!file || !pageCount) throw new Error("Selecione um PDF antes de processar.");
    const pdfLib = await import("pdf-lib");
    const source = await pdfLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const output = await pdfLib.PDFDocument.create();
    const paperSize = PRINT_PAPERS[paper];
    const marginPoints = Math.max(0, Number(margin) * (72 / 25.4));
    if (!Number.isFinite(marginPoints) || marginPoints * 2 >= paperSize.width || marginPoints * 2 >= paperSize.height) throw new Error("Informe uma margem válida para o papel escolhido.");
    const sourcePages = source.getPages();

    if (mode === "standard") {
      const copied = await output.copyPages(source, sourcePages.map((_, index) => index));
      copied.forEach((page) => output.addPage(page));
    } else if (mode === "booklet") {
      const target = { width: paperSize.height, height: paperSize.width };
      const slotWidth = (target.width - marginPoints * 3) / 2;
      const slotHeight = target.height - marginPoints * 2;
      const sheets = bookletSheets(sourcePages.length);
      for (const sheet of sheets) {
        const targetPages = duplexEdge === "short" && sheet.side === "verso" ? [...sheet.pages].reverse() : sheet.pages;
        const page = output.addPage([target.width, target.height]);
        page.drawLine({ start: { x: target.width / 2, y: marginPoints }, end: { x: target.width / 2, y: target.height - marginPoints }, thickness: 0.45, color: pdfLib.rgb(0.82, 0.82, 0.82) });
        for (const [slot, pageNumber] of targetPages.entries()) {
          if (pageNumber === null) continue;
          const sourcePage = sourcePages[pageNumber];
          const embedded = await output.embedPage(sourcePage);
          const scale = Math.min(slotWidth / sourcePage.getWidth(), slotHeight / sourcePage.getHeight());
          const width = sourcePage.getWidth() * scale;
          const height = sourcePage.getHeight() * scale;
          const x = marginPoints + slot * (slotWidth + marginPoints) + (slotWidth - width) / 2;
          const y = marginPoints + (slotHeight - height) / 2;
          page.drawPage(embedded, { x, y, width, height });
        }
      }
    } else {
      const grid = nUpGrid(pagesPerSheet);
      const cellWidth = (paperSize.width - marginPoints * (grid.columns + 1)) / grid.columns;
      const cellHeight = (paperSize.height - marginPoints * (grid.rows + 1)) / grid.rows;
      for (let start = 0; start < sourcePages.length; start += pagesPerSheet) {
        const page = output.addPage([paperSize.width, paperSize.height]);
        for (let offset = 0; offset < pagesPerSheet; offset += 1) {
          const pageNumber = start + offset;
          if (pageNumber >= sourcePages.length) continue;
          const sourcePage = sourcePages[pageNumber];
          const embedded = await output.embedPage(sourcePage);
          const scale = Math.min(cellWidth / sourcePage.getWidth(), cellHeight / sourcePage.getHeight());
          const width = sourcePage.getWidth() * scale;
          const height = sourcePage.getHeight() * scale;
          const column = offset % grid.columns;
          const row = Math.floor(offset / grid.columns);
          const x = marginPoints + column * (cellWidth + marginPoints) + (cellWidth - width) / 2;
          const y = paperSize.height - marginPoints - (row + 1) * cellHeight - row * marginPoints + (cellHeight - height) / 2;
          page.drawPage(embedded, { x, y, width, height });
        }
      }
    }
    return { bytes: await output.save({ useObjectStreams: true }), name: buildOutputName(file, mode === "booklet" ? "livreto-pronto" : mode === "nup" ? `${pagesPerSheet}-por-folha` : "impressao-pronta") };
  }

  async function process() {
    if (!file || !pageCount || activeJob) return;
    processingRef.current = true;
    setMessage("Adicionando à fila local…");
    const job = enqueue(`Preparar impressão: ${file.name}`, async (_signal, report) => {
      report(8, "Lendo a estrutura do PDF…");
      const result = await createOutput();
      report(94, "Validando o PDF de saída…");
      const check = await PDFDocument.load(result.bytes);
      if (!check.getPageCount()) throw new Error("A saída não contém páginas.");
      return result;
    });
    setMessage("A preparação está na fila local.");
    try {
      const result = await job.promise;
      const blob = new Blob([result.bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputName(result.name);
      setMessage("PDF pronto. Revise o plano e abra a saída para imprimir no computador.");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setMessage(error instanceof Error ? error.message : "Não foi possível preparar a impressão.");
    } finally {
      processingRef.current = false;
    }
  }

  function openPrintPdf() {
    if (!outputUrl) return;
    window.open(outputUrl, "_blank", "noopener,noreferrer");
  }

  const plan = pageCount ? buildPrintPlan(pageCount, mode, pagesPerSheet) : [];
  const guidance = file ? getFileSizeGuidance(file) : null;

  return <section className="workspace print-center-workspace" aria-labelledby="print-center-title" aria-busy={status === "loading" || Boolean(activeJob)}>
    <div className="workspace-heading"><div><span className="page-kicker">Centro de saída local</span><h2 id="print-center-title">Prepare, revise e imprima seu PDF</h2><p>O arquivo permanece no navegador. Configure a folha, veja a ordem e abra o resultado na impressão do computador.</p></div><FileOutput size={31} aria-hidden="true" /></div>
    {!file ? <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0] || null); }}><span className="drop-icon"><UploadCloud size={31} /></span><strong>Arraste um PDF ou escolha no dispositivo</strong><span>Até {formatFileSizeLimit()} · processamento local</span><button className="primary-button" type="button" onClick={() => { inputRef.current?.click(); }}><FileText size={18} /> Escolher PDF</button><input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => selectFile(event.target.files?.[0] || null)} /></div> : <div className="selected-files"><div className="selected-file-row"><FileText size={17} /><span><strong>{file.name}</strong><small>{humanSize(file.size)} · {pageCount} página(s)</small></span><button type="button" aria-label="Remover arquivo" onClick={clearFile}><Trash2 size={15} /></button></div></div>}
    {guidance && guidance.tier !== "standard" ? <div className="large-file-notice" role="status"><FileText size={16} /><span><strong>Arquivo grande</strong><small>{guidance.message} A geração é feita sem enviar o documento.</small></span></div> : null}
    {status === "loading" ? <div className="status-message processing" role="status"><LoaderCircle className="spin" size={18} /> <span>{message}</span></div> : null}
    {file && pageCount ? <>
      <div className="print-center-options options-grid">
        <label><span>Finalidade</span><select value={mode} onChange={(event) => setMode(event.target.value as PrintMode)}>{Object.entries(MODE_COPY).map(([value, copy]) => <option value={value} key={value}>{copy.label}</option>)}</select><small>{MODE_COPY[mode].description}</small></label>
        <label><span>Papel de saída</span><select value={paper} onChange={(event) => setPaper(event.target.value as PrintPaper)}>{Object.entries(PRINT_PAPERS).map(([value, item]) => <option value={value} key={value}>{item.label}</option>)}</select></label>
        <label><span>Margem (mm)</span><input type="number" min="0" max="40" step="1" value={margin} onChange={(event) => setMargin(event.target.value)} /></label>
        {mode === "nup" ? <label><span>Páginas por folha</span><select value={pagesPerSheet} onChange={(event) => setPagesPerSheet(Number(event.target.value))}>{[2, 4, 6, 9, 16].map((value) => <option value={value} key={value}>{value} páginas</option>)}</select></label> : null}
        {mode === "booklet" ? <label><span>Virada do verso</span><select value={duplexEdge} onChange={(event) => setDuplexEdge(event.target.value as DuplexEdge)}><option value="short">Borda curta</option><option value="long">Borda longa</option></select><small>Confira a opção equivalente na impressora.</small></label> : null}
      </div>
      <div className="print-center-preview" aria-label="Preview do plano de impressão"><div><strong>Preview do plano</strong><span>{plan.length} lado(s) de folha · {mode === "booklet" ? "frente e verso" : "ordem de saída"}</span></div><div className="print-sheet-list">{plan.slice(0, 6).map((sheet) => <article key={`${sheet.sheetNumber}-${sheet.side}`} className="print-sheet"><span>Folha {sheet.sheetNumber} · {sheet.side}</span><div>{sheet.pages.map((page, index) => <span className={page === null ? "blank" : ""} key={`${sheet.sheetNumber}-${sheet.side}-${index}`}>{pageLabel(page)}</span>)}</div></article>)}{plan.length > 6 ? <small>Mais {plan.length - 6} lado(s) na saída final.</small> : null}</div></div>
      {thumbnails.length ? <div className="print-source-thumbnails"><strong>Primeiras páginas do documento</strong><div>{thumbnails.map((thumbnail) => <figure key={thumbnail.page}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbnail.dataUrl} alt={`Miniatura da página ${thumbnail.page}`} />
        <figcaption>Página {thumbnail.page}</figcaption>
      </figure>)}</div></div> : null}
      <button className="process-button" type="button" disabled={Boolean(activeJob)} onClick={() => void process()}>{activeJob ? <><LoaderCircle className="spin" size={19} /> {activeJob.message}</> : <><FileOutput size={19} /> Gerar PDF para impressão</>}</button>
    </> : null}
    {message && status !== "loading" ? <div className={`status-message ${outputUrl ? "success" : "processing"}`} role="status" aria-live="polite">{outputUrl ? <CheckCircle2 size={18} /> : null}<span>{message}</span></div> : null}
    {outputUrl ? <div className="print-output-actions"><button className="primary-button" type="button" onClick={openPrintPdf}><FileOutput size={17} /> Abrir para imprimir</button><a className="secondary-button" href={outputUrl} download={outputName}><Download size={17} /> Baixar PDF</a></div> : null}
    {jobs.length ? <div className="local-job-queue" aria-label="Fila local"><div><strong>Fila local</strong><button className="text-button" type="button" onClick={clearFinished}>Limpar concluídos</button></div>{jobs.map((job) => <div className="local-job-row" key={job.id}><span><strong>{job.label}</strong><small>{job.message}</small></span><span>{job.status === "running" || job.status === "queued" ? `${job.progress}%` : job.status === "success" ? "Concluído" : job.status === "error" ? <button className="text-button" type="button" onClick={() => void retry(job.id)}><RotateCw size={14} /> Tentar novamente</button> : "Cancelado"}</span>{job.status === "running" || job.status === "queued" ? <button type="button" className="icon-button" aria-label="Cancelar operação" onClick={() => cancel(job.id)}><X size={15} /></button> : null}</div>)}</div> : null}
  </section>;
}
