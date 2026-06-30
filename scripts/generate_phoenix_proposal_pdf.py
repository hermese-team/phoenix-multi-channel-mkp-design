from __future__ import annotations

import math
import os
from dataclasses import dataclass
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUT = "output/pdf/phoenix-multi-channel-marketplace-proposal.pdf"

PAGE_W, PAGE_H = A4
MARGIN_L = 1.45 * cm
MARGIN_R = 1.45 * cm
MARGIN_T = 1.25 * cm
MARGIN_B = 1.25 * cm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R


NAVY = colors.HexColor("#203047")
BLUE = colors.HexColor("#2D6CDF")
CYAN = colors.HexColor("#39A9DB")
TEAL = colors.HexColor("#1B998B")
GREEN = colors.HexColor("#61B15A")
AMBER = colors.HexColor("#F0A202")
ORANGE = colors.HexColor("#F76F3F")
RED = colors.HexColor("#D64545")
PURPLE = colors.HexColor("#725AC1")
INK = colors.HexColor("#1F2933")
MUTED = colors.HexColor("#64748B")
LIGHT = colors.HexColor("#F5F7FA")
GRID = colors.HexColor("#D9E2EC")


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=31,
        textColor=NAVY,
        alignment=TA_LEFT,
        spaceAfter=14,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverSub",
        fontName="Helvetica",
        fontSize=11.5,
        leading=16,
        textColor=MUTED,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="H1x",
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=NAVY,
        spaceBefore=4,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="H2x",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=NAVY,
        spaceBefore=7,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="Bodyx",
        fontName="Helvetica",
        fontSize=9.1,
        leading=12.3,
        textColor=INK,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="Smallx",
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.2,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="SmallMuted",
        fontName="Helvetica",
        fontSize=7.3,
        leading=9,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHead",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCell",
        fontName="Helvetica",
        fontSize=7.1,
        leading=8.8,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCellBold",
        fontName="Helvetica-Bold",
        fontSize=7.1,
        leading=8.8,
        textColor=INK,
    )
)


def p(text: str, style: str = "Bodyx") -> Paragraph:
    return Paragraph(text, styles[style])


def bullet(text: str) -> Paragraph:
    return Paragraph(f"&bull; {text}", styles["Bodyx"])


def table(data, widths, header=True, font_size=7.1, row_heights=None):
    converted = []
    for r, row in enumerate(data):
        converted_row = []
        for cell in row:
            if isinstance(cell, Paragraph):
                converted_row.append(cell)
            else:
                converted_row.append(Paragraph(str(cell), styles["TableHead" if header and r == 0 else "TableCell"]))
        converted.append(converted_row)
    t = Table(converted, colWidths=widths, repeatRows=1 if header else 0, rowHeights=row_heights)
    ts = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.35, GRID),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, GRID),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
    ]
    if header:
        ts += [
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ]
    for i in range(1 if header else 0, len(data)):
        if i % 2 == 0:
            ts.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#FAFBFC")))
    t.setStyle(TableStyle(ts))
    return t


class KPIBand(Flowable):
    def __init__(self, items):
        super().__init__()
        self.items = items
        self.height = 2.25 * cm

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return availWidth, self.height

    def draw(self):
        gap = 0.18 * cm
        w = (self.width - gap * (len(self.items) - 1)) / len(self.items)
        for i, (label, value, note, color) in enumerate(self.items):
            x = i * (w + gap)
            self.canv.setFillColor(colors.white)
            self.canv.setStrokeColor(GRID)
            self.canv.roundRect(x, 0, w, self.height, 7, fill=1, stroke=1)
            self.canv.setFillColor(color)
            self.canv.roundRect(x, self.height - 0.18 * cm, w, 0.18 * cm, 6, fill=1, stroke=0)
            self.canv.setFillColor(NAVY)
            self.canv.setFont("Helvetica-Bold", 13)
            self.canv.drawString(x + 0.25 * cm, self.height - 0.72 * cm, value)
            self.canv.setFillColor(INK)
            self.canv.setFont("Helvetica-Bold", 7.6)
            self.canv.drawString(x + 0.25 * cm, self.height - 1.08 * cm, label)
            self.canv.setFillColor(MUTED)
            self.canv.setFont("Helvetica", 6.6)
            self.canv.drawString(x + 0.25 * cm, self.height - 1.42 * cm, note)


