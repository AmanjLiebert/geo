"""Build clearly marked showcase PDFs from the same content as the online reader.

Requires Node (project TypeScript dependency), reportlab and Pillow.
Run from any directory: python scripts/build-research-pdfs.py
"""
from pathlib import Path
import json
import subprocess
from xml.sax.saxutils import escape
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/pdf"
PUBLIC = ROOT / "public/research-pdfs"
OUTPUT.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)
entries = json.loads(subprocess.check_output(["node", str(ROOT / "scripts/export-research-content.mjs")], text=True, encoding="utf-8"))
INK, IRON, SHALE = colors.HexColor("#20231f"), colors.HexColor("#9e4d37"), colors.HexColor("#405149")
styles = {
    "label": ParagraphStyle("label", fontName="Courier-Bold", fontSize=9, leading=14, textColor=IRON, spaceAfter=10),
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=28, leading=32, textColor=INK, spaceAfter=16),
    "heading": ParagraphStyle("heading", fontName="Helvetica-Bold", fontSize=17, leading=22, textColor=SHALE, spaceBefore=20, spaceAfter=10, keepWithNext=True),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10.5, leading=16, textColor=INK, spaceAfter=10),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8, leading=12, textColor=colors.HexColor("#51554f"), spaceAfter=10),
}
def para(text, style="body"):
    return Paragraph(escape(text.replace("–", "-").replace("—", "-").replace("‑", "-")), styles[style])

def chrome(canvas, doc):
    width, height = A4
    canvas.setFillColor(SHALE)
    canvas.rect(0, height - 34, width, 34, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Courier-Bold", 9)
    canvas.drawString(44, height - 22, "GEO-KURDISTAN / RESEARCH")
    canvas.setFillColor(IRON)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(44, 26, "SHOWCASE SAMPLE - NOT PEER-REVIEWED RESEARCH")
    canvas.setFillColor(INK)
    canvas.drawRightString(width - 44, 26, str(doc.page))

for entry in entries:
    publication, document = entry["publication"], entry["document"]
    story = [para(f'{publication["type"].upper()} / {publication["year"]} / SHOWCASE EDITION', "label"), para(publication["title"], "title"), para(publication["authors"]), para(f'{publication["topic"]} | {publication["location"]}', "small"), para(f'Review status: {publication["status"]}. This mock editorial publication supports teacher feedback on the showcase. It is not a published scientific study.', "small"), para("Abstract", "heading"), para(publication["abstract"])]
    for index, section in enumerate(document["sections"]):
        story.append(para(f'{index + 1:02d} / {section["title"]}', "heading"))
        story.extend(para(text) for text in section["paragraphs"])
        if section.get("figure"):
            figure = section["figure"]
            source = ROOT / "public" / figure["src"].lstrip("/")
            with PILImage.open(source) as image:
                width, height = image.size
            scale = min(507 / width, 210 / height)
            story.append(KeepTogether([Spacer(1, 4), Image(str(source), width=width * scale, height=height * scale), Spacer(1, 7), para(figure["caption"], "small"), para(figure["credit"], "small")]))
    story.append(para("References and editorial limits", "heading"))
    for reference in document["references"]:
        story.append(para(reference["label"], "label"))
        story.append(para(reference["detail"], "small"))
    path = OUTPUT / f'{publication["slug"]}.pdf'
    SimpleDocTemplate(str(path), pagesize=A4, leftMargin=44, rightMargin=44, topMargin=56, bottomMargin=48, title=publication["title"], author=publication["authors"]).build(story, onFirstPage=chrome, onLaterPages=chrome)
    (PUBLIC / path.name).write_bytes(path.read_bytes())
    print(f"Built {path.name}")
