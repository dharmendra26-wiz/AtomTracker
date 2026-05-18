#!/usr/bin/env python3
"""
Generate AtomTracker hackathon SUBMISSION.pdf (single document:
live links, repository URL, architecture diagrams).

Requires: pip install reportlab pillow
Run from repo root: python scripts/generate_submission_pdf.py
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image as RLImage,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "SUBMISSION.pdf"
IMG_ARCH = ROOT / "docs" / "architecture.png"
IMG_SEQ = ROOT / "docs" / "request-lifecycle.png"

FRONTEND = "https://atom-tracker-rust.vercel.app"
BACKEND = "https://atomtracker.onrender.com"
DOCS = "https://atomtracker.onrender.com/docs"
SETUP = "https://atomtracker.onrender.com/setup-demo"
GITHUB = "https://github.com/dharmendra26-wiz/AtomTracker"


def _img_dims(path: Path, max_w: float) -> tuple[float, float]:
    try:
        from PIL import Image as PILImage
    except ImportError:
        raise SystemExit("Install pillow: pip install pillow") from None
    with PILImage.open(path) as im:
        w, h = im.size
    scale = max_w / w
    return w * scale, h * scale


def _hp(url: str, label: str | None = None, style: ParagraphStyle | None = None) -> Paragraph:
    """Hyperlinked paragraph (clickable URL in PDF)."""
    assert style is not None
    text = label or url
    safe = text.replace("&", "&amp;").replace("<", "&lt;")
    return Paragraph(f'<a href="{url}" color="#1e40af"><u>{safe}</u></a>', style)


def build_pdf(path: Path) -> None:
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        name="Title",
        parent=styles["Heading1"],
        fontSize=22,
        leading=28,
        alignment=TA_CENTER,
        spaceAfter=12,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
    )
    subtitle = ParagraphStyle(
        name="Subtitle",
        parent=styles["Normal"],
        fontSize=11,
        leading=15,
        alignment=TA_CENTER,
        spaceAfter=24,
        textColor=colors.HexColor("#475569"),
    )
    h1 = ParagraphStyle(
        name="H1",
        parent=styles["Heading1"],
        fontSize=16,
        leading=20,
        spaceBefore=18,
        spaceAfter=10,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
    )
    h2 = ParagraphStyle(
        name="H2",
        parent=styles["Heading2"],
        fontSize=12,
        leading=15,
        spaceBefore=12,
        spaceAfter=6,
        textColor=colors.HexColor("#334155"),
        fontName="Helvetica-Bold",
    )
    body = ParagraphStyle(
        name="Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        alignment=TA_LEFT,
        spaceAfter=8,
        textColor=colors.HexColor("#334155"),
    )
    small = ParagraphStyle(
        name="Small",
        parent=body,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#64748b"),
    )
    link_style = ParagraphStyle(
        name="LinkBody",
        parent=body,
        fontName="Helvetica",
    )

    story: list = []

    story.append(Paragraph("AtomTracker", title))
    story.append(
        Paragraph(
            "In-House Goal Setting &amp; Tracking Portal &mdash; Hackathon Submission",
            subtitle,
        )
    )
    story.append(
        Paragraph(
            f"<i>Generated {date.today().isoformat()} &middot; Single-document submission "
            "(live deployment, source repository, architecture).</i>",
            small,
        )
    )
    story.append(Spacer(1, 0.15 * inch))

    story.append(Paragraph("1. Live working deployment", h1))
    story.append(
        Paragraph(
            "Production frontend (Vercel), API (Render), and interactive OpenAPI docs. "
            "The Render free tier may cold-start after idle periods; the first request can take "
            "about 30 seconds &mdash; refresh once if needed.",
            body,
        )
    )

    links_tbl = Table(
        [
            ["Component", "URL"],
            ["Frontend (SPA)", FRONTEND],
            ["Backend API", BACKEND],
            ["API documentation", DOCS],
            ["Demo seed (idempotent)", SETUP],
        ],
        colWidths=[1.55 * inch, 5 * inch],
    )
    links_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(links_tbl)
    story.append(Spacer(1, 0.08 * inch))

    story.append(Paragraph("Clickable links (same URLs as above):", h2))
    story.append(_hp(FRONTEND, FRONTEND, link_style))
    story.append(_hp(BACKEND, BACKEND, link_style))
    story.append(_hp(DOCS, DOCS, link_style))
    story.append(_hp(SETUP, SETUP, link_style))

    story.append(Paragraph("Demo login credentials", h2))
    demo_tbl = Table(
        [
            ["Role", "Email", "Password"],
            ["Admin", "admin@test.com", "admin"],
            ["Manager", "manager@test.com", "manager"],
            ["Employee", "employee@test.com", "employee"],
        ],
        colWidths=[1.1 * inch, 2.6 * inch, 1.2 * inch],
    )
    demo_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3730a3")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#eef2ff")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c7d2fe")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(demo_tbl)

    story.append(Paragraph("2. Source code repository", h1))
    story.append(
        Paragraph(
            "Full-stack implementation (FastAPI + SQLite backend, React + Vite frontend). "
            "README contains local setup, demo flow, and feature overview.",
            body,
        )
    )
    story.append(_hp(GITHUB, GITHUB, link_style))

    story.append(Paragraph("Repository layout", h2))
    story.append(
        Paragraph(
            "<font face='Courier' size='9'>atomtracker/<br/>"
            "&nbsp;&nbsp;backend/&nbsp;&nbsp;&nbsp;&nbsp;# FastAPI, SQLAlchemy, JWT<br/>"
            "&nbsp;&nbsp;frontend/&nbsp;&nbsp;# React 19, Tailwind v4, react-router</font>",
            body,
        )
    )

    story.append(Paragraph("3. System architecture", h1))
    story.append(
        Paragraph(
            "Two-tier architecture: React SPA communicates with FastAPI over REST/JSON. "
            "Authentication uses HS256 JWTs in the <b>Authorization: Bearer</b> header; RBAC is "
            "enforced server-side. Persistence is SQLite via SQLAlchemy (Postgres-ready via "
            "configuration). Shared KPIs use a <b>source_goal_id</b> self-reference on goals so "
            "cascaded copies inherit check-ins from the primary goal.",
            body,
        )
    )

    max_img_w = 6.5 * inch
    if not IMG_ARCH.exists() or not IMG_SEQ.exists():
        raise SystemExit(f"Missing diagram PNGs under docs/. Expected:\n  {IMG_ARCH}\n  {IMG_SEQ}")

    story.append(Paragraph("Figure A &mdash; High-level system architecture", h2))
    aw, ah = _img_dims(IMG_ARCH, max_img_w)
    story.append(RLImage(str(IMG_ARCH), width=aw, height=ah))
    story.append(Spacer(1, 0.12 * inch))

    story.append(
        Paragraph(
            "Figure B &mdash; Request lifecycle (example: employee logs quarterly progress)",
            h2,
        )
    )
    sw, sh = _img_dims(IMG_SEQ, max_img_w)
    story.append(RLImage(str(IMG_SEQ), width=sw, height=sh))

    story.append(Paragraph("Architectural decisions (summary)", h2))
    decisions = [
        ["Decision", "Rationale"],
        [
            "JWT in Authorization header",
            "Stateless API; simple CORS; no cookie CSRF surface",
        ],
        [
            "Generic AuditLog (entity_type, entity_id)",
            "One pattern for sheets, goals, check-ins, cascades; easy to extend",
        ],
        [
            "Audit in same DB transaction",
            "Change and log commit together &mdash; no orphan audit rows",
        ],
        [
            "Shared goals via source_goal_id",
            "Single source of truth for actuals; copies stay aligned automatically",
        ],
        [
            "Server-side validation",
            "UI hints only; weights, roles, and ownership re-checked on every request",
        ],
    ]
    dec_tbl = Table(decisions, colWidths=[1.65 * inch, 4.85 * inch])
    dec_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdfa")]),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#ccfbf1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(dec_tbl)

    story.append(PageBreak())
    story.append(Paragraph("Appendix &mdash; Requirements traceability", h1))
    story.append(
        Paragraph(
            "Mapping from the hackathon problem statement to shipped capabilities "
            "(representative API surface).",
            body,
        )
    )
    brd = [
        ["Requirement", "Shipped", "API / mechanism"],
        ["RBAC: Employee, Manager, Admin", "Yes", "JWT + require_role"],
        ["Up to 8 goals; min weight 10; total 100%", "Yes", "POST /sheets/{id}/goals, .../submit"],
        ["Manager approves / locks sheet", "Yes", "POST /sheets/{id}/approve"],
        ["Return for rework with comment", "Yes", "POST /sheets/{id}/reject"],
        ["Manager pre-approval edits (target/weight)", "Yes", "POST /goals/{id}/override"],
        ["Quarterly check-ins + scoring by UoM", "Yes", "POST /goals/{id}/checkins, GET .../progress"],
        ["Manager feedback on check-in", "Yes", "POST /checkins/{id}/comment"],
        ["Shared / cascaded KPIs", "Yes", "POST /goals/{id}/cascade + source_goal_id"],
        ["Admin override + audit trail", "Yes", "override + AuditLog rows"],
        ["Completion visibility by quarter", "Yes", "GET /completion"],
        ["Audit explorer + CSV export", "Yes", "GET /audit-logs*, GET /reports/achievements.csv"],
        ["Org analytics", "Yes", "GET /analytics"],
    ]
    brd_tbl = Table(brd, colWidths=[2.05 * inch, 0.62 * inch, 3.83 * inch])
    brd_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#312e81")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f3ff")]),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#ddd6fe")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ALIGN", (1, 1), (1, -1), "CENTER"),
            ]
        )
    )
    story.append(brd_tbl)

    story.append(Spacer(1, 0.2 * inch))
    story.append(
        Paragraph(
            "<b>Built with:</b> FastAPI &middot; SQLAlchemy 2 &middot; PyJWT &middot; bcrypt "
            "&middot; React 19 &middot; Vite 8 &middot; Tailwind CSS v4 &middot; react-router-dom v7",
            small,
        )
    )

    def _footer(cv: canvas.Canvas, _doc: SimpleDocTemplate) -> None:
        cv.saveState()
        cv.setFont("Helvetica", 8)
        cv.setFillColor(colors.HexColor("#94a3b8"))
        cv.drawCentredString(A4[0] / 2, 0.45 * inch, "AtomTracker — submission package")
        cv.restoreState()

    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.75 * inch,
        title="AtomTracker Hackathon Submission",
        author="AtomTracker Team",
    )
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    print(f"Wrote {path}")


def main() -> None:
    build_pdf(OUT)


if __name__ == "__main__":
    main()