class ArchitectureDiagram(Flowable):
    def __init__(self):
        super().__init__()
        self.height = 12.7 * cm

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return availWidth, self.height

    def _box(self, x, y, w, h, title, body, color):
        c = self.canv
        c.setFillColor(colors.white)
        c.setStrokeColor(color)
        c.roundRect(x, y, w, h, 6, fill=1, stroke=1)
        c.setFillColor(color)
        c.roundRect(x, y + h - 0.43 * cm, w, 0.43 * cm, 5, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 7.2)
        c.drawCentredString(x + w / 2, y + h - 0.31 * cm, title)
        c.setFillColor(INK)
        c.setFont("Helvetica", 6.3)
        for i, line in enumerate(body):
            c.drawString(x + 0.15 * cm, y + h - 0.78 * cm - i * 0.28 * cm, line)

    def _arrow(self, x1, y1, x2, y2, color=GRID):
        c = self.canv
        c.setStrokeColor(color)
        c.setLineWidth(1)
        c.line(x1, y1, x2, y2)
        ang = math.atan2(y2 - y1, x2 - x1)
        size = 4
        c.setFillColor(color)
        pts = [
            (x2, y2),
            (x2 - size * math.cos(ang - 0.55), y2 - size * math.sin(ang - 0.55)),
            (x2 - size * math.cos(ang + 0.55), y2 - size * math.sin(ang + 0.55)),
        ]
        c.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1])
        c.line(pts[0][0], pts[0][1], pts[2][0], pts[2][1])

    def draw(self):
        c = self.canv
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(NAVY)
        c.drawString(0, self.height - 0.25 * cm, "Target architecture: event-driven strangler replacement")

        y_top = self.height - 2.2 * cm
        col_w = (self.width - 1.1 * cm) / 4
        gap = 0.36 * cm
        xs = [0, col_w + gap, (col_w + gap) * 2, (col_w + gap) * 3]

        self._box(xs[0], y_top, col_w, 1.9 * cm, "Internal Sources", ["RMS product", "R10 price/promo", "Stock Service", "Sale adaptor"], BLUE)
        self._box(xs[1], y_top, col_w, 1.9 * cm, "Ingestion", ["Snapshot readers", "Delta detection", "Idempotent writes"], TEAL)
        self._box(xs[2], y_top, col_w, 1.9 * cm, "Kafka Backbone", ["Replayable events", "Shock absorber", "DLQ + retries"], AMBER)
        self._box(xs[3], y_top, col_w, 1.9 * cm, "Channel Adapters", ["Shopee, Lazada", "TikTok, Amaze", "WeChat, Makro Pro"], ORANGE)

        y_mid = y_top - 3.1 * cm
        self._box(xs[0], y_mid, col_w, 2.1 * cm, "PostgreSQL SoT", ["Product master", "SKU mapping", "Sync ledger", "Order state"], PURPLE)
        self._box(xs[1], y_mid, col_w, 2.1 * cm, "Redis ATS", ["Live stock", "Reservations", "Lua atomic merge", "Velocity windows"], RED)
        self._box(xs[2], y_mid, col_w, 2.1 * cm, "Orchestration", ["Price/promo delta", "Allocation", "Sync commands", "Result tracking"], CYAN)
        self._box(xs[3], y_mid, col_w, 2.1 * cm, "Marketplaces", ["Marketplace: 20k SKU", "Mart: 2k stores", "10k SKU/store"], GREEN)

        y_bot = y_mid - 2.6 * cm
        self._box(xs[0], y_bot, col_w * 2 + gap, 1.75 * cm, "Admin and Operations", ["Next.js dashboards, campaign readiness, exception queues, approval controls"], NAVY)
        self._box(xs[2], y_bot, col_w * 2 + gap, 1.75 * cm, "Observability and Governance", ["OpenTelemetry, API success, retry rate, queue depth, DLQ, SLA alerts"], TEAL)

        self._arrow(xs[0] + col_w, y_top + 0.95 * cm, xs[1], y_top + 0.95 * cm, BLUE)
        self._arrow(xs[1] + col_w, y_top + 0.95 * cm, xs[2], y_top + 0.95 * cm, TEAL)
        self._arrow(xs[2] + col_w, y_top + 0.95 * cm, xs[3], y_top + 0.95 * cm, AMBER)
        self._arrow(xs[3] + col_w / 2, y_top, xs[3] + col_w / 2, y_mid + 2.1 * cm, ORANGE)
        self._arrow(xs[1] + col_w / 2, y_top, xs[1] + col_w / 2, y_mid + 2.1 * cm, RED)
        self._arrow(xs[0] + col_w / 2, y_mid, xs[0] + col_w / 2, y_bot + 1.75 * cm, PURPLE)
        self._arrow(xs[2] + col_w / 2, y_mid, xs[2] + col_w / 2, y_bot + 1.75 * cm, CYAN)


