from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

out_dir = Path('/home/ubuntu/limpdf-repo/audits')
out_dir.mkdir(parents=True, exist_ok=True)
image_path = out_dir / 'ocr-fixture-page.png'
pdf_path = out_dir / 'ocr-fixture-scanned.pdf'

width, height = 1654, 2339
image = Image.new('RGB', (width, height), '#f4f1e8')
draw = ImageDraw.Draw(image)
try:
    title_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 64)
    body_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 38)
    small_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 30)
except OSError:
    title_font = body_font = small_font = ImageFont.load_default()

draw.rectangle((120, 120, width - 120, height - 120), outline='#6d6b63', width=5)
draw.text((190, 210), 'RELATÓRIO DE TESTE OCR', fill='#20211f', font=title_font)
lines = [
    'Documento de teste para reconhecer texto em uma página escaneada.',
    'Cliente: LIM Group',
    'Número do documento: OCR-2026-0818',
    'Valor total: R$ 1.250,00',
    'Data de revisão: 18/08/2026',
    '',
    'Este parágrafo verifica acentos, números e pontuação.',
    'O resultado deve permanecer pesquisável no PDF final.',
]
y = 420
for line in lines:
    draw.text((190, y), line, fill='#292a27', font=body_font)
    y += 100

draw.line((190, y + 40, width - 190, y + 40), fill='#8f8c82', width=3)
draw.text((190, y + 110), 'Assinatura: _______________________________', fill='#292a27', font=body_font)
draw.text((190, height - 250), 'Fixture controlado — sem texto PDF original', fill='#77756e', font=small_font)
image = image.filter(ImageFilter.GaussianBlur(radius=0.35))
image.save(image_path, quality=92)

pdf = canvas.Canvas(str(pdf_path), pagesize=A4)
pdf.drawImage(str(image_path), 0, 0, width=A4[0], height=A4[1], preserveAspectRatio=True, mask='auto')
pdf.showPage()
pdf.save()
print(pdf_path)
