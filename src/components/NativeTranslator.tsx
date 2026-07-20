"use client";

import { useEffect } from "react";
import { toolTranslations } from "@/lib/i18n-content";
import { navigationGroups } from "@/lib/navigation";
import { tools } from "@/lib/tools";
import { useLanguage } from "@/lib/use-language";

const originalText = new WeakMap<Text, string>();

const common = {
  en: {
    "Grátis, privado e sem cadastro": "Free, private, and no account required",
    "Tudo o que você precisa para": "Everything you need to",
    "trabalhar com PDF.": "work with PDF.",
    "Edite, converta, organize, assine e otimize seus documentos gratuitamente. O processamento acontece no seu navegador.": "Edit, convert, organize, sign, and optimize your documents for free. Processing happens in your browser.",
    "Selecionar arquivo": "Select file",
    "Ver ferramentas": "View tools",
    "Sem conta": "No account",
    "Cache temporário": "Temporary cache",
    "Sem upload ao servidor": "No server upload",
    Editar: "Edit",
    Converter: "Convert",
    Proteger: "Protect",
    Compactar: "Compress",
    "Ferramentas por categoria": "Tools by category",
    "Encontre a função certa sem rolagem infinita": "Find the right function without endless scrolling",
    "Ver todas as ferramentas": "View all tools",
    "Abrir categoria": "Open category",
    "Imagens e PDF": "Images and PDF",
    "Converta imagens em PDF ou extraia páginas como JPG e PNG.": "Convert images into PDF or export pages as JPG and PNG.",
    "Abrir ferramentas": "Open tools",
    "Mais usadas": "Most used",
    "Acesso rápido às funções mais procuradas": "Quick access to the most requested functions",
    "Ver todas": "View all",
    "Sequências sugeridas": "Suggested sequences",
    "Atalhos para continuar o trabalho em ferramentas relacionadas": "Shortcuts to continue work in related tools",
    "Abrir catálogo": "Open catalog",
    "etapas sugeridas": "suggested steps",
    "Seus arquivos ficam seguros.": "Your files stay safe.",
    "O processamento acontece localmente. O cache temporário ajuda a recuperar uma tarefa interrompida e expira automaticamente.": "Processing happens locally. Temporary cache helps recover interrupted tasks and expires automatically.",
    "100% local": "100% local",
    "Processamento no navegador": "Browser processing",
    "Não armazenamos": "We do not store",
    "Arquivos não são enviados": "Files are not uploaded",
    Privacidade: "Privacy",
    "Dados permanecem no dispositivo": "Data remains on your device",
    "Ferramentas PDF": "PDF tools",
    "Ferramenta pronta": "Ready tool",
    "Sessão temporária": "Temporary session",
    "Como usar": "How to use",
    "Ajuste as opções necessárias.": "Adjust the required options.",
    "Processe e baixe o resultado.": "Process and download the result.",
    "O arquivo permanece no dispositivo e pode ser recuperado temporariamente pelo cache local.": "The file stays on your device and can be temporarily recovered from local cache.",
    "Sequência sugerida": "Suggested sequence",
    "Ferramentas relacionadas": "Related tools",
    "Sobre a ferramenta": "About this tool",
    "sem instalar programa": "without installing software",
    "Antes de processar": "Before processing",
    "Continue trabalhando": "Keep working",
    "Outras ferramentas": "Other tools",
    "Editor visual": "Visual editor",
    "Como o editor de PDF funciona": "How the PDF editor works",
    "Limitações importantes": "Important limitations",
    "Adicionar texto": "Add text",
    "Adicionar imagem": "Add image",
    "Selecionar PDF": "Select PDF",
    "Início": "Home",
    Ferramentas: "Tools",
    Categorias: "Categories",
    "Sem cadastro": "No sign-up",
    "Processamento local": "Local processing",
    "Download imediato": "Instant download",
    "Ferramentas da categoria": "Category tools",
    ferramentas: "tools",
    "Selecione o arquivo": "Select the file",
    "Escolha o PDF armazenado no seu dispositivo.": "Choose the PDF stored on your device.",
    "Faça os ajustes": "Make adjustments",
    "Configure a operação diretamente no navegador.": "Configure the operation directly in the browser.",
    "Baixe o resultado": "Download the result",
    "Salve o arquivo processado imediatamente.": "Save the processed file immediately.",
    "Processamento 100% local": "100% local processing",
    "Seus documentos são processados no navegador. Nada é enviado aos nossos servidores.": "Your documents are processed in the browser. Nothing is sent to our servers.",
    "Não armazenamos arquivos": "We do not store files",
    "Privacidade garantida": "Privacy protected",
    "Cache com expiração": "Expiring cache",
    Atendimento: "Support",
    "Fale com o LIM PDF": "Talk to LIM PDF",
    "Relate uma falha, sugira uma função ou encaminhe uma questão de privacidade.": "Report an issue, suggest a feature, or send a privacy question.",
    "Antes de enviar": "Before sending",
    "Não anexe documentos pessoais ou confidenciais.": "Do not attach personal or confidential documents.",
    "Informe navegador, aparelho e ferramenta utilizada.": "Tell us the browser, device, and tool used.",
    "Descreva a mensagem de erro exibida.": "Describe the error message shown.",
    Nome: "Name",
    "E-mail": "Email",
    Assunto: "Subject",
    Mensagem: "Message",
    "Enviar mensagem": "Send message",
    "Sugestões": "Suggestions",
    "Página não encontrada": "Page not found",
    "O endereço pode ter mudado ou a ferramenta ainda não está disponível.": "The address may have changed or the tool is not available yet.",
  },
  es: {
    "Grátis, privado e sem cadastro": "Gratis, privado y sin registro",
    "Tudo o que você precisa para": "Todo lo que necesitas para",
    "trabalhar com PDF.": "trabajar con PDF.",
    "Edite, converta, organize, assine e otimize seus documentos gratuitamente. O processamento acontece no seu navegador.": "Edita, convierte, organiza, firma y optimiza tus documentos gratis. El procesamiento ocurre en tu navegador.",
    "Selecionar arquivo": "Seleccionar archivo",
    "Ver ferramentas": "Ver herramientas",
    "Sem conta": "Sin cuenta",
    "Cache temporário": "Caché temporal",
    "Sem upload ao servidor": "Sin subida al servidor",
    Editar: "Editar",
    Converter: "Convertir",
    Proteger: "Proteger",
    Compactar: "Comprimir",
    "Ferramentas por categoria": "Herramientas por categoría",
    "Encontre a função certa sem rolagem infinita": "Encuentra la función correcta sin desplazarte sin fin",
    "Ver todas as ferramentas": "Ver todas las herramientas",
    "Abrir categoria": "Abrir categoría",
    "Imagens e PDF": "Imágenes y PDF",
    "Converta imagens em PDF ou extraia páginas como JPG e PNG.": "Convierte imágenes en PDF o exporta páginas como JPG y PNG.",
    "Abrir ferramentas": "Abrir herramientas",
    "Mais usadas": "Más usadas",
    "Acesso rápido às funções mais procuradas": "Acceso rápido a las funciones más buscadas",
    "Ver todas": "Ver todas",
    "Sequências sugeridas": "Secuencias sugeridas",
    "Atalhos para continuar o trabalho em ferramentas relacionadas": "Atajos para continuar en herramientas relacionadas",
    "Abrir catálogo": "Abrir catálogo",
    "etapas sugeridas": "pasos sugeridos",
    "Seus arquivos ficam seguros.": "Tus archivos permanecen seguros.",
    "O processamento acontece localmente. O cache temporário ajuda a recuperar uma tarefa interrompida e expira automaticamente.": "El procesamiento ocurre localmente. La caché temporal ayuda a recuperar tareas interrumpidas y expira automáticamente.",
    "100% local": "100% local",
    "Processamento no navegador": "Procesamiento en el navegador",
    "Não armazenamos": "No almacenamos",
    "Arquivos não são enviados": "Los archivos no se envían",
    Privacidade: "Privacidad",
    "Dados permanecem no dispositivo": "Los datos permanecen en el dispositivo",
    "Ferramentas PDF": "Herramientas PDF",
    "Ferramenta pronta": "Herramienta lista",
    "Sessão temporária": "Sesión temporal",
    "Como usar": "Cómo usar",
    "Ajuste as opções necessárias.": "Ajusta las opciones necesarias.",
    "Processe e baixe o resultado.": "Procesa y descarga el resultado.",
    "O arquivo permanece no dispositivo e pode ser recuperado temporariamente pelo cache local.": "El archivo permanece en el dispositivo y puede recuperarse temporalmente desde la caché local.",
    "Sequência sugerida": "Secuencia sugerida",
    "Ferramentas relacionadas": "Herramientas relacionadas",
    "Sobre a ferramenta": "Sobre la herramienta",
    "sem instalar programa": "sin instalar programas",
    "Antes de processar": "Antes de procesar",
    "Continue trabalhando": "Sigue trabajando",
    "Outras ferramentas": "Otras herramientas",
    "Editor visual": "Editor visual",
    "Como o editor de PDF funciona": "Cómo funciona el editor de PDF",
    "Limitações importantes": "Limitaciones importantes",
    "Adicionar texto": "Añadir texto",
    "Adicionar imagem": "Añadir imagen",
    "Selecionar PDF": "Seleccionar PDF",
    "Início": "Inicio",
    Ferramentas: "Herramientas",
    Categorias: "Categorías",
    "Sem cadastro": "Sin registro",
    "Processamento local": "Procesamiento local",
    "Download imediato": "Descarga inmediata",
    "Ferramentas da categoria": "Herramientas de la categoría",
    ferramentas: "herramientas",
    "Selecione o arquivo": "Selecciona el archivo",
    "Escolha o PDF armazenado no seu dispositivo.": "Elige el PDF guardado en tu dispositivo.",
    "Faça os ajustes": "Haz los ajustes",
    "Configure a operação diretamente no navegador.": "Configura la operación directamente en el navegador.",
    "Baixe o resultado": "Descarga el resultado",
    "Salve o arquivo processado imediatamente.": "Guarda el archivo procesado inmediatamente.",
    "Processamento 100% local": "Procesamiento 100% local",
    "Seus documentos são processados no navegador. Nada é enviado aos nossos servidores.": "Tus documentos se procesan en el navegador. Nada se envía a nuestros servidores.",
    "Não armazenamos arquivos": "No almacenamos archivos",
    "Privacidade garantida": "Privacidad protegida",
    "Cache com expiração": "Caché con expiración",
    Atendimento: "Atención",
    "Fale com o LIM PDF": "Habla con LIM PDF",
    "Relate uma falha, sugira uma função ou encaminhe uma questão de privacidade.": "Reporta un fallo, sugiere una función o envía una consulta de privacidad.",
    "Antes de enviar": "Antes de enviar",
    "Não anexe documentos pessoais ou confidenciais.": "No adjuntes documentos personales o confidenciales.",
    "Informe navegador, aparelho e ferramenta utilizada.": "Indica navegador, dispositivo y herramienta utilizada.",
    "Descreva a mensagem de erro exibida.": "Describe el mensaje de error mostrado.",
    Nome: "Nombre",
    "E-mail": "Correo electrónico",
    Assunto: "Asunto",
    Mensagem: "Mensaje",
    "Enviar mensagem": "Enviar mensaje",
    "Sugestões": "Sugerencias",
    "Página não encontrada": "Página no encontrada",
    "O endereço pode ter mudado ou a ferramenta ainda não está disponível.": "La dirección puede haber cambiado o la herramienta aún no está disponible.",
  },
} as const;

