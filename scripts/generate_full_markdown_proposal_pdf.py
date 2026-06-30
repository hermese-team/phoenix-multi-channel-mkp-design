from __future__ import annotations

import html
import os
import re
from dataclasses import dataclass
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


SRC = "docs/phoenix-multi-channel-marketplace-proposal.md"
OUT = "output/pdf/phoenix-multi-channel-marketplace-proposal-full-with-gantt.pdf"

PAGE_W, PAGE_H = A4
MARGIN_L = 1.35 * cm
MARGIN_R = 1.35 * cm
MARGIN_T = 1.25 * cm
MARGIN_B = 1.25 * cm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

NAVY = colors.HexColor("#203047")
BLUE = colors.HexColor("#2D6CDF")
TEAL = colors.HexColor("#1B998B")
CYAN = colors.HexColor("#39A9DB")
PURPLE = colors.HexColor("#725AC1")
ORANGE = colors.HexColor("#F76F3F")
AMBER = colors.HexColor("#F0A202")
RED = colors.HexColor("#D64545")
GREEN = colors.HexColor("#61B15A")
INK = colors.HexColor("#1F2933")
MUTED = colors.HexColor("#64748B")
GRID = colors.HexColor("#D9E2EC")
LIGHT = colors.HexColor("#F5F7FA")


styles = getSampleStyleSheet()
for name in list(styles.byName):
    if name in {"Title"}:
        continue

styles.add(
    ParagraphStyle(
        "DocTitle",
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=27,
        textColor=NAVY,
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        "H1x",
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=NAVY,
        spaceBefore=12,
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        "H2x",
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=15.5,
        textColor=NAVY,
        spaceBefore=9,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        "H3x",
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=13,
        textColor=NAVY,
        spaceBefore=7,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        "H4x",
        fontName="Helvetica-Bold",
        fontSize=9.4,
        leading=11.8,
        textColor=NAVY,
        spaceBefore=5,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        "Bodyx",
        fontName="Helvetica",
        fontSize=8.45,
        leading=10.8,
        textColor=INK,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        "BlockQuote",
        fontName="Helvetica",
        fontSize=8.25,
        leading=10.8,
        textColor=INK,
        leftIndent=0.3 * cm,
        rightIndent=0.2 * cm,
        borderColor=BLUE,
        borderWidth=0.8,
        borderPadding=5,
        backColor=colors.HexColor("#F7FAFF"),
        spaceBefore=4,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        "TableHead",
        fontName="Helvetica-Bold",
        fontSize=6.4,
        leading=7.7,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        "TableCell",
        fontName="Helvetica",
        fontSize=6.35,
        leading=7.65,
        textColor=INK,
    )
)


def inline_md(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"`([^`]+)`", r"<font name='Courier' backColor='#EEF2F6'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = text.replace("  ", " ")
    return text


def para(text: str, style: str = "Bodyx") -> Paragraph:
    return Paragraph(inline_md(text), styles[style])


def parse_table(lines: list[str]):
    rows = []
    for line in lines:
        raw = line.strip()
        if raw.startswith("|"):
            raw = raw[1:]
        if raw.endswith("|"):
            raw = raw[:-1]
        rows.append([cell.strip() for cell in raw.split("|")])
    if len(rows) >= 2 and all(re.match(r"^:?-{3,}:?$", c.replace(" ", "")) for c in rows[1]):
        rows.pop(1)
    return rows


def col_widths(rows: list[list[str]]) -> list[float]:
    n = max(len(r) for r in rows)
    scores = []
    for i in range(n):
        vals = [r[i] if i < len(r) else "" for r in rows]
        score = max(6, min(42, max(len(v) for v in vals)))
        if any(len(v) > 55 for v in vals):
            score += 10
        scores.append(score)
    total = sum(scores)
    widths = [CONTENT_W * s / total for s in scores]
    min_w = 1.25 * cm
    if any(w < min_w for w in widths):
        deficit = sum(max(0, min_w - w) for w in widths)
        widths = [max(min_w, w) for w in widths]
        over = sum(widths) - CONTENT_W
        if over > 0:
            flexible = [i for i, w in enumerate(widths) if w > min_w + 0.2 * cm]
            for i in flexible:
                widths[i] -= over * ((widths[i] - min_w) / sum(widths[j] - min_w for j in flexible))
    return widths


def make_table(rows: list[list[str]]) -> Table:
    n = max(len(r) for r in rows)
    normalized = [r + [""] * (n - len(r)) for r in rows]
    data = []
    for ri, row in enumerate(normalized):
        data.append(
            [
                Paragraph(inline_md(cell), styles["TableHead" if ri == 0 else "TableCell"])
                for cell in row
            ]
        )
    t = Table(data, colWidths=col_widths(normalized), repeatRows=1)
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.25, GRID),
        ("INNERGRID", (0, 0), (-1, -1), 0.2, GRID),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            commands.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#FAFBFC")))
    t.setStyle(TableStyle(commands))
    return t


