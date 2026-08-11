import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, rgb } from "pdf-lib";
import { safeBaseName, type FormFieldDraft } from "@/lib/pro-pdf-core";

function ensureAcroForm(pdf: PDFDocument) {
  const name = PDFName.of("AcroForm");
  let acro = pdf.catalog.lookupMaybe(name, PDFDict);
  if (!acro) {
    acro = PDFDict.withContext(pdf.context);
    acro.set(PDFName.of("Fields"), PDFArray.withContext(pdf.context));
    acro.set(PDFName.of("SigFlags"), PDFNumber.of(3));
    pdf.catalog.set(name, pdf.context.register(acro));
  }
  let fields = acro.lookupMaybe(PDFName.of("Fields"), PDFArray);
  if (!fields) {
    fields = PDFArray.withContext(pdf.context);
    acro.set(PDFName.of("Fields"), fields);
  }
  return { acro, fields };
}

function addSignatureField(pdf: PDFDocument, draft: FormFieldDraft) {
  const page = pdf.getPages()[draft.page - 1];
  if (!page) throw new Error(`Página ${draft.page} não existe.`);
  const { acro, fields } = ensureAcroForm(pdf);
  acro.set(PDFName.of("SigFlags"), PDFNumber.of(3));
  const field = PDFDict.withContext(pdf.context);
  field.set(PDFName.of("Type"), PDFName.of("Annot"));
  field.set(PDFName.of("Subtype"), PDFName.of("Widget"));
  field.set(PDFName.of("FT"), PDFName.of("Sig"));
  field.set(PDFName.of("T"), PDFHexString.fromText(draft.name));
  field.set(PDFName.of("Rect"), pdf.context.obj([draft.x, draft.y, draft.x + draft.width, draft.y + draft.height]) as PDFArray);
  field.set(PDFName.of("F"), PDFNumber.of(4));
  field.set(PDFName.of("P"), page.ref);
  const fieldRef = pdf.context.register(field);
  fields.push(fieldRef);
  page.node.addAnnot(fieldRef);
}

export async function createFormPdfAdvanced(file: File, fields: FormFieldDraft[]) {
  if (!fields.length) throw new Error("Adicione pelo menos um campo.");
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const form = pdf.getForm();
  const pages = pdf.getPages();

  for (const draft of fields.filter((field) => field.type !== "signature")) {
    const page = pages[draft.page - 1];
    if (!page) throw new Error(`Página ${draft.page} não existe.`);
    const opts = {
      x: draft.x,
      y: draft.y,
      width: draft.width,
      height: draft.height,
      borderWidth: 1,
      textColor: rgb(.08, .1, .15),
      borderColor: rgb(.65, .68, .74),
      backgroundColor: rgb(1, 1, 1),
    };
    if (draft.type === "text" || draft.type === "date") {
      const field = form.createTextField(draft.name);
      if (draft.type === "date") field.setText("");
      field.addToPage(page, opts);
    }
    if (draft.type === "checkbox") form.createCheckBox(draft.name).addToPage(page, opts);
    if (draft.type === "dropdown") {
      const field = form.createDropdown(draft.name);
      field.addOptions(draft.options?.length ? draft.options : ["Opção 1", "Opção 2"]);
      field.addToPage(page, opts);
    }
    if (draft.type === "list") {
      const field = form.createOptionList(draft.name);
      field.addOptions(draft.options?.length ? draft.options : ["Opção 1", "Opção 2"]);
      field.addToPage(page, opts);
    }
    if (draft.type === "radio") {
      const field = form.createRadioGroup(draft.name);
      const choices = draft.options?.length ? draft.options : ["Sim", "Não"];
      choices.forEach((choice, index) => field.addOptionToPage(choice, page, { ...opts, x: draft.x + index * (draft.width + 12) }));
    }
  }

  for (const draft of fields.filter((field) => field.type === "signature")) addSignatureField(pdf, draft);
  return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-formulario.pdf` };
}
