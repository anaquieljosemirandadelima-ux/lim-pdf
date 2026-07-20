"use client";

import Link from "next/link";
import {
  ChevronDown,
  FileStack,
  Grid2X2,
  Languages,
  Menu,
  PencilLine,
  Repeat2,
  ShieldCheck,
  Signature,
  SlidersHorizontal,
  TableProperties,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HeaderToolSearch } from "@/components/HeaderToolSearch";
import { Logo } from "@/components/Logo";
import { DEFAULT_LANGUAGE, getLanguage, normalizeLanguage, supportedLanguages, type LanguageCode } from "@/lib/i18n";
import { getGroupTools, navigationGroups } from "@/lib/navigation";
import { tools } from "@/lib/tools";

const iconMap = {
  organize: Grid2X2,
  edit: PencilLine,
  convert: Repeat2,
  forms: TableProperties,
  sign: Signature,
  security: ShieldCheck,
  optimize: SlidersHorizontal,
};

type MenuDefinition = {
  id: string;
  label: string;
  href: string;
  groupSlugs: string[];
  featured?: { title: string; description: string; href: string };
};

type HeaderText = {
  tools: string;
  allTools: string;
  organizeMerge: string;
  editSign: string;
  convert: string;
  optimizeProtect: string;
  guides: string;
  guidesTutorials: string;
  selectFile: string;
  languages: string;
  featured: string;
  openNow: string;
  viewComplete: string;
  groupCount: string;
  allTitle: string;
  allDescription: string;
  organizeTitle: string;
  organizeDescription: string;
  editTitle: string;
  editDescription: string;
  convertTitle: string;
  convertDescription: string;
  optimizeTitle: string;
  optimizeDescription: string;
};