@dataclass
class Task:
    label: str
    start: int
    duration: int
    color: colors.Color


class MilestoneRecommendationGantt(Flowable):
    def __init__(self):
        super().__init__()
        self.height = 10.2 * cm
        self.tasks = [
            Task("Discovery and reverse engineering", 0, 6, BLUE),
            Task("Architecture and contracts", 0, 8, PURPLE),
            Task("PostgreSQL schema and sync ledger", 5, 7, CYAN),
            Task("Kafka command/result flow", 5, 7, TEAL),
            Task("R10/LDD ingestion", 10, 8, GREEN),
            Task("Price/promotion engine", 14, 10, ORANGE),
            Task("Shopee adapter", 20, 10, AMBER),
            Task("Lazada adapter", 25, 10, RED),
            Task("TikTok dry-run adapter", 34, 7, PURPLE),
            Task("Dashboard and admin API", 25, 15, BLUE),
            Task("Performance test harness", 34, 9, TEAL),
            Task("Redis ATS proof of concept", 30, 10, RED),
            Task("UAT, release, parallel run", 42, 10, NAVY),
        ]
        self.ticks = [
            ("Jun 17", 0),
            ("Jul 1", 10),
            ("Jul 15", 20),
            ("Aug 1", 32),
            ("Aug 15", 42),
            ("Aug 31", 52),
        ]

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return availWidth, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(LIGHT)
        c.setStrokeColor(GRID)
        c.roundRect(0, 0, self.width, self.height, 8, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9.2)
        c.drawString(0.35 * cm, self.height - 0.48 * cm, "5.5 Milestone Recommendation - Gantt view")
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.8)
        c.drawString(0.35 * cm, self.height - 0.82 * cm, "Illustrative working-day plan from 2026-06-17 to 2026-08-31 for Option B plus Redis ATS POC.")

        left = 5.65 * cm
        right = 0.45 * cm
        top = self.height - 1.55 * cm
        row_h = 0.55 * cm
        chart_w = self.width - left - right
        total_days = 52

        c.setStrokeColor(colors.HexColor("#E4EAF0"))
        c.setFont("Helvetica", 6.2)
        for label, day in self.ticks:
            x = left + chart_w * day / total_days
            c.line(x, top + 0.1 * cm, x, 0.55 * cm)
            c.setFillColor(MUTED)
            c.drawCentredString(x, top + 0.25 * cm, label)

        for i, task in enumerate(self.tasks):
            y = top - (i + 1) * row_h
            c.setFillColor(INK)
            c.setFont("Helvetica", 6.7)
            c.drawRightString(left - 0.18 * cm, y + 0.08 * cm, task.label)
            x = left + chart_w * task.start / total_days
            w = chart_w * task.duration / total_days
            c.setFillColor(task.color)
            c.roundRect(x, y, w, 0.28 * cm, 3, fill=1, stroke=0)

        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.2)
        c.drawString(0.35 * cm, 0.22 * cm, "Note: dates are planning placeholders; final sequencing should be confirmed after the one-week .NET adapter/API audit.")