function buildDictionary(language: "en" | "es") {
  const dictionary: Record<string, string> = { ...common[language] };
  const translations = toolTranslations[language] || {};
  for (const tool of tools) {
    const translated = translations[tool.slug];
    if (translated) {
      dictionary[tool.name] = translated.name;
      dictionary[tool.shortDescription] = translated.shortDescription;
      dictionary[`${tool.name} sem instalar programa`] = language === "en" ? `${translated.name} without installing software` : `${translated.name} sin instalar programas`;
    }
  }
  const groupMap = language === "en"
    ? {
        "Organizar PDF": "Organize PDF",
        "Editar PDF": "Edit PDF",
        "Converter PDF": "Convert PDF",
        "Formulários PDF": "PDF forms",
        "Assinar PDF": "Sign PDF",
        "Segurança PDF": "PDF security",
        "Otimizar PDF": "Optimize PDF",
      }
    : {
        "Organizar PDF": "Organizar PDF",
        "Editar PDF": "Editar PDF",
        "Converter PDF": "Convertir PDF",
        "Formulários PDF": "Formularios PDF",
        "Assinar PDF": "Firmar PDF",
        "Segurança PDF": "Seguridad PDF",
        "Otimizar PDF": "Optimizar PDF",
      };
  for (const group of navigationGroups) {
    dictionary[group.title] = groupMap[group.title as keyof typeof groupMap] || group.title;
    dictionary[`Ferramentas para ${group.title.toLowerCase()}`] = language === "en" ? `Tools for ${dictionary[group.title].toLowerCase()}` : `Herramientas para ${dictionary[group.title].toLowerCase()}`;
  }
  return dictionary;
}

