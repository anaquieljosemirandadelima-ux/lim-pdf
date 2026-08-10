import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 841.89;
const H = 595.28;
const C = {
  deep: rgb(0.031, 0.235, 0.227),
  deep2: rgb(0.018, 0.145, 0.141),
  orange: rgb(0.945, 0.416, 0.263),
  orange2: rgb(1, 0.55, 0.38),
  cream: rgb(0.969, 0.953, 0.918),
  paper: rgb(0.996, 0.992, 0.976),
  mint: rgb(0.866, 0.929, 0.906),
  mint2: rgb(0.71, 0.855, 0.804),
  ink: rgb(0.09, 0.169, 0.165),
  muted: rgb(0.39, 0.47, 0.46),
  line: rgb(0.84, 0.88, 0.86),
  white: rgb(1, 1, 1),
};

type Fonts = { regular: PDFFont; bold: PDFFont; oblique: PDFFont };

function rect(page: PDFPage, x: number, y: number, width: number, height: number, color: RGB, radius = 0, border?: RGB, borderWidth = 0.8) {
  if (radius <= 0) {
    page.drawRectangle({ x, y, width, height, color, borderColor: border, borderWidth: border ? borderWidth : 0 });
    return;
  }
  page.drawSvgPath(
    `M ${x + radius} ${y} H ${x + width - radius} Q ${x + width} ${y} ${x + width} ${y + radius} V ${y + height - radius} Q ${x + width} ${y + height} ${x + width - radius} ${y + height} H ${x + radius} Q ${x} ${y + height} ${x} ${y + height - radius} V ${y + radius} Q ${x} ${y} ${x + radius} ${y} Z`,
    { color, borderColor: border, borderWidth: border ? borderWidth : 0 }
  );
}

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color = C.line, thickness = 1) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });
}

function text(page: PDFPage, value: string, x: number, y: number, size: number, font: PDFFont, color = C.ink, maxWidth?: number, lineHeight = size * 1.22) {
  if (!maxWidth) {
    page.drawText(value, { x, y, size, font, color });
    return y;
  }
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth || !current) current = test;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  lines.forEach((l, i) => page.drawText(l, { x, y: y - i * lineHeight, size, font, color }));
  return y - (lines.length - 1) * lineHeight;
}

function label(page: PDFPage, value: string, x: number, y: number, width: number, font: PDFFont, fill = C.mint, color = C.deep2) {
  rect(page, x, y, width, 22, fill, 11);
  const tw = font.widthOfTextAtSize(value, 8.2);
  page.drawText(value, { x: x + (width - tw) / 2, y: y + 7.2, size: 8.2, font, color });
}

function brand(page: PDFPage, fonts: Fonts, x = 38, y = 536, light = false) {
  const main = light ? C.white : C.deep2;
  page.drawCircle({ x: x + 17, y: y + 13, size: 17, color: C.orange });
  page.drawCircle({ x: x + 20, y: y + 13, size: 9.8, color: light ? C.deep2 : C.paper });
  rect(page, x + 18, y + 10.5, 13, 5, C.orange);
  page.drawText("COLOR", { x: x + 43, y: y + 9, size: 20, font: fonts.bold, color: main });
  page.drawText("CÓPIA", { x: x + 105, y: y + 9, size: 20, font: fonts.bold, color: C.orange });
}

function footer(page: PDFPage, fonts: Fonts, n: number, dark = false) {
  const color = dark ? C.white : C.muted;
  line(page, 38, 28, W - 38, 28, dark ? rgb(0.2, 0.4, 0.39) : C.line, 0.8);
  page.drawText("GUIA DE SOLUÇÕES CORPORATIVAS 2026/2027", { x: 38, y: 13, size: 7.4, font: fonts.bold, color });
  const pn = String(n).padStart(2, "0");
  page.drawText(pn, { x: W - 55, y: 11, size: 10, font: fonts.bold, color: dark ? C.orange2 : C.deep2 });
}

function header(page: PDFPage, fonts: Fonts, eyebrow: string, title: string, subtitle: string, n: number) {
  rect(page, 0, 0, W, H, C.paper);
  brand(page, fonts);
  page.drawText(eyebrow.toUpperCase(), { x: 38, y: 494, size: 8.3, font: fonts.bold, color: C.orange });
  text(page, title, 38, 452, 28, fonts.bold, C.deep2, 500, 30);
  text(page, subtitle, 38, 415, 10.5, fonts.regular, C.muted, 600, 14);
  footer(page, fonts, n);
}