def render_markdown(md: str):
    story = []
    lines = md.splitlines()
    i = 0
    paragraph_buffer: list[str] = []

    def flush_para():
        if paragraph_buffer:
            story.append(para(" ".join(s.strip() for s in paragraph_buffer if s.strip())))
            paragraph_buffer.clear()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            flush_para()
            story.append(Spacer(1, 0.08 * cm))
            i += 1
            continue

        if stripped.startswith("|"):
            flush_para()
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i])
                i += 1
            story.append(make_table(parse_table(table_lines)))
            story.append(Spacer(1, 0.18 * cm))
            continue

        heading = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading:
            flush_para()
            level = len(heading.group(1))
            text = heading.group(2)
            if level == 1:
                story.append(Paragraph(inline_md(text), styles["DocTitle"]))
            elif level == 2:
                story.append(Paragraph(inline_md(text), styles["H1x"]))
            elif level == 3:
                story.append(Paragraph(inline_md(text), styles["H2x"]))
            else:
                story.append(Paragraph(inline_md(text), styles["H3x"]))
            if text == "5.5 Milestone Recommendation":
                story.append(Spacer(1, 0.12 * cm))
                story.append(MilestoneRecommendationGantt())
                story.append(Spacer(1, 0.24 * cm))
            i += 1
            continue

        if stripped.startswith(">"):
            flush_para()
            quote = stripped.lstrip(">").strip()
            i += 1
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote += " " + lines[i].strip().lstrip(">").strip()
                i += 1
            story.append(Paragraph(inline_md(quote), styles["BlockQuote"]))
            continue

        bullet = re.match(r"^(\s*)[-*]\s+(.*)$", line)
        if bullet:
            flush_para()
            indent = len(bullet.group(1))
            style = ParagraphStyle(
                f"Bullet{indent}_{len(story)}",
                parent=styles["Bodyx"],
                leftIndent=(0.25 + indent * 0.12) * cm,
                firstLineIndent=-0.16 * cm,
            )
            story.append(Paragraph(f"&bull; {inline_md(bullet.group(2))}", style))
            i += 1
            continue

        numbered = re.match(r"^(\s*)(\d+)\.\s+(.*)$", line)
        if numbered:
            flush_para()
            indent = len(numbered.group(1))
            style = ParagraphStyle(
                f"Numbered{indent}_{len(story)}",
                parent=styles["Bodyx"],
                leftIndent=(0.32 + indent * 0.12) * cm,
                firstLineIndent=-0.24 * cm,
            )
            story.append(Paragraph(f"{numbered.group(2)}. {inline_md(numbered.group(3))}", style))
            i += 1
            continue

        paragraph_buffer.append(line)
        i += 1

    flush_para()
    return story


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 0.52 * cm, PAGE_W, 0.52 * cm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 7.2)
    canvas.drawString(MARGIN_L, PAGE_H - 0.34 * cm, "Phoenix Multi-Channel Marketplace System Proposal")
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 0.34 * cm, "Full Markdown Export + 5.5 Gantt")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 6.8)
    canvas.drawString(MARGIN_L, 0.48 * cm, "Generated from docs/phoenix-multi-channel-marketplace-proposal.md")
    canvas.drawRightString(PAGE_W - MARGIN_R, 0.48 * cm, f"Page {doc.page}")
    canvas.restoreState()


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(SRC, "r", encoding="utf-8") as f:
        md = f.read()
    doc = SimpleDocTemplate(
        OUT,
        pagesize=A4,
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
        topMargin=MARGIN_T,
        bottomMargin=MARGIN_B,
        title="Phoenix Multi-Channel Marketplace System Proposal - Full Markdown Export",
        author="Codex",
    )
    doc.build(render_markdown(md), onFirstPage=header_footer, onLaterPages=header_footer)
    print(OUT)


if __name__ == "__main__":
    main()