function replaceKeepingWhitespace(value: string, translated: string) {
  const prefix = value.match(/^\s*/)?.[0] || "";
  const suffix = value.match(/\s*$/)?.[0] || "";
  return `${prefix}${translated}${suffix}`;
}

function translateTree(language: "pt-BR" | "en" | "es") {
  const dictionary = language === "pt-BR" ? {} : buildDictionary(language);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "NOSCRIPT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode() as Text | null;
  while (node) {
    if (!originalText.has(node)) originalText.set(node, node.textContent || "");
    const source = originalText.get(node) || "";
    const translated = dictionary[source.trim()];
    node.textContent = language === "pt-BR"
      ? source
      : translated
        ? replaceKeepingWhitespace(source, translated)
        : node.textContent;
    node = walker.nextNode() as Text | null;
  }

  document.querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label]").forEach((element) => {
    for (const attr of ["placeholder", "title", "aria-label"]) {
      const current = element.getAttribute(attr);
      if (!current) continue;
      const key = `limpdfOriginal${attr.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())}`;
      const dataset = element.dataset as Record<string, string | undefined>;
      if (!dataset[key]) dataset[key] = current;
      const source = dataset[key] || current;
      const translated = dictionary[source.trim()];
      element.setAttribute(attr, language === "pt-BR" ? source : translated || current);
    }
  });
}

export function NativeTranslator() {
  const language = useLanguage();

  useEffect(() => {
    translateTree(language);
    const observer = new MutationObserver(() => translateTree(language));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