const headerTranslations: Record<LanguageCode, HeaderText> = {
  "pt-BR": {
    tools: "Ferramentas",
    allTools: "Todas as ferramentas",
    organizeMerge: "Organizar e juntar",
    editSign: "Editar e assinar",
    convert: "Converter",
    optimizeProtect: "Otimizar e proteger",
    guides: "Guias",
    guidesTutorials: "Guias e tutoriais",
    selectFile: "Selecionar arquivo",
    languages: "Idiomas",
    featured: "Destaque",
    openNow: "Abrir agora",
    viewComplete: "Ver pagina completa de",
    groupCount: "grupo(s)",
    allTitle: "Todas as ferramentas",
    allDescription: "Explore as 31 funcoes disponiveis no LIM PDF.",
    organizeTitle: "Pacote de organizacao",
    organizeDescription: "Junte, divida, gire, reordene e alterne documentos em um fluxo so.",
    editTitle: "Editar e finalizar PDF",
    editDescription: "Edite textos, preencha campos, assine e fixe o documento final.",
    convertTitle: "Converter arquivos",
    convertDescription: "Transforme PDF em imagem, texto ou crie PDF a partir de imagens.",
    optimizeTitle: "Preparar para envio",
    optimizeDescription: "Compacte, limpe metadados e ajuste o documento antes de compartilhar.",
  },
  en: {
    tools: "Tools",
    allTools: "All tools",
    organizeMerge: "Organize and merge",
    editSign: "Edit and sign",
    convert: "Convert",
    optimizeProtect: "Optimize and protect",
    guides: "Guides",
    guidesTutorials: "Guides and tutorials",
    selectFile: "Select file",
    languages: "Languages",
    featured: "Featured",
    openNow: "Open now",
    viewComplete: "View full page for",
    groupCount: "group(s)",
    allTitle: "All PDF tools",
    allDescription: "Explore the 31 tools available in LIM PDF.",
    organizeTitle: "Organization package",
    organizeDescription: "Merge, split, rotate, reorder, and alternate documents in one flow.",
    editTitle: "Edit and finalize PDF",
    editDescription: "Edit text, fill fields, sign, and flatten the final document.",
    convertTitle: "Convert files",
    convertDescription: "Turn PDFs into images or text, or create PDFs from images.",
    optimizeTitle: "Prepare for sharing",
    optimizeDescription: "Compress, clean metadata, and adjust the document before sharing.",
  },
  es: {
    tools: "Herramientas",
    allTools: "Todas las herramientas",
    organizeMerge: "Organizar y unir",
    editSign: "Editar y firmar",
    convert: "Convertir",
    optimizeProtect: "Optimizar y proteger",
    guides: "Guias",
    guidesTutorials: "Guias y tutoriales",
    selectFile: "Seleccionar archivo",
    languages: "Idiomas",
    featured: "Destacado",
    openNow: "Abrir ahora",
    viewComplete: "Ver pagina completa de",
    groupCount: "grupo(s)",
    allTitle: "Todas las herramientas",
    allDescription: "Explora las 31 funciones disponibles en LIM PDF.",
    organizeTitle: "Paquete de organizacion",
    organizeDescription: "Une, divide, gira, reordena y alterna documentos en un solo flujo.",
    editTitle: "Editar y finalizar PDF",
    editDescription: "Edita textos, rellena campos, firma y fija el documento final.",
    convertTitle: "Convertir archivos",
    convertDescription: "Convierte PDF en imagen o texto, o crea PDF desde imagenes.",
    optimizeTitle: "Preparar para enviar",
    optimizeDescription: "Comprime, limpia metadatos y ajusta el documento antes de compartir.",
  },
  fr: {
    tools: "Outils",
    allTools: "Tous les outils",
    organizeMerge: "Organiser et fusionner",
    editSign: "Modifier et signer",
    convert: "Convertir",
    optimizeProtect: "Optimiser et proteger",
    guides: "Guides",
    guidesTutorials: "Guides et tutoriels",
    selectFile: "Choisir un fichier",
    languages: "Langues",
    featured: "En vedette",
    openNow: "Ouvrir",
    viewComplete: "Voir la page complete de",
    groupCount: "groupe(s)",
    allTitle: "Tous les outils PDF",
    allDescription: "Explorez les 31 fonctions disponibles dans LIM PDF.",
    organizeTitle: "Pack organisation",
    organizeDescription: "Fusionnez, divisez, pivotez et reorganisez vos documents.",
    editTitle: "Modifier et finaliser PDF",
    editDescription: "Modifiez le texte, remplissez, signez et finalisez le document.",
    convertTitle: "Convertir des fichiers",
    convertDescription: "Transformez des PDF en image ou texte, ou creez des PDF depuis des images.",
    optimizeTitle: "Preparer pour l'envoi",
    optimizeDescription: "Compressez, nettoyez les metadonnees et ajustez le document.",
  },
  de: {
    tools: "Werkzeuge",
    allTools: "Alle Werkzeuge",
    organizeMerge: "Organisieren und verbinden",
    editSign: "Bearbeiten und signieren",
    convert: "Konvertieren",
    optimizeProtect: "Optimieren und schutzen",
    guides: "Anleitungen",
    guidesTutorials: "Anleitungen und Tutorials",
    selectFile: "Datei auswahlen",
    languages: "Sprachen",
    featured: "Empfohlen",
    openNow: "Jetzt offnen",
    viewComplete: "Vollstandige Seite ansehen fur",
    groupCount: "Gruppe(n)",
    allTitle: "Alle PDF-Werkzeuge",
    allDescription: "Entdecken Sie die 31 Funktionen von LIM PDF.",
    organizeTitle: "Organisationspaket",
    organizeDescription: "Verbinden, teilen, drehen und ordnen Sie Dokumente in einem Ablauf.",
    editTitle: "PDF bearbeiten und abschliessen",
    editDescription: "Text bearbeiten, Felder ausfullen, signieren und finalisieren.",
    convertTitle: "Dateien konvertieren",
    convertDescription: "PDFs in Bilder oder Text umwandeln oder PDFs aus Bildern erstellen.",
    optimizeTitle: "Zum Teilen vorbereiten",
    optimizeDescription: "Komprimieren, Metadaten bereinigen und Dokument anpassen.",
  },
  it: {
    tools: "Strumenti",
    allTools: "Tutti gli strumenti",
    organizeMerge: "Organizza e unisci",
    editSign: "Modifica e firma",
    convert: "Converti",
    optimizeProtect: "Ottimizza e proteggi",
    guides: "Guide",
    guidesTutorials: "Guide e tutorial",
    selectFile: "Seleziona file",
    languages: "Lingue",
    featured: "In evidenza",
    openNow: "Apri ora",
    viewComplete: "Vedi pagina completa di",
    groupCount: "gruppo/i",
    allTitle: "Tutti gli strumenti PDF",
    allDescription: "Esplora le 31 funzioni disponibili in LIM PDF.",
    organizeTitle: "Pacchetto organizzazione",
    organizeDescription: "Unisci, dividi, ruota e riordina documenti in un solo flusso.",
    editTitle: "Modifica e finalizza PDF",
    editDescription: "Modifica testi, compila campi, firma e finalizza il documento.",
    convertTitle: "Converti file",
    convertDescription: "Trasforma PDF in immagini o testo, o crea PDF da immagini.",
    optimizeTitle: "Prepara per l'invio",
    optimizeDescription: "Comprimi, pulisci metadati e regola il documento.",
  },
  "zh-CN": {
    tools: "工具",
    allTools: "全部工具",
    organizeMerge: "整理与合并",
    editSign: "编辑与签名",
    convert: "转换",
    optimizeProtect: "优化与保护",
    guides: "指南",
    guidesTutorials: "指南和教程",
    selectFile: "选择文件",
    languages: "语言",
    featured: "推荐",
    openNow: "立即打开",
    viewComplete: "查看完整页面",
    groupCount: "组",
    allTitle: "所有 PDF 工具",
    allDescription: "探索 LIM PDF 提供的 31 个功能。",
    organizeTitle: "整理工具包",
    organizeDescription: "在一个流程中合并、拆分、旋转和重新排序文档。",
    editTitle: "编辑并完成 PDF",
    editDescription: "编辑文本、填写字段、签名并完成最终文档。",
    convertTitle: "转换文件",
    convertDescription: "将 PDF 转为图像或文本，或从图像创建 PDF。",
    optimizeTitle: "准备分享",
    optimizeDescription: "压缩、清理元数据并调整文档。",
  },
  ja: {
    tools: "ツール",
    allTools: "すべてのツール",
    organizeMerge: "整理と結合",
    editSign: "編集と署名",
    convert: "変換",
    optimizeProtect: "最適化と保護",
    guides: "ガイド",
    guidesTutorials: "ガイドとチュートリアル",
    selectFile: "ファイルを選択",
    languages: "言語",
    featured: "おすすめ",
    openNow: "今すぐ開く",
    viewComplete: "完全なページを見る",
    groupCount: "グループ",
    allTitle: "すべての PDF ツール",
    allDescription: "LIM PDF の 31 個の機能を確認できます。",
    organizeTitle: "整理パッケージ",
    organizeDescription: "文書の結合、分割、回転、並べ替えを一つの流れで行います。",
    editTitle: "PDF を編集して完成",
    editDescription: "テキスト編集、入力、署名、最終化ができます。",
    convertTitle: "ファイル変換",
    convertDescription: "PDF を画像やテキストへ変換し、画像から PDF を作成します。",
    optimizeTitle: "共有前の準備",
    optimizeDescription: "圧縮、メタデータ削除、文書調整を行います。",
  },
  ko: {
    tools: "도구",
    allTools: "모든 도구",
    organizeMerge: "정리 및 병합",
    editSign: "편집 및 서명",
    convert: "변환",
    optimizeProtect: "최적화 및 보호",
    guides: "가이드",
    guidesTutorials: "가이드와 튜토리얼",
    selectFile: "파일 선택",
    languages: "언어",
    featured: "추천",
    openNow: "지금 열기",
    viewComplete: "전체 페이지 보기",
    groupCount: "그룹",
    allTitle: "모든 PDF 도구",
    allDescription: "LIM PDF에서 제공하는 31개 기능을 살펴보세요.",
    organizeTitle: "정리 패키지",
    organizeDescription: "문서를 병합, 분할, 회전, 재정렬합니다.",
    editTitle: "PDF 편집 및 완료",
    editDescription: "텍스트를 편집하고 필드를 채우고 서명합니다.",
    convertTitle: "파일 변환",
    convertDescription: "PDF를 이미지나 텍스트로 변환하거나 이미지에서 PDF를 만듭니다.",
    optimizeTitle: "공유 준비",
    optimizeDescription: "압축, 메타데이터 정리, 문서 조정을 수행합니다.",
  },
  ar: {
    tools: "الأدوات",
    allTools: "كل الأدوات",
    organizeMerge: "تنظيم ودمج",
    editSign: "تعديل وتوقيع",
    convert: "تحويل",
    optimizeProtect: "تحسين وحماية",
    guides: "الأدلة",
    guidesTutorials: "أدلة وشروحات",
    selectFile: "اختر ملفا",
    languages: "اللغات",
    featured: "مميز",
    openNow: "افتح الآن",
    viewComplete: "عرض الصفحة الكاملة",
    groupCount: "مجموعة",
    allTitle: "كل أدوات PDF",
    allDescription: "استكشف 31 وظيفة متاحة في LIM PDF.",
    organizeTitle: "حزمة التنظيم",
    organizeDescription: "ادمج وقسم ودوّر وأعد ترتيب المستندات في مسار واحد.",
    editTitle: "تعديل وإنهاء PDF",
    editDescription: "عدّل النصوص واملأ الحقول ووقّع المستند.",
    convertTitle: "تحويل الملفات",
    convertDescription: "حوّل PDF إلى صور أو نص أو أنشئ PDF من الصور.",
    optimizeTitle: "التحضير للمشاركة",
    optimizeDescription: "اضغط ونظف البيانات الوصفية واضبط المستند.",
  },
  hi: {
    tools: "उपकरण",
    allTools: "सभी उपकरण",
    organizeMerge: "व्यवस्थित और मिलाएं",
    editSign: "संपादित और हस्ताक्षर",
    convert: "बदलें",
    optimizeProtect: "अनुकूलित और सुरक्षित",
    guides: "गाइड",
    guidesTutorials: "गाइड और ट्यूटोरियल",
    selectFile: "फाइल चुनें",
    languages: "भाषाएं",
    featured: "विशेष",
    openNow: "अभी खोलें",
    viewComplete: "पूरा पेज देखें",
    groupCount: "समूह",
    allTitle: "सभी PDF उपकरण",
    allDescription: "LIM PDF में उपलब्ध 31 सुविधाएं देखें।",
    organizeTitle: "संगठन पैकेज",
    organizeDescription: "दस्तावेजों को मिलाएं, बांटें, घुमाएं और क्रम बदलें।",
    editTitle: "PDF संपादित और पूरा करें",
    editDescription: "टेक्स्ट संपादित करें, फील्ड भरें और हस्ताक्षर करें।",
    convertTitle: "फाइल बदलें",
    convertDescription: "PDF को इमेज या टेक्स्ट में बदलें, या इमेज से PDF बनाएं।",
    optimizeTitle: "साझा करने की तैयारी",
    optimizeDescription: "कंप्रेस करें, मेटाडेटा साफ करें और दस्तावेज समायोजित करें।",
  },
  ru: {
    tools: "Инструменты",
    allTools: "Все инструменты",
    organizeMerge: "Организовать и объединить",
    editSign: "Редактировать и подписать",
    convert: "Конвертировать",
    optimizeProtect: "Оптимизировать и защитить",
    guides: "Руководства",
    guidesTutorials: "Руководства и уроки",
    selectFile: "Выбрать файл",
    languages: "Языки",
    featured: "Рекомендуем",
    openNow: "Открыть",
    viewComplete: "Открыть полную страницу",
    groupCount: "группа(ы)",
    allTitle: "Все PDF-инструменты",
    allDescription: "Ознакомьтесь с 31 функцией LIM PDF.",
    organizeTitle: "Пакет организации",
    organizeDescription: "Объединяйте, разделяйте, поворачивайте и меняйте порядок документов.",
    editTitle: "Редактировать и завершить PDF",
    editDescription: "Редактируйте текст, заполняйте поля, подписывайте и завершайте документ.",
    convertTitle: "Конвертация файлов",
    convertDescription: "Преобразуйте PDF в изображения или текст, либо создавайте PDF из изображений.",
    optimizeTitle: "Подготовка к отправке",
    optimizeDescription: "Сжимайте, очищайте метаданные и настраивайте документ.",
  },
};

