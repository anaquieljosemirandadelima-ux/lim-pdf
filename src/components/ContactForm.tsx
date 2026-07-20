"use client";

import { useState } from "react";
import { CheckCircle2, Clipboard, LoaderCircle, Send } from "lucide-react";

type FormState = { name: string; email: string; subject: string; message: string; website: string };
const initialState: FormState = { name: "", email: "", subject: "Falha em uma ferramenta", message: "", website: "" };

export function ContactForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "unavailable" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/contato", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      if (response.ok) { setStatus("sent"); setForm(initialState); return; }
      if (response.status === 503) { setStatus("unavailable"); return; }
      setStatus("error");
    } catch { setStatus("error"); }
  }

  async function copyMessage() {
    const text = `Nome: ${form.name}\nE-mail: ${form.email}\nAssunto: ${form.subject}\n\n${form.message}`;
    await navigator.clipboard.writeText(text);
  }

  return <form className="contact-form" onSubmit={submit}><div className="form-row"><label><span>Nome</span><input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" /></label><label><span>E-mail</span><input required type="email" maxLength={160} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label></div><label><span>Assunto</span><select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}><option>Falha em uma ferramenta</option><option>Sugestão de nova função</option><option>Privacidade e dados pessoais</option><option>Segurança</option><option>Direitos autorais ou abuso</option><option>Outro assunto</option></select></label><label><span>Mensagem</span><textarea required minLength={20} maxLength={3000} rows={8} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Descreva o que aconteceu. Não inclua documentos ou informações sensíveis." /></label><label className="honeypot" aria-hidden="true"><span>Website</span><input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label><button className="primary-button contact-submit" disabled={status === "sending"}>{status === "sending" ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />} Enviar mensagem</button>{status === "sent" ? <p className="form-success"><CheckCircle2 size={18} /> Mensagem enviada com sucesso.</p> : null}{status === "unavailable" ? <div className="form-warning"><p>O canal automático ainda precisa da credencial de atendimento. Copie a mensagem para não perder o conteúdo.</p><button type="button" className="secondary-button" onClick={copyMessage}><Clipboard size={16} /> Copiar mensagem</button></div> : null}{status === "error" ? <p className="form-error">Não foi possível enviar. Revise os dados e tente novamente.</p> : null}</form>;
}
