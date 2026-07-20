import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LucideClientIcon } from "@/components/LucideClientIcon";
import { AdSlot } from "@/components/AdSlot";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ToolCard } from "@/components/ToolCard";
import { getGroupTools, navigationGroupBySlug, navigationGroups } from "@/lib/navigation";

interface CategoryPageProps { params: Promise<{ slug: string }> }

export function generateStaticParams() { return navigationGroups.map((group) => ({ slug: group.slug })); }

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const group = navigationGroupBySlug.get(slug);
  if (!group) return {};
  return { title: `${group.title} online e grátis`, description: `${group.description} Use o LIM PDF sem cadastro e com processamento no navegador.`, alternates: { canonical: `/categorias/${group.slug}` } };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const group = navigationGroupBySlug.get(slug);
  if (!group) notFound();
  const groupTools = getGroupTools(group);
  const relatedGroups = navigationGroups.filter((item) => item.slug !== group.slug).slice(0, 3);

  return (
    <>
      <section className={`category-page-hero category-page-hero-v3 accent-${group.accent}`}>
        <div className="container category-page-hero-grid">
          <div className="category-hero-copy">
            <div className="breadcrumb"><Link href="/">Início</Link><span>/</span><Link href="/ferramentas">Categorias</Link><span>/</span>{group.title}</div>
            <div className="category-title-row"><span className="category-page-icon"><CategoryIcon icon={group.icon} size={30} /></span><div><h1>Ferramentas para <em>{group.title.toLowerCase()}</em></h1><p>{group.description} Tudo sem cadastro e diretamente no navegador.</p></div></div>
            <div className="category-benefits"><span><LucideClientIcon name="CheckCircle2" size={16} /> Sem cadastro</span><span><LucideClientIcon name="CheckCircle2" size={16} /> Processamento local</span><span><LucideClientIcon name="CheckCircle2" size={16} /> Download imediato</span></div>
          </div>
          <div className="category-editor-art" aria-hidden="true"><div className="mini-editor-window"><div><i /><i /><i /></div><section><b>Aa</b><span><LucideClientIcon name="FileImage" size={34} /></span><em>LIM</em></section></div><span className="category-art-chip chip-a">Editar</span><span className="category-art-chip chip-b">Converter</span><span className="category-art-chip chip-c">Proteger</span></div>
        </div>
      </section>

      <section className="category-content-v3">
        <div className="container category-content-grid">
          <main>
            <AdSlot placement="catalog-inline" format="horizontal" />
            <div className="category-tools-heading"><div><span>Ferramentas da categoria</span><h2>{group.title}</h2></div><strong>{groupTools.length} ferramentas</strong></div>
            <div className="tool-grid category-tool-grid category-tool-grid-v3">{groupTools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div>

            <section className="category-how-v3">
              <h2>Como funciona</h2>
              <div><article><span>1</span><LucideClientIcon name="UploadCloud" size={27} /><div><strong>Selecione o arquivo</strong><p>Escolha o PDF armazenado no seu dispositivo.</p></div></article><article><span>2</span><CategoryIcon icon={group.icon} size={27} /><div><strong>Faça os ajustes</strong><p>Configure a operação diretamente no navegador.</p></div></article><article><span>3</span><LucideClientIcon name="ArrowRight" size={27} /><div><strong>Baixe o resultado</strong><p>Salve o arquivo processado imediatamente.</p></div></article></div>
            </section>

            <section className="category-related-v3"><h2>Outras categorias</h2><div>{relatedGroups.map((item) => <Link key={item.slug} href={`/categorias/${item.slug}`}><span><CategoryIcon icon={item.icon} /></span><div><strong>{item.title}</strong><small>{item.description}</small></div><LucideClientIcon name="ArrowRight" size={16} /></Link>)}</div></section>
          </main>
          <aside className="category-sidebar-v3">
            <AdSlot placement="catalog-side" format="rectangle" />
            <div className="local-processing-card"><span><LucideClientIcon name="ShieldCheck" size={23} /></span><h2>Processamento 100% local</h2><p>Seus documentos são processados no navegador. Nada é enviado aos nossos servidores.</p><ul><li><LucideClientIcon name="CheckCircle2" size={17} /> Não armazenamos arquivos</li><li><LucideClientIcon name="CheckCircle2" size={17} /> Privacidade garantida</li><li><LucideClientIcon name="CheckCircle2" size={17} /> Cache com expiração</li></ul></div>
          </aside>
        </div>
      </section>
    </>
  );
}

