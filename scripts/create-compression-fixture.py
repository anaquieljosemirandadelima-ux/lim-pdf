from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

output = "/home/ubuntu/lim-pdf/audits/compression-vector-fixture.pdf"
pdf = canvas.Canvas(output, pagesize=A4)
for page_number in range(1, 4):
    pdf.setTitle("LIM PDF compression fixture")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(72, 780, f"Compression test page {page_number}")
    pdf.setFont("Helvetica", 11)
    for line in range(35):
        pdf.drawString(72, 740 - line * 18, "Texto vetorial selecionável para validar preservação estrutural.")
    pdf.setStrokeColorRGB(0.9, 0.2, 0.2)
    pdf.rect(72, 100, 460, 80, stroke=1, fill=0)
    pdf.showPage()
pdf.save()
print(output)