function productCard(page: PDFPage, fonts: Fonts, x: number, y: number, w: number, h: number, title: string, desc: string, tags: string[], accent: RGB, icon: string) {
  rect(page, x, y, w, h, C.white, 13, C.line, 0.7);
  rect(page, x, y + h - 6, w, 6, accent, 3);
  rect(page, x + 15, y + h - 51, 40, 34, C.cream, 9);
  page.drawText(icon, { x: x + 27, y: y + h - 40, size: 13, font: fonts.bold, color: accent });
  text(page, title, x + 66, y + h - 34, 12, fonts.bold, C.deep2, w - 82, 14);
  text(page, desc, x + 16, y + h - 75, 8.7, fonts.regular, C.muted, w - 32, 11.5);
  let tx = x + 16;
  const ty = y + 14;
  tags.slice(0, 3).forEach((tag) => {
    const tw = Math.min(fonts.bold.widthOfTextAtSize(tag, 7.2) + 18, w - 32);
    if (tx + tw > x + w - 15) return;
    rect(page, tx, ty, tw, 18, C.mint, 9);
    page.drawText(tag, { x: tx + 9, y: ty + 6.1, size: 7.2, font: fonts.bold, color: C.deep2 });
    tx += tw + 6;
  });
}


function drawBottle(page: PDFPage, x: number, y: number, s = 1) {
  rect(page, x + 12*s, y, 54*s, 112*s, C.deep, 17*s);
  rect(page, x + 23*s, y + 106*s, 32*s, 20*s, C.deep2, 5*s);
  rect(page, x + 20*s, y + 38*s, 38*s, 30*s, C.orange, 7*s);
  page.drawCircle({ x: x + 39*s, y: y + 53*s, size: 8*s, color: C.white });
}

function drawNotebook(page: PDFPage, x: number, y: number, s = 1) {
  rect(page, x, y, 82*s, 106*s, C.deep2, 8*s);
  rect(page, x + 9*s, y + 8*s, 65*s, 90*s, C.cream, 5*s);
  for (let i=0;i<6;i++) page.drawCircle({ x: x + 4*s, y: y + (16+i*15)*s, size: 3*s, color: C.orange });
  rect(page, x + 19*s, y + 55*s, 45*s, 22*s, C.orange, 5*s);
}

function drawBag(page: PDFPage, x: number, y: number, s = 1) {
  rect(page, x, y, 94*s, 90*s, C.mint2, 7*s);
  page.drawSvgPath(`M ${x+22*s} ${y+88*s} Q ${x+47*s} ${y+132*s} ${x+72*s} ${y+88*s}`, { borderColor: C.deep2, borderWidth: 5*s });
  page.drawCircle({ x:x+47*s,y:y+44*s,size:18*s,color:C.orange });
}

function drawBanner(page: PDFPage, x: number, y: number, s = 1) {
  rect(page, x, y + 14*s, 76*s, 116*s, C.deep2, 4*s);
  rect(page, x + 8*s, y + 25*s, 60*s, 94*s, C.cream, 2*s);
  rect(page, x + 17*s, y + 82*s, 42*s, 19*s, C.orange, 4*s);
  line(page, x + 38*s, y + 14*s, x + 38*s, y, C.deep2, 3*s);
  line(page, x + 16*s, y, x + 60*s, y, C.deep2, 3*s);
}

function drawCards(page: PDFPage, x: number, y: number, s = 1) {
  rect(page, x + 18*s, y + 17*s, 102*s, 62*s, C.deep2, 7*s);
  rect(page, x, y, 102*s, 62*s, C.white, 7*s, C.line, 1*s);
  rect(page, x + 10*s, y + 11*s, 25*s, 25*s, C.orange, 5*s);
  line(page, x + 46*s, y + 39*s, x + 88*s, y + 39*s, C.deep2, 2*s);
  line(page, x + 46*s, y + 28*s, x + 78*s, y + 28*s, C.line, 2*s);
}

function drawBox(page: PDFPage, x: number, y: number, s = 1) {
  rect(page, x, y, 96*s, 72*s, C.orange, 7*s);
  rect(page, x + 5*s, y + 58*s, 86*s, 20*s, C.orange2, 6*s);
  rect(page, x + 22*s, y + 22*s, 52*s, 22*s, C.cream, 4*s);
  line(page, x + 48*s, y, x + 48*s, y + 78*s, C.deep2, 2*s);
}


