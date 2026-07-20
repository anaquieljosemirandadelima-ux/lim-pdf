import { chromium } from 'playwright-core';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs/promises';

const pdf = await PDFDocument.create();
const page = pdf.addPage([595,842]);
const font = await pdf.embedFont(StandardFonts.Helvetica);
page.drawText('Proposta Comercial', {x:70,y:730,size:28,font,color:rgb(0.05,0.1,0.2)});
page.drawText('Cliente: Empresa Exemplo', {x:70,y:680,size:14,font});
page.drawText('Valor: R$ 1.500,00', {x:70,y:650,size:14,font});
await fs.writeFile('/tmp/editor-test.pdf', await pdf.save());

const browser = await chromium.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--disable-web-security','--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights','--no-proxy-server']});
const errors=[];
const pageDesktop=await browser.newPage({viewport:{width:1600,height:1000}, deviceScaleFactor:1});
pageDesktop.on('console', msg=>{ if(msg.type()==='error') errors.push('console:'+msg.text()); });
pageDesktop.on('pageerror', err=>errors.push('page:'+err.message));
await pageDesktop.goto('http://172.26.36.6:3010/', {waitUntil:'networkidle'});
await pageDesktop.screenshot({path:'/mnt/data/lim-pdf-new-home-desktop.png', fullPage:true});
const homeText=await pageDesktop.locator('h1').innerText();
const toolCount=await pageDesktop.locator('.popular-tool').count();
await pageDesktop.goto('http://172.26.36.6:3010/ferramentas', {waitUntil:'networkidle'});
await pageDesktop.screenshot({path:'/mnt/data/lim-pdf-new-catalog-desktop.png', fullPage:true});
const catalogGroups=await pageDesktop.locator('.catalog-group').count();
await pageDesktop.goto('http://172.26.36.6:3010/ferramentas/editar-pdf', {waitUntil:'networkidle'});
await pageDesktop.locator('input[type=file][accept="application/pdf"]').setInputFiles('/tmp/editor-test.pdf');
await pageDesktop.locator('.editor-stage').waitFor({state:'visible',timeout:30000});
const blocks=await pageDesktop.locator('.text-detection-box').count();
await pageDesktop.screenshot({path:'/mnt/data/lim-pdf-new-editor-desktop.png', fullPage:true});
await pageDesktop.reload({waitUntil:'networkidle'});
await pageDesktop.locator('.editor-stage').waitFor({state:'visible',timeout:30000});
const restored=await pageDesktop.getByText(/Sessão recuperada|PDF pronto para edição/).count();

const mobile=await browser.newPage({viewport:{width:390,height:844}, deviceScaleFactor:1});
mobile.on('console', msg=>{ if(msg.type()==='error') errors.push('mobile-console:'+msg.text()); });
mobile.on('pageerror', err=>errors.push('mobile-page:'+err.message));
await mobile.goto('http://172.26.36.6:3010/', {waitUntil:'networkidle'});
await mobile.screenshot({path:'/mnt/data/lim-pdf-new-home-mobile.png', fullPage:true});
const horizontalOverflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);

console.log(JSON.stringify({homeText,toolCount,catalogGroups,blocks,restored,horizontalOverflow,errors},null,2));
await browser.close();