class FlowDiagram(Flowable):
    def __init__(self):
        super().__init__()
        self.height = 8.2 * cm

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return availWidth, self.height

    def draw(self):
        c = self.canv
        steps = [
            ("1", "ERP/R10/Stock Service\nsnapshot", BLUE),
            ("2", "Delta\ncalculation", TEAL),
            ("3", "Kafka event\npublication", AMBER),
            ("4", "Redis ATS\natomic merge", RED),
            ("5", "Dynamic\nallocation", PURPLE),
            ("6", "Channel\nsync", ORANGE),
        ]
        box_w = (self.width - 5 * 0.25 * cm) / 6
        y = 3.7 * cm
        for i, (num, label, color) in enumerate(steps):
            x = i * (box_w + 0.25 * cm)
            c.setFillColor(colors.white)
            c.setStrokeColor(color)
            c.roundRect(x, y, box_w, 2.2 * cm, 8, fill=1, stroke=1)
            c.setFillColor(color)
            c.circle(x + 0.28 * cm, y + 1.75 * cm, 0.16 * cm, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 7)
            c.drawCentredString(x + 0.28 * cm, y + 1.67 * cm, num)
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 7.3)
            for j, line in enumerate(label.split("\n")):
                c.drawCentredString(x + box_w / 2, y + 1.25 * cm - j * 0.35 * cm, line)
            if i < len(steps) - 1:
                c.setStrokeColor(GRID)
                c.line(x + box_w, y + 1.1 * cm, x + box_w + 0.25 * cm, y + 1.1 * cm)
        c.setFillColor(LIGHT)
        c.setStrokeColor(GRID)
        c.roundRect(0.2 * cm, 0.35 * cm, self.width - 0.4 * cm, 2.25 * cm, 8, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(0.5 * cm, 2.05 * cm, "Precision rule")
        c.setFillColor(INK)
        c.setFont("Helvetica", 8)
        c.drawString(0.5 * cm, 1.55 * cm, "Never overwrite live stock with a stale snapshot. Convert snapshots to deltas, then merge with live ATS and reservations.")
        c.setFillColor(RED)
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(self.width - 0.55 * cm, 1.05 * cm, "100 -> 150 = +50; 95 live ATS + 50 = 145")


class GanttChart(Flowable):
    def __init__(self):
        super().__init__()
        self.height = 11.8 * cm
        self.months = [
            "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"
        ]
        self.tasks = [
            ("0 Discovery and foundation", 0, 2, BLUE),
            ("1 August quick win", 0, 3, TEAL),
            ("2 Real-time stock and allocation", 3, 4, RED),
            ("3 Catalog and product sync", 5, 3, PURPLE),
            ("4 Order and fulfilment modernization", 7, 4, ORANGE),
            ("5 Mart scale rollout", 9, 4, AMBER),
            ("6 WMS and operations", 11, 3, CYAN),
            ("7 Reporting, AI, optimization", 12, 3, GREEN),
            ("8 Legacy decommission", 14, 1, NAVY),
        ]

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return availWidth, self.height

    def draw(self):
        c = self.canv
        left = 5.9 * cm
        top = self.height - 1.1 * cm
        row_h = 0.83 * cm
        timeline_w = self.width - left - 0.2 * cm
        m_w = timeline_w / len(self.months)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(0, self.height - 0.3 * cm, "Illustrative roadmap Gantt: Jun 2026 to Aug 2027")
        c.setFont("Helvetica-Bold", 6.2)
        for i, m in enumerate(self.months):
            x = left + i * m_w
            c.setFillColor(MUTED)
            c.drawCentredString(x + m_w / 2, top, m)
            c.setStrokeColor(colors.HexColor("#EEF2F6"))
            c.line(x, top - 0.25 * cm, x, top - row_h * len(self.tasks) - 0.25 * cm)
        c.line(left + len(self.months) * m_w, top - 0.25 * cm, left + len(self.months) * m_w, top - row_h * len(self.tasks) - 0.25 * cm)
        for i, (name, start, dur, color) in enumerate(self.tasks):
            y = top - 0.75 * cm - i * row_h
            c.setFillColor(INK)
            c.setFont("Helvetica", 7.1)
            c.drawString(0.1 * cm, y + 0.13 * cm, name)
            c.setFillColor(color)
            c.roundRect(left + start * m_w + 1, y, dur * m_w - 2, 0.43 * cm, 4, fill=1, stroke=0)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.6)
        c.drawString(0.1 * cm, 0.25 * cm, "Assumption: 3 cross-functional squads after foundation; external API certification and infra procurement can shift dates.")