function drawTrendBadge(page: PDFPage, fonts: Fonts, x: number, y: number, value: string) {
  rect(page, x, y, 112, 26, C.orange, 13);
  page.drawText(value, { x: x + 13, y: y + 8.5, size: 8.2, font: fonts.bold, color: C.white });
}

export async function GET() {
  const doc = await PDFDocument.create();
  doc.setTitle("Guia de Soluções Corporativas COLORCÓPIA 2026/2027");
  doc.setAuthor("COLORCÓPIA");
  doc.setSubject("Catálogo premium de produtos gráficos, personalizados e soluções corporativas");
  doc.setKeywords(["COLORCÓPIA", "gráfica", "brindes", "comunicação visual", "catálogo"]);
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    oblique: await doc.embedFont(StandardFonts.HelveticaOblique),
  };

  // 01 — Capa
  {
    const p = doc.addPage([W, H]);
    rect(p, 0, 0, W, H, C.deep2);
    p.drawCircle({ x: 738, y: 512, size: 180, color: C.deep });
    p.drawCircle({ x: 765, y: 82, size: 210, color: C.orange });
    rect(p, 487, 85, 248, 390, C.paper, 28);
    drawBottle(p, 535, 270, 1.25);
    drawNotebook(p, 630, 285, 1.05);
    drawBag(p, 528, 125, 1.1);
    drawBanner(p, 650, 125, 0.9);
    brand(p, fonts, 42, 531, true);
    p.drawText("GUIA DE", { x: 44, y: 420, size: 12, font: fonts.bold, color: C.orange2 });
    text(p, "SOLUÇÕES\nCORPORATIVAS", 44, 344, 39, fonts.bold, C.white, 390, 43);
    text(p, "Impressão, comunicação visual, personalizados, brindes e soluções que fortalecem marcas.", 45, 224, 12.5, fonts.regular, C.mint2, 350, 17);
    drawTrendBadge(p, fonts, 44, 160, "EDIÇÃO 2026 / 2027");
    p.drawText("PRODUTOS ATUAIS + NOVAS OPORTUNIDADES", { x: 44, y: 120, size: 8.5, font: fonts.bold, color: C.white });
    p.drawText("01", { x: 44, y: 35, size: 11, font: fonts.bold, color: C.orange2 });
  }

  // 02 — Posicionamento
  {
    const p = doc.addPage([W, H]);
    header(p, fonts, "A COLORCÓPIA", "Soluções que transformam ideias em presença.", "Um portfólio organizado para empresas, eventos, varejo, instituições e projetos personalizados.", 2);
    rect(p, 38, 82, 430, 290, C.deep2, 18);
    text(p, "Mais que impressão.", 64, 324, 25, fonts.bold, C.white);
    text(p, "Cada material é pensado como parte da experiência da marca — da primeira apresentação ao relacionamento com clientes, equipes e parceiros.", 64, 278, 12, fonts.regular, C.mint2, 350, 17);
    const pillars = [["01","CLAREZA","Famílias de produtos sem repetição."],["02","VARIEDADE","Formatos, materiais e acabamentos."],["03","VENDA","Combinações para elevar o ticket médio."]];
    pillars.forEach((it,i)=>{
      const y=210-i*58;
      p.drawText(it[0],{x:64,y,size:9,font:fonts.bold,color:C.orange2});
      p.drawText(it[1],{x:94,y,size:9,font:fonts.bold,color:C.white});
      p.drawText(it[2],{x:185,y,size:8.5,font:fonts.regular,color:C.mint2});
    });
    const cards = [
      ["IMPRESSOS","Papelaria, divulgação e materiais editoriais"],
      ["PERSONALIZADOS","Presentes, datas especiais e coleções"],
      ["CORPORATIVO","Kits, identificação e relacionamento"],
      ["GRANDES FORMATOS","Presença física e comunicação de impacto"],
    ];
    cards.forEach((it,i)=>{
      const x=495+(i%2)*151, y=230-Math.floor(i/2)*138;
      rect(p,x,y,136,118,C.white,14,C.line,0.8);
      rect(p,x+15,y+78,34,25,i%2?C.mint:C.cream,7);
      p.drawText(String(i+1).padStart(2,"0"),{x:x+24,y:y+86,size:8,font:fonts.bold,color:i%2?C.deep2:C.orange});
      text(p,it[0],x+15,y+58,9.5,fonts.bold,C.deep2,108,12);
      text(p,it[1],x+15,y+36,8.2,fonts.regular,C.muted,108,10.5);
    });
  }

  // 03 — Índice
  {
    const p = doc.addPage([W,H]);
    header(p, fonts, "NAVEGAÇÃO", "Encontre a solução ideal para cada objetivo.", "O catálogo reúne produtos antigos e novos em famílias, com variações de formato, material, acabamento e personalização.", 3);
    const sections = [
      ["04","PAPELARIA CORPORATIVA","Cartões, pastas, blocos, agendas e materiais institucionais"],
      ["05","IMPRESSÃO & DIVULGAÇÃO","Impressões, panfletos, tags, ímãs e fotografia"],
      ["06","COMUNICAÇÃO VISUAL","Banners, adesivos, placas, displays e fachadas"],
      ["07","BRINDES & PERSONALIZADOS","Canecas, copos, garrafas, bolsas e presentes"],
      ["08","KITS CORPORATIVOS","Onboarding, eventos, campanhas e reconhecimento"],
      ["09","EVENTOS & EXPERIÊNCIAS","Credenciais, convites, sinalização e papelaria"],
      ["10","EMBALAGENS & VAREJO","Caixas, sacolas, rótulos, lacres e cardápios"],
    ];
    sections.forEach((s,i)=>{
      const col=i<4?0:1, row=i<4?i:i-4;
      const x=38+col*392, y=348-row*72;
      rect(p,x,y,366,57,i===0?C.deep2:C.white,12,i===0?undefined:C.line,0.8);
      p.drawText(s[0],{x:x+16,y:y+20,size:13,font:fonts.bold,color:i===0?C.orange2:C.orange});
      p.drawText(s[1],{x:x+60,y:y+31,size:10,font:fonts.bold,color:i===0?C.white:C.deep2});
      text(p,s[2],x+60,y+14,7.7,fonts.regular,i===0?C.mint2:C.muted,285,9.5);
    });
    rect(p,430,132,366,57,C.cream,12);
    p.drawText("NOVO",{x:446,y:153,size:9,font:fonts.bold,color:C.orange});
    p.drawText("Produtos marcados como oportunidade",{x:500,y:153,size:9,font:fonts.bold,color:C.deep2});
    p.drawText("Itens adicionados para ampliar margem, recorrência e valor percebido.",{x:500,y:138,size:7.7,font:fonts.regular,color:C.muted});
  }

  // 04 — Papelaria
  {
    const p=doc.addPage([W,H]);
    header(p,fonts,"FAMÍLIA 01","Papelaria corporativa","Materiais que organizam a operação e tornam a marca presente em cada contato.",4);
    drawCards(p,585,362,1.3);
    drawNotebook(p,716,344,0.82);
    const cards=[
      ["Cartões de visita","Clássico, duplo, vertical, cantos arredondados e versões premium.",["couchê","laminação","verniz"]],
      ["Pastas institucionais","Com bolsa, orelha, encaixe para cartão e fechamento personalizado.",["A4","A5","sob medida"]],
      ["Blocos e receituários","Com ou sem numeração, autocopiativo, colado ou serrilhado.",["A4","A5","A6"]],
      ["Agendas, cadernos e planners","Capas rígidas ou flexíveis, espiral, wire-o e miolos personalizados.",["diário","semanal","executivo"]],
      ["Envelopes e papel timbrado","Formatos comerciais, carta, ofício, saco e projetos especiais.",["offset","reciclato","premium"]],
      ["Calendários e marcadores","Mesa, parede, bolso, marcador de página e calendários promocionais.",["anual","mensal","personalizado"]],
    ];
    cards.forEach((c,i)=>{
      const x=38+(i%3)*186, y=260-Math.floor(i/3)*142;
      productCard(p,fonts,x,y,170,128,c[0] as string,c[1] as string,c[2] as string[],i%2?C.deep:C.orange,String(i+1).padStart(2,"0"));
    });
    label(p,"NOVO: PLANNER CORPORATIVO",585,286,190,fonts.bold,C.orange,C.white);
    text(p,"Oportunidade para campanhas internas, onboarding e presentes de relacionamento.",585,266,8.5,fonts.regular,C.muted,210,11);
  }

  // 05 — Impressão e divulgação
  {
    const p=doc.addPage([W,H]);
    header(p,fonts,"FAMÍLIA 02","Impressão & divulgação","Do documento do dia a dia à campanha promocional, com formatos e papéis adequados a cada uso.",5);
    const left=[
      ["Impressão digital","A3, A4, A5 e A6; colorida ou P&B; frente ou frente e verso."],
      ["Papéis e superfícies","Comum, couchê, vegetal, Aspen, reciclato, fotográfico e adesivo."],
      ["Panfletos e folhetos","Uma ou duas faces, diferentes gramaturas, dobras e quantidades."],
      ["Tags, cartões e marcadores","Furos, cordões, cantos especiais e acabamentos de valorização."],
      ["Ímãs e placas PIX","Formatos úteis para balcão, delivery, serviços e relacionamento."],
      ["Fotografia","Revelação 10x15 e 15x21, estilo Polaroid, kits e fotos de mesa."],
    ];
    left.forEach((a,i)=>{
      const x=38+(i%2)*264,y=324-Math.floor(i/2)*91;
      rect(p,x,y,248,76,C.white,12,C.line,0.8);
      rect(p,x+13,y+17,35,42,i===5?C.orange:C.deep2,8);
      p.drawText(String(i+1).padStart(2,"0"),{x:x+23,y:y+34,size:9,font:fonts.bold,color:C.white});
      p.drawText(a[0],{x:x+60,y:y+47,size:10,font:fonts.bold,color:C.deep2});
      text(p,a[1],x+60,y+29,7.9,fonts.regular,C.muted,172,10);
    });
    rect(p,584,88,220,316,C.deep2,19);
    p.drawText("ESCOLHA TÉCNICA",{x:608,y:366,size:8.5,font:fonts.bold,color:C.orange2});
    text(p,"O papel certo muda a percepção.",608,330,21,fonts.bold,C.white,165,24);
    text(p,"Couchê para brilho e cor. Reciclato para linguagem natural. Fotográfico para imagem. Vegetal para sobreposições e projetos especiais.",608,263,9.5,fonts.regular,C.mint2,162,14);
    rect(p,608,136,170,80,C.cream,12);
    p.drawText("VARIAÇÕES",{x:624,y:192,size:8,font:fonts.bold,color:C.orange});
    text(p,"gramatura • tamanho • cor • lados • dobra • corte • acabamento",624,174,8.7,fonts.bold,C.deep2,138,12);
  }

  // 06 — Comunicação visual
  {
    const p=doc.addPage([W,H]);
    header(p,fonts,"FAMÍLIA 03","Comunicação visual","Soluções para sinalizar, divulgar, orientar e criar presença de marca em ambientes físicos.",6);
    drawBanner(p,622,312,1.12);
    rect(p,38,91,520,298,C.deep2,18);
    const items=[
      ["Banners e faixas","60x80, 80x100, 80x120, 90x100, 90x120 e por m²; ilhós, bastão e corda."],
      ["Adesivos","Vinil, leitoso, transparente, microperfurado e recorte eletrônico."],
      ["Placas","PVC, PS, ACM e opções para sinalização, PIX, venda, locação e orientação."],
      ["Displays e totens","Mesa, balcão e chão; X-banner, roll-up, backdrop e wind banner."],
      ["Fachadas e letras caixa","ACM, lona, adesivação, letras em relevo e projetos sob medida."],
      ["Envelopamento","Vitrines, paredes, mobiliário e veículos, parcial ou completo."],
    ];
    items.forEach((a,i)=>{
      const col=i%2,row=Math.floor(i/2),x=61+col*246,y=330-row*78;
      p.drawCircle({x:x+10,y:y+6,size:10,color:i<3?C.orange:C.deep});
      p.drawText(String(i+1),{x:x+7.5,y:y+2.6,size:7,font:fonts.bold,color:C.white});
      p.drawText(a[0],{x:x+29,y:y+10,size:10,font:fonts.bold,color:C.white});
      text(p,a[1],x+29,y-7,7.9,fonts.regular,C.mint2,194,10);
    });
    label(p,"NOVO",594,266,56,fonts.bold,C.orange,C.white);
    p.drawText("ROLL-UP • WIND BANNER • BACKDROP",{x:660,y:274,size:8,font:fonts.bold,color:C.deep2});
    text(p,"Produtos de alto valor percebido para feiras, convenções, inaugurações e pontos de venda.",594,236,9,fonts.regular,C.muted,205,12);
    rect(p,594,105,205,100,C.cream,14);
    p.drawText("COMBINE COM",{x:612,y:178,size:8,font:fonts.bold,color:C.orange});
    text(p,"credenciais + cordões + folders + brindes + sinalização",612,157,10,fonts.bold,C.deep2,168,13);
  }

  // 07 — Brindes
  {
    const p=doc.addPage([W,H]);
    header(p,fonts,"FAMÍLIA 04","Brindes & personalizados","Itens úteis e afetivos para ampliar a lembrança da marca em campanhas, eventos e datas especiais.",7);
    drawBottle(p,660,346,0.95);
    drawBag(p,700,216,0.85);
    const cards=[
      ["Canecas e xícaras","Cerâmica branca, colorida, mágica, polímero, vidro e kits com caixa.",["sublimação","UV","silk"]],
      ["Copos e garrafas","Copo térmico, squeeze, garrafa inox, modelos com tampa e opções premium.",["NOVO","uso diário","corporativo"]],
      ["Mousepads e deskmats","Formatos tradicionais, ergonômicos, gamer e tamanhos personalizados.",["NOVO","escritório","tecnologia"]],
      ["Ecobags e sacochilas","Algodão, lona, TNT e poliéster; alças e tamanhos variados.",["NOVO","sustentável","eventos"]],
      ["Chaveiros e acessórios","Acrílico, MDF, metal, abridor, porta-crachá e utilidades.",["NOVO","baixo volume","kits"]],
      ["Camisetas e bonés","Silk, sublimação, DTF, transfer e bordado conforme o material.",["NOVO","uniformes","campanhas"]],
    ];
    cards.forEach((c,i)=>{
      const x=38+(i%3)*190,y=262-Math.floor(i/3)*145;
      productCard(p,fonts,x,y,174,132,c[0] as string,c[1] as string,c[2] as string[],i%3===0?C.orange:C.deep,String(i+1).padStart(2,"0"));
    });
    rect(p,615,92,184,94,C.deep2,14);
    p.drawText("TENDÊNCIA",{x:632,y:160,size:8,font:fonts.bold,color:C.orange2});
    text(p,"utilidade + personalização + embalagem",632,137,12,fonts.bold,C.white,150,15);
    p.drawText("Maior permanência da marca no cotidiano.",{x:632,y:111,size:7.6,font:fonts.regular,color:C.mint2});
  }

  // 08 — Kits corporativos
  {
    const p=doc.addPage([W,H]);
    header(p,fonts,"FAMÍLIA 05","Kits corporativos","Combinações prontas para transformar produtos avulsos em experiências de maior valor percebido.",8);
    drawBox(p,654,356,1.25);
    const kits=[
      ["KIT ONBOARDING","caderno + caneta + caneca + crachá + caixa"],
      ["KIT EXECUTIVO","agenda + garrafa térmica + porta-cartão + embalagem"],
      ["KIT EVENTO","credencial + cordão + ecobag + bloco + brinde"],
      ["KIT CLIENTE VIP","copo térmico + cartão + caixa premium + tag"],
      ["KIT DATAS ESPECIAIS","coleções para mães, pais, professores, Natal e aniversários"],
      ["KIT SUSTENTÁVEL","ecobag + bloco reciclado + caneta ecológica + squeeze"],
    ];
    kits.forEach((k,i)=>{
      const x=38+(i%2)*312,y=330-Math.floor(i/2)*78;
      rect(p,x,y,294,63,i===0?C.orange:C.white,12,i===0?undefined:C.line,0.8);
      p.drawText(String(i+1).padStart(2,"0"),{x:x+16,y:y+24,size:12,font:fonts.bold,color:i===0?C.white:C.orange});
      p.drawText(k[0],{x:x+56,y:y+37,size:10,font:fonts.bold,color:i===0?C.white:C.deep2});
      text(p,k[1],x+56,y+20,8,fonts.regular,i===0?C.cream:C.muted,218,10);
    });
    rect(p,676,182,123,126,C.deep2,16);
    p.drawText("PERSONALIZE",{x:694,y:278,size:8,font:fonts.bold,color:C.orange2});
    text(p,"cores\nmensagem\nembalagem\nseleção de itens",694,250,10,fonts.bold,C.white,90,19);
    rect(p,650,91,149,68,C.cream,12);
    text(p,"Venda a solução completa, não apenas o item.",668,130,10,fonts.bold,C.deep2,112,14);
  }

  // 09 — Eventos
  {
    const p=doc.addPage([W,H]);
    header(p,fonts,"FAMÍLIA 06","Eventos & experiências","Materiais coordenados para receber, identificar, orientar, divulgar e registrar cada ocasião.",9);
    const columns=[
      ["IDENTIFICAÇÃO",["Crachás em papel, PVC e rígidos","Cordões personalizados","Credenciais e porta-crachás","Pulseiras para controle"]],
      ["CENOGRAFIA",["Backdrop e painel fotográfico","Totens e displays","Banners, faixas e sinalização","Placas de mesa e direção"]],
      ["PAPELARIA",["Convites e envelopes","Menus e programas","Tags, marcadores e lembranças","Certificados e livrinhos"]],
    ];
    columns.forEach((col,i)=>{
      const x=38+i*258;
      rect(p,x,104,235,283,i===1?C.deep2:C.white,16,i===1?undefined:C.line,0.8);
      rect(p,x+18,333,50,33,i===1?C.orange:C.mint,9);
      p.drawText(String(i+1).padStart(2,"0"),{x:x+34,y:344,size:9,font:fonts.bold,color:i===1?C.white:C.deep2});
      p.drawText(col[0] as string,{x:x+18,y:305,size:12,font:fonts.bold,color:i===1?C.white:C.deep2});
      (col[1] as string[]).forEach((it,j)=>{
        const y=268-j*44;
        p.drawCircle({x:x+24,y:y+4,size:3.3,color:C.orange});
        text(p,it,x+36,y,8.8,fonts.regular,i===1?C.mint2:C.muted,177,11);
      });
    });
    label(p,"CASAMENTO",38,72,90,fonts.bold,C.cream,C.deep2);
    label(p,"CORPORATIVO",136,72,98,fonts.bold,C.mint,C.deep2);
    label(p,"ESCOLAR",242,72,75,fonts.bold,C.cream,C.deep2);
    label(p,"RELIGIOSO",325,72,82,fonts.bold,C.mint,C.deep2);
    label(p,"FESTAS",415,72,70,fonts.bold,C.cream,C.deep2);
  }

  // 10 — Embalagens e varejo
  {
    const p=doc.addPage([W,H]);
    header(p,fonts,"FAMÍLIA 07","Embalagens & varejo","Soluções para proteger, apresentar, organizar e vender melhor no balcão, delivery e ponto de venda.",10);
    drawBox(p,677,356,1.1);
    drawCards(p,637,254,0.92);
    const groups=[
      ["CAIXAS PERSONALIZADAS","canecas • presentes • kits • alimentos • cosméticos"],
      ["SACOLAS","kraft • papel • laminada • TNT • alças variadas"],
      ["RÓTULOS & ETIQUETAS","papel • vinil • transparente • metalizado • BOPP"],
      ["LACRES & ADESIVOS","segurança • delivery • fechamento • promoção"],
      ["CARDÁPIOS","papel • laminado • PVC • espiral • QR Code"],
      ["PONTO DE VENDA","display • wobblers • porta-preço • jogo americano"],
    ];
    groups.forEach((g,i)=>{
      const x=38+(i%2)*298,y=334-Math.floor(i/2)*82;
      rect(p,x,y,280,67,C.white,12,C.line,0.8);
      rect(p,x+14,y+15,38,38,i%2?C.deep2:C.orange,9);
      p.drawText(String(i+1).padStart(2,"0"),{x:x+25,y:y+29,size:8.5,font:fonts.bold,color:C.white});
      p.drawText(g[0],{x:x+66,y:y+40,size:9.5,font:fonts.bold,color:C.deep2});
      text(p,g[1],x+66,y+22,8,fonts.regular,C.muted,195,10);
    });
    rect(p,650,93,149,116,C.deep2,15);
    p.drawText("OPORTUNIDADE",{x:668,y:180,size:8,font:fonts.bold,color:C.orange2});
    text(p,"embalagem + rótulo + lacre + material de balcão",668,153,11,fonts.bold,C.white,114,15);
    p.drawText("Uma venda abre quatro produtos complementares.",{x:668,y:111,size:7.4,font:fonts.regular,color:C.mint2});
  }

  const pdfBytes = await doc.save({ useObjectStreams: false });
  const body = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Guia_COLORCOPIA_2026_2027_Premium_10_paginas.pdf"',
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