export function Header() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    return normalizeLanguage(window.localStorage.getItem("limpdf_language") ?? window.navigator.language);
  });
  const headerRef = useRef<HTMLElement>(null);
  const groupMap = useMemo(() => new Map(navigationGroups.map((group) => [group.slug, group])), []);
  const currentLanguage = getLanguage(selectedLanguage);
  const text = headerTranslations[selectedLanguage] ?? headerTranslations[DEFAULT_LANGUAGE];
  const localizedMenus = useMemo<MenuDefinition[]>(() => [
    { id: "all", label: text.tools, href: "/ferramentas", groupSlugs: navigationGroups.map((group) => group.slug), featured: { title: text.allTitle, description: text.allDescription, href: "/ferramentas" } },
    { id: "organize", label: text.organizeMerge, href: "/categorias/organizar", groupSlugs: ["organizar"], featured: { title: text.organizeTitle, description: text.organizeDescription, href: "/ferramentas/juntar-pdf" } },
    { id: "edit", label: text.editSign, href: "/categorias/editar", groupSlugs: ["editar", "formularios", "assinar"], featured: { title: text.editTitle, description: text.editDescription, href: "/ferramentas/editar-pdf" } },
    { id: "convert", label: text.convert, href: "/categorias/converter", groupSlugs: ["converter"], featured: { title: text.convertTitle, description: text.convertDescription, href: "/categorias/converter" } },
    { id: "optimize", label: text.optimizeProtect, href: "/categorias/otimizar", groupSlugs: ["otimizar", "seguranca"], featured: { title: text.optimizeTitle, description: text.optimizeDescription, href: "/ferramentas/compactar-pdf" } },
  ], [text]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setActiveMenu(null);
        setLanguageOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setActiveMenu(null); setLanguageOpen(false); setMobileOpen(false); }
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onPointer); window.removeEventListener("keydown", onKey); };
  }, []);

  useEffect(() => {
    const language = getLanguage(selectedLanguage);
    document.documentElement.setAttribute("lang", selectedLanguage);
    document.documentElement.setAttribute("dir", language.dir ?? "ltr");
    window.localStorage.setItem("limpdf_language", selectedLanguage);
    window.dispatchEvent(new CustomEvent("limpdf:languagechange", { detail: { language: selectedLanguage } }));
  }, [selectedLanguage]);

  function selectLanguage(code: LanguageCode) {
    setSelectedLanguage(code);
    setLanguageOpen(false);
    setMobileOpen(false);
  }

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Menu principal">
          {localizedMenus.map((menu) => {
            const groups = menu.groupSlugs.map((slug) => groupMap.get(slug)).filter((group) => group !== undefined);
            return (
              <div className={`nav-group ${activeMenu === menu.id ? "open" : ""}`} key={menu.id} onMouseEnter={() => setActiveMenu(menu.id)} onMouseLeave={() => setActiveMenu(null)}>
                <button className="nav-group-trigger" type="button" aria-expanded={activeMenu === menu.id} onClick={() => setActiveMenu((current) => current === menu.id ? null : menu.id)}>
                  {menu.label} <ChevronDown size={15} />
                </button>
                <div className={`mega-menu ${menu.id === "all" ? "mega-menu-all" : "mega-menu-focused"}`}>
                  <div className="mega-menu-content">
                    {groups.map((group) => {
                      const Icon = iconMap[group.icon];
                      return (
                        <section className={`mega-column accent-${group.accent}`} key={group.slug}>
                          <Link className="mega-column-title" href={`/categorias/${group.slug}`} onClick={() => setActiveMenu(null)}>
                            <span><Icon size={19} /></span><div><strong>{group.title}</strong><small>{group.description}</small></div>
                          </Link>
                          <div className="mega-tool-links">
                            {getGroupTools(group).slice(0, menu.id === "all" ? 4 : 10).map((tool) => (
                              <Link key={tool.slug} href={`/ferramentas/${tool.slug}`} onClick={() => setActiveMenu(null)}><b>{tool.name}</b><small>{tool.shortDescription}</small></Link>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                    {menu.featured ? (
                      <aside className="mega-featured">
                        <span><FileStack size={25} /></span>
                        <div><small>{text.featured}</small><h3>{menu.featured.title}</h3><p>{menu.featured.description}</p></div>
                        <Link href={menu.featured.href} onClick={() => setActiveMenu(null)}>{text.openNow}</Link>
                      </aside>
                    ) : null}
                  </div>
                  <div className="mega-menu-bottom"><Link href={menu.href} onClick={() => setActiveMenu(null)}>{text.viewComplete} {menu.label.toLowerCase()}</Link><span>{groups.length} {text.groupCount}</span></div>
                </div>
              </div>
            );
          })}
          <Link className="nav-simple-link" href="/guias">{text.guides}</Link>
        </nav>

        <div className="header-actions">
          <HeaderToolSearch tools={tools} />
          <div className={`language-menu ${languageOpen ? "open" : ""}`}>
            <button
              className="language-trigger"
              type="button"
              aria-label="Selecionar idioma"
              aria-expanded={languageOpen}
              onClick={() => setLanguageOpen((value) => !value)}
            >
              <Languages size={17} />
              <span>{currentLanguage.shortLabel}</span>
              <ChevronDown size={14} />
            </button>
            <div className="language-options" role="menu">
              {supportedLanguages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selectedLanguage === language.code}
                  className={selectedLanguage === language.code ? "active" : ""}
                  onClick={() => selectLanguage(language.code)}
                >
                  <span>{language.nativeLabel}</span>
                  <small>{language.shortLabel}</small>
                </button>
              ))}
            </div>
          </div>
          <Link className="header-cta" href="/ferramentas/editar-pdf"><UploadCloud size={17} /> {text.selectFile}</Link>
          <button className="mobile-menu" type="button" aria-label="Abrir menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {mobileOpen ? (
        <div className="mobile-nav-panel">
          <div className="container mobile-nav-content">
            <Link href="/ferramentas" onClick={() => setMobileOpen(false)}>{text.allTools}</Link>
            {localizedMenus.slice(1).map((menu) => <Link key={menu.id} href={menu.href} onClick={() => setMobileOpen(false)}>{menu.label}</Link>)}
            <Link href="/guias" onClick={() => setMobileOpen(false)}>{text.guidesTutorials}</Link>
            <div className="mobile-language-list">
              <strong>{text.languages}</strong>
              {supportedLanguages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  aria-pressed={selectedLanguage === language.code}
                  className={selectedLanguage === language.code ? "active" : ""}
                  onClick={() => selectLanguage(language.code)}
                >
                  {language.nativeLabel}
                </button>
              ))}
            </div>
            <Link className="mobile-upload-button" href="/ferramentas/editar-pdf" onClick={() => setMobileOpen(false)}><UploadCloud size={17} /> {text.selectFile}</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