class BarChart(Flowable):
    def __init__(self, title, rows, max_value=None, height=8.5 * cm, unit="MD"):
        super().__init__()
        self.title = title
        self.rows = rows
        self.max_value = max_value or max(v for _, v, _ in rows)
        self.height = height
        self.unit = unit

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return availWidth, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(0, self.height - 0.35 * cm, self.title)
        left = 4.7 * cm
        top = self.height - 1.1 * cm
        row_h = (self.height - 1.55 * cm) / len(self.rows)
        bar_w = self.width - left - 1.25 * cm
        for i, (label, value, color) in enumerate(self.rows):
            y = top - i * row_h
            c.setFillColor(INK)
            c.setFont("Helvetica", 7)
            c.drawRightString(left - 0.2 * cm, y - 0.02 * cm, label)
            c.setFillColor(colors.HexColor("#EEF2F6"))
            c.roundRect(left, y - 0.18 * cm, bar_w, 0.32 * cm, 3, fill=1, stroke=0)
            w = bar_w * value / self.max_value
            c.setFillColor(color)
            c.roundRect(left, y - 0.18 * cm, w, 0.32 * cm, 3, fill=1, stroke=0)
            c.setFillColor(NAVY)
            c.setFont("Helvetica-Bold", 6.8)
            c.drawString(left + w + 0.08 * cm, y - 0.08 * cm, f"{value:,} {self.unit}")


class StackedCapacity(Flowable):
    def __init__(self):
        super().__init__()
        self.height = 5.2 * cm
        self.rows = [
            ("Dev", 123, 165, BLUE),
            ("QA", 48, 52, TEAL),
            ("Tech Lead", 45, 52, ORANGE),
        ]

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return availWidth, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(0, self.height - 0.3 * cm, "August milestone staffing fit")
        left = 2.5 * cm
        top = self.height - 1.2 * cm
        bar_w = self.width - left - 1.5 * cm
        for i, (label, demand, cap, color) in enumerate(self.rows):
            y = top - i * 1.1 * cm
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 7.6)
            c.drawRightString(left - 0.2 * cm, y, label)
            c.setFillColor(colors.HexColor("#EEF2F6"))
            c.roundRect(left, y - 0.2 * cm, bar_w, 0.4 * cm, 4, fill=1, stroke=0)
            c.setFillColor(color)
            c.roundRect(left, y - 0.2 * cm, bar_w * demand / cap, 0.4 * cm, 4, fill=1, stroke=0)
            c.setFillColor(NAVY)
            c.setFont("Helvetica", 7)
            c.drawString(left + bar_w + 0.15 * cm, y - 0.07 * cm, f"{demand}/{cap} MD")
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.8)
        c.drawString(0, 0.25 * cm, "Dev capacity uses the practical high-end estimate; QA is intentionally shown against nominal capacity to expose tightness.")


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 0.55 * cm, PAGE_W, 0.55 * cm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 7.4)
    canvas.drawString(MARGIN_L, PAGE_H - 0.36 * cm, "Phoenix Multi-Channel Marketplace System")
    canvas.setFont("Helvetica", 7.2)
    canvas.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 0.36 * cm, "Proposal and Roadmap")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(MARGIN_L, 0.55 * cm, "Prepared from PRD v1.0.0, 2026-06-02")
    canvas.drawRightString(PAGE_W - MARGIN_R, 0.55 * cm, f"Page {doc.page}")
    canvas.restoreState()


def cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#F7FAFC"))
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 5.0 * cm, PAGE_W, 5.0 * cm, fill=1, stroke=0)
    canvas.setFillColor(BLUE)
    canvas.rect(0, PAGE_H - 5.0 * cm, PAGE_W, 0.28 * cm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 25)
    canvas.drawString(MARGIN_L, PAGE_H - 2.05 * cm, "Phoenix Multi-Channel")
    canvas.drawString(MARGIN_L, PAGE_H - 3.0 * cm, "Marketplace System")
    canvas.setFont("Helvetica", 11)
    canvas.drawString(MARGIN_L, PAGE_H - 3.8 * cm, "Replacement proposal, implementation roadmap, and effort estimate")
    canvas.setFillColor(NAVY)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(MARGIN_L, 2.5 * cm, "Prepared: 2026-06-17")
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN_L, 2.0 * cm, "Source: Lotus's Marketplace System PRD v1.0.0")
    canvas.drawRightString(PAGE_W - MARGIN_R, 2.0 * cm, "Senior Solution Architect assessment")
    canvas.restoreState()


def build_story():
    story = []

    story += [Spacer(1, 5.0 * cm)]
    story += [
        KPIBand(
            [
                ("Total SKU universe", "200k", "Product master scale", BLUE),
                ("Marketplace load", "20k", "SKU per marketplace", TEAL),
                ("Mart footprint", "2,000", "Stores per mart model", ORANGE),
                ("Mart SKU fanout", "10k", "SKU per store", PURPLE),
            ]
        )
    ]
    story += [Spacer(1, 0.35 * cm)]
    story += [
        p(
            "<b>Recommendation:</b> deliver a Price and Promotion Delta Sync production pilot for Shopee and Lazada by end of August, run TikTok in dry-run, and build a contained Redis ATS proof of concept. This attacks midnight campaign SLA misses first while proving the architecture needed to remove overselling in the next phase."
        )
    ]
    story += [PageBreak()]

    story += [p("Executive View", "H1x")]
    story += [
        p(
            "The legacy system is batch-centric and constrained by a single SQL Server database. Phoenix should be an event-driven replacement using Go microservices, Kafka, Redis, PostgreSQL, and a Next.js operations UI."
        ),
        p(
            "The migration should use a strangler pattern. Phoenix takes ownership feature by feature while the old system remains available as fallback during pilot and cutover windows."
        ),
        KPIBand(
            [
                ("August scope", "216 MD", "123 dev + 48 QA + 45 lead", BLUE),
                ("Full roadmap", "2,938 MD", "All phases incl. decommission", PURPLE),
                ("Quick win", "Price/Promo", "Fastest route to campaign SLA", TEAL),
                ("Next unlock", "ATS", "Near-real-time stock precision", RED),
            ]
        ),
    ]
    story += [Spacer(1, 0.25 * cm)]
    story += [
        table(
            [
                ["Pain point", "Phoenix response", "Expected business effect"],
                ["SQL Server bottleneck and cost", "PostgreSQL SoT, Kafka orchestration, Redis realtime cache", "Horizontal scale and lower write contention"],
                ["Overselling due to stale stock", "Delta stock ingestion plus Redis ATS and reservations", "Near-zero internal-latency oversell root cause"],
                ["Price/promo misses midnight SLA", "Changed-SKU-only sync with campaign dashboard", "Higher double-date eligibility"],
                ["Channel downtime blocks batches", "Isolated adapters with DLQ, retries, and rate-limit queues", "Failure containment per platform"],
            ],
            [4.1 * cm, 7.0 * cm, 6.0 * cm],
        )
    ]
    story += [PageBreak()]

    story += [p("Target Architecture", "H1x"), ArchitectureDiagram()]
    story += [
        p(
            "The architecture separates source-of-truth state, real-time decisioning, event orchestration, and platform-specific adapters. That separation is the main lever for scale and operational recovery."
        )
    ]
    story += [PageBreak()]

    story += [p("Precision Flow", "H1x"), FlowDiagram()]
    story += [
        table(
            [
                ["Layer", "Responsibility"],
                ["ERP/R10/Stock Service ingestion", "Consume snapshots or source events and preserve raw input references."],
                ["Delta services", "Compare source versions and emit relative changes instead of overwriting live state."],
                ["Redis ATS", "Atomically merge ERP deltas with live orders, reservations, damage, flash reserve, and cancellations."],
                ["Allocation service", "Distribute ATS by share rules, velocity, safety stock, channel priority, and channel health."],
                ["Channel adapters", "Enforce a shared 100 requests/minute quota, dynamic bulk sizing up to 100 items, priorities, and retries."],
            ],
            [4.7 * cm, 12.4 * cm],
        )
    ]
    story += [PageBreak()]

    story += [p("August Milestone Options", "H1x")]
    story += [
        table(
            [
                ["Option", "Scope", "Effort", "Impact", "Complexity", "Recommendation"],
                ["A. Stock ATS", "Real-time stock pilot with Redis ATS and reservations", "180 MD", "Very high for oversell", "High", "Defer production cutover; keep POC"],
                ["B. Price/Promo Delta", "Delta sync for Shopee/Lazada, TikTok dry-run", "158 MD", "Very high for campaign SLA", "Medium-high", "Recommended quick win"],
                ["C. Observability", "Legacy mirror, dashboards, pre-campaign readiness", "116 MD", "Medium", "Medium", "Useful but not enough alone"],
            ],
            [2.8 * cm, 5.3 * cm, 1.8 * cm, 2.9 * cm, 2.2 * cm, 2.1 * cm],
        ),
        Spacer(1, 0.3 * cm),
        p("Recommended August scope", "H2x"),
        table(
            [
                ["Deliverable", "Target"],
                ["Price/promotion delta engine", "Production pilot"],
                ["Channels", "Shopee + Lazada production pilot; TikTok dry-run or limited pilot"],
                ["Dataset", "All mapped Auto SKUs for selected channels, or campaign SKUs if API limits are tight"],
                ["SLA", "Pilot sync within 30 minutes; stretch under 5 minutes for changed SKUs"],
                ["Dashboard", "Readiness, pending sync, failed sync, DLQ, API success rate"],
                ["Redis ATS", "Technical proof of concept only, not production cutover"],
            ],
            [4.4 * cm, 12.7 * cm],
        ),
    ]
    story += [PageBreak()]

    story += [p("August Staffing and Effort", "H1x"), StackedCapacity()]
    story += [
        table(
            [
                ["Workstream", "Dev MD", "QA MD", "Tech Lead MD"],
                ["Discovery and reverse engineering", "10", "2", "5"],
                ["Architecture and contracts", "5", "1", "6"],
                ["PostgreSQL schemas and sync ledger", "7", "2", "3"],
                ["Kafka command/result flow", "7", "2", "3"],
                ["R10/LDD ingestion", "12", "3", "3"],
                ["Price/promotion engine", "15", "5", "4"],
                ["Channel adapter: Shopee", "13", "5", "2"],
                ["Channel adapter: Lazada", "11", "5", "2"],
                ["TikTok dry-run adapter", "8", "3", "1"],
                ["Dashboard and admin API", "12", "4", "2"],
                ["Performance test harness", "7", "6", "3"],
                ["UAT, release, parallel run", "7", "8", "8"],
                ["Redis ATS proof of concept", "9", "2", "3"],
                ["Total", "123", "48", "45"],
            ],
            [8.3 * cm, 2.7 * cm, 2.7 * cm, 3.4 * cm],
        )
    ]
    story += [PageBreak()]

    story += [p("Full Roadmap Timeline", "H1x"), GanttChart()]
    story += [
        p(
            "The roadmap is intentionally overlapped after the foundation period. With one squad, this is a multi-year rewrite. With three cross-functional squads, a major replacement can fit into roughly 10 to 14 months after foundation, assuming platform API certification and infrastructure readiness do not become blockers."
        )
    ]
    story += [PageBreak()]

    phase_rows = [
        ("P0 Foundation", 175, BLUE),
        ("P1 August quick win", 203, TEAL),
        ("P2 Stock allocation", 420, RED),
        ("P3 Catalog sync", 300, PURPLE),
        ("P4 Orders", 520, ORANGE),
        ("P5 Mart scale", 460, AMBER),
        ("P6 WMS ops", 340, CYAN),
        ("P7 Reporting/AI", 300, GREEN),
        ("P8 Decommission", 220, NAVY),
    ]
    story += [p("Effort Distribution", "H1x"), BarChart("Phase effort in mandays", phase_rows, unit="MD")]
    story += [
        table(
            [
                ["Phase", "Scope", "Mandays"],
                ["0 Foundation", "Adapter reverse engineering, contracts, environments, CI/CD, observability", "175"],
                ["1 August Quick Win", "Price/promo pilot, dashboards, TikTok dry-run, ATS POC", "203"],
                ["2 Real-Time Stock", "Stock Service delta, Redis ATS, reservations, allocation, stock sync", "420"],
                ["3 Catalog Sync", "RMS delta, seller products, mappings, parameters, product sync", "300"],
                ["4 Orders", "Order ingestion, WMS routing, AWB, capture sale, status sync", "520"],
                ["5 Mart Scale", "Store-level fanout for Shopee Mart, LINE MAN, Grab, Hato", "460"],
                ["6 WMS Ops", "PO/BOL, IBT, pallet, truck, operations screens", "340"],
                ["7 Reporting/AI", "BI, predictive allocation, simulator, anomaly detection", "300"],
                ["8 Decommission", "Migration, reconciliation, cutover, SQL Server retirement", "220"],
                ["Total", "", "2,938"],
            ],
            [3.1 * cm, 11.4 * cm, 2.6 * cm],
        )
    ]
    story += [PageBreak()]

    story += [p("Feature-Level Hours", "H1x")]
    feature_phase_rows = [
        ("P0 Foundation", 1400, BLUE),
        ("P1 August", 1620, TEAL),
        ("P2 Stock", 3360, RED),
        ("P3 Catalog", 2400, PURPLE),
        ("P4 Orders", 4160, ORANGE),
        ("P5 Mart", 3680, AMBER),
        ("P6 WMS", 2720, CYAN),
        ("P7 Reporting/AI", 2400, GREEN),
        ("P8 Decommission", 1760, NAVY),
    ]
    story += [BarChart("Feature-level effort in manhours", feature_phase_rows, unit="hrs", height=7.8 * cm)]
    story += [
        table(
            [
                ["Phase", "Top effort drivers"],
                ["P1 August", "R10 ingestion, price engine, Shopee/Lazada adapters, reconciliation, ATS POC."],
                ["P2 Stock", "Redis ATS, reservations, allocation, channel stock adapters, load and recovery testing."],
                ["P4 Orders", "Channel order ingestion, WMS routing, split tracking, AWB, capture sale, parallel run."],
                ["P5 Mart", "2,000-store fanout, store-level queues, rate limits, sharding, load testing."],
            ],
            [3.2 * cm, 13.9 * cm],
        )
    ]
    story += [PageBreak()]

    story += [p("Migration Strategy", "H1x")]
    story += [
        table(
            [
                ["Step", "Migration slice", "Why it comes here"],
                ["1", "Observability wrapper over current system", "Expose current bottlenecks and establish baseline SLAs."],
                ["2", "Price and stock delta pilot", "Prove event-driven sync while old system remains fallback."],
                ["3", "Real-time ATS and allocation", "Address overselling and remove stale overwrite failure mode."],
                ["4", "Catalog sync", "Normalize seller SKU mapping and product parameters."],
                ["5", "Order and fulfilment", "Move high-complexity flows after stock correctness is stable."],
                ["6", "WMS and reporting", "Modernize warehouse operations and executive visibility."],
                ["7", "Legacy decommission", "Retire SQL Server workloads after reconciliation and cutover."],
            ],
            [1.4 * cm, 6.2 * cm, 9.5 * cm],
        ),
        Spacer(1, 0.35 * cm),
        p("Reverse engineering value", "H2x"),
        p("Old .NET adapters should reduce discovery and implementation effort by around 25% to 40% for known channels if the source is clean. The deliverable should be adapter behavior specs and contract tests, not line-by-line ports."),
    ]
    story += [PageBreak()]

    story += [p("Non-Functional Targets", "H1x")]
    story += [
        table(
            [
                ["Capability", "PRD target", "Phoenix target"],
                ["RMS product sync", "Daily, within 30 minutes", "Delta publication within 15 minutes after source availability; daily reconciliation."],
                ["Product pull", "Every 4 hours", "Every 1 hour for active channels, configurable."],
                ["Stock allocation + sync", "Within 5 minutes", "p95 under 60 seconds for changed stock; campaign SKUs under 15 seconds where APIs allow."],
                ["Price/promotion sync", "Within 5 minutes", "Changed SKU p95 under 5 minutes only when the changed set fits the certified quota and batch envelope."],
                ["Seller outbound capacity", "Not defined", "Use 80 of 100 requests/minute normally; reserve 20 for urgent work/retries; 100 items/request is not guaranteed."],
                ["Order poll to RTS", "p95 under 1 minute", "Keep or improve; use webhook where platforms support it."],
                ["Capture sale", "p95 under 5 seconds", "Keep p95 under 5 seconds with idempotent retry."],
                ["API success", "99%", "99.5% platform-adjusted, excluding confirmed platform outage."],
                ["Oversell prevention", "Not met today", "Near-zero oversell caused by internal stock latency."],
            ],
            [4.0 * cm, 4.2 * cm, 8.9 * cm],
        )
    ]
    story += [PageBreak()]

    story += [p("Risks and Controls", "H1x")]
    story += [
        table(
            [
                ["Risk", "Impact", "Mitigation"],
                ["Platform quota or smaller bulk size", "Miss campaign SLA", "Shared 80/20 quota budget, dynamic batches, drain-time forecast, priority queues, and changed-SKU-only sync."],
                [".NET adapter source is outdated", "Lower reverse-engineering benefit", "Week-1 source audit, behavior specs, contract tests before porting."],
                ["Late source data from R10/RMS/Stock Service", "Phoenix cannot meet end-to-end SLA alone", "Dashboard source arrival separately from Phoenix processing and platform acceptance."],
                ["Redis outage or drift", "Stock correctness risk", "PostgreSQL stock ledger, Kafka replay, scheduled reconciliation."],
                ["Mart scale explosion", "Performance and cost risk", "Store-level sharding, fanout scheduler, rate-limit queues, phased rollout."],
                ["QA bottleneck", "August delivery risk", "Automated reconciliation, reduce TikTok to dry-run, synthetic test data from week 1."],
            ],
            [4.3 * cm, 4.0 * cm, 8.8 * cm],
        )
    ]
    story += [PageBreak()]

    story += [p("Attention-Grabbing Later Features", "H1x")]
    story += [
        table(
            [
                ["Feature", "Value"],
                ["Campaign Command Center", "Shows product eligibility, price readiness, stock readiness, backlog, and risk score for double-date events."],
                ["Predictive Stock Allocation", "Uses sales velocity, channel conversion, campaign calendar, and margin to allocate ATS before spikes."],
                ["SLA Autopilot", "Pauses low-priority sync and prioritizes campaign SKUs when midnight SLA risk rises."],
                ["Oversell Root-Cause Explorer", "Links oversold orders to stock event, reservation, platform sync attempt, response, and timing gap."],
                ["Digital Twin Sync Simulator", "Runs what-if scenarios for 200k SKUs and 2,000 mart stores before campaign go-live."],
                ["Adapter Certification Lab", "Contract tests and sandbox tests certify channel adapters before deployment."],
                ["AI Operations Assistant", "Summarizes failures, suggests remediation, and drafts incident updates."],
                ["Executive Revenue Protection Dashboard", "Estimates revenue at risk from sync delay, stockout, oversell, or campaign ineligibility."],
            ],
            [5.3 * cm, 11.8 * cm],
        )
    ]
    story += [PageBreak()]

    story += [p("August Acceptance Criteria", "H1x")]
    story += [
        table(
            [
                ["Area", "Acceptance criteria"],
                ["Price/promo delta", "Only changed Auto SKUs generate sync commands; Manual SKUs are skipped with reason."],
                ["Clubpack", "Clubpack price calculation matches legacy output for sampled SKUs."],
                ["Promotion", "Active and expired promotion decisions match R10/LDD rules."],
                ["Channel adapters", "Shopee and Lazada pilot adapters send updates, handle retries, and record platform responses."],
                ["Performance", "200k SKU scan completes and changed-SKU command generation stays within agreed SLA."],
                ["Seller quota", "All replicas combined stay within 100 requests/minute; batch sizes 1/20/50/100 and 429 retries are tested."],
                ["Campaign readiness", "Dashboard shows total SKUs, eligible SKUs, pending sync, failed sync, DLQ, and platform acceptance."],
                ["Reconciliation", "Phoenix pilot output compares against legacy by SKU, channel, price, promotion, timestamp, and status."],
                ["Fallback", "Operations can disable Phoenix writes and return selected scope to legacy sync."],
                ["ATS POC", "Redis Lua script demonstrates atomic ERP delta plus live deduction merge with deterministic replay test."],
            ],
            [4.3 * cm, 12.8 * cm],
        )
    ]
    story += [Spacer(1, 0.35 * cm), p("Next step: confirm August pilot scope and run the one-week .NET adapter/API audit before implementation starts.", "H2x")]
    return story


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    doc = SimpleDocTemplate(
        OUT,
        pagesize=A4,
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
        topMargin=MARGIN_T,
        bottomMargin=MARGIN_B,
        title="Phoenix Multi-Channel Marketplace System Proposal",
        author="Codex",
    )
    doc.build(build_story(), onFirstPage=cover, onLaterPages=header_footer)
    print(OUT)


if __name__ == "__main__":
    main()
