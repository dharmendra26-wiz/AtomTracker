"""
AtomTracker — Hackathon Submission PDF Generator
Generates SUBMISSION.pdf with proper clickable hyperlink annotations.
Run: python scripts/generate_pdf.py
"""
import os, textwrap
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

W, H = A4  # 595 x 842 pt
OUT = os.path.join(os.path.dirname(__file__), "..", "SUBMISSION.pdf")
SCREENSHOTS = os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots")
ARCH_IMG    = os.path.join(os.path.dirname(__file__), "..", "docs", "architecture_diagram.png")

# ── Colours ────────────────────────────────────────────────
INDIGO     = HexColor("#4f46e5")
INDIGO_DARK= HexColor("#1e1b4b")
INDIGO_MID = HexColor("#312e81")
INDIGO_LITE= HexColor("#ede9fe")
INDIGO_TEXT= HexColor("#3730a3")
SLATE      = HexColor("#334155")
SLATE_LITE = HexColor("#f1f5f9")
SLATE_MID  = HexColor("#94a3b8")
AMBER      = HexColor("#fef3c7")
AMBER_TEXT = HexColor("#92400e")
GREEN_LITE = HexColor("#d1fae5")
GREEN_TEXT = HexColor("#065f46")
BORDER     = HexColor("#e0e7ff")
BG_CARD    = HexColor("#f8f7ff")
CHECK_GRN  = HexColor("#059669")

# ── Helpers ────────────────────────────────────────────────
def draw_rounded_rect(c, x, y, w, h, r=4, fill=None, stroke=None, lw=1):
    if fill:   c.setFillColor(fill)
    if stroke: c.setStrokeColor(stroke); c.setLineWidth(lw)
    else:      c.setStrokeColor(HexColor("#00000000"))
    c.roundRect(x, y, w, h, r, fill=1 if fill else 0, stroke=1 if stroke else 0)

def clickable_link(c, x, y, w, h, url):
    """Add a PDF URI annotation rectangle — guarantees clickability."""
    c.linkURL(url, (x, y, x+w, y+h), relative=0)

def wrap_text(text, width_chars):
    return textwrap.wrap(text, width_chars)

# ── Page tracker ────────────────────────────────────────────
class PDF:
    def __init__(self, path):
        self.c = canvas.Canvas(path, pagesize=A4)
        self.c.setTitle("AtomTracker — Hackathon Submission")
        self.c.setAuthor("Dharmendra")
        self.c.setSubject("Atomquest Hackathon 1.0 Submission")
        self.page = 0

    def new_page(self):
        if self.page > 0:
            self.c.showPage()
        self.page += 1

    def save(self):
        self.c.save()
        print(f"[OK] Saved -> {OUT}")


# ═══════════════════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════════════════
def cover(pdf):
    c = pdf.c
    pdf.new_page()

    # Dark gradient background (simulate with solid)
    draw_rounded_rect(c, 0, 0, W, H, r=0, fill=INDIGO_DARK)

    # Tag pill
    pill_y = H - 60
    draw_rounded_rect(c, 30*mm, pill_y-6, 80*mm, 14, r=7,
                      fill=HexColor("#ffffff26"), stroke=HexColor("#ffffff4d"), lw=0.5)
    c.setFillColor(HexColor("#a5b4fc"))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(33*mm, pill_y-2, "ATOMQUEST HACKATHON 1.0  —  SUBMISSION")

    # Title
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 38)
    c.drawString(30*mm, H-90, "Atom")
    title_w = c.stringWidth("Atom", "Helvetica-Bold", 38)
    c.setFillColor(HexColor("#a5b4fc"))
    c.drawString(30*mm + title_w, H-90, "Tracker")

    # Subtitle
    c.setFillColor(HexColor("#c7d2fe"))
    c.setFont("Helvetica", 11)
    sub = "In-House Goal Setting & Tracking Portal — replaces fragile Excel"
    sub2 = "sheets with 100% weight enforcement, quarterly scoring & audit trail."
    c.drawString(30*mm, H-110, sub)
    c.drawString(30*mm, H-123, sub2)

    # ── Link cards ────────────────────────────────────────
    links = [
        ("🌐", "LIVE WORKING LINK", "https://atom-tracker-rust.vercel.app"),
        ("📦", "SOURCE CODE (GITHUB)", "https://github.com/dharmendra26-wiz/AtomTracker"),
        ("📄", "API DOCS (SWAGGER)", "https://atomtracker.onrender.com/docs"),
    ]
    cy = H - 155
    for icon, label, url in links:
        lx, lw_box, lh = 30*mm, W - 60*mm, 22
        draw_rounded_rect(c, lx, cy-lh+6, lw_box, lh, r=5,
                          fill=HexColor("#ffffff14"), stroke=HexColor("#ffffff33"), lw=0.5)
        c.setFillColor(HexColor("#a5b4fc"))
        c.setFont("Helvetica-Bold", 7)
        c.drawString(lx+28, cy-3, label)
        c.setFillColor(white)
        c.setFont("Helvetica", 9)
        c.drawString(lx+28, cy-13, url)
        # Real clickable PDF link annotation
        clickable_link(c, lx, cy-lh+6, lw_box, lh, url)
        cy -= 28

    # ── Stats row ─────────────────────────────────────────
    stats = [("3","Roles"),("4","Quarters"),("100%","Weight\nEnforced"),("8","Max Goals"),("∞","Audit Trail")]
    sx = 30*mm
    sw = (W - 60*mm) / len(stats)
    sy = H - 285
    draw_rounded_rect(c, 30*mm, sy-14, W-60*mm, 1, r=0, fill=HexColor("#ffffff26"))
    sy -= 22
    for val, lbl in stats:
        c.setFillColor(HexColor("#a5b4fc"))
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(sx + sw/2, sy, val)
        c.setFillColor(HexColor("#c7d2fe"))
        c.setFont("Helvetica", 7)
        for i, ln in enumerate(lbl.split("\n")):
            c.drawCentredString(sx + sw/2, sy-10-i*8, ln)
        sx += sw

    # ── Demo credentials ──────────────────────────────────
    cred_y = H - 370
    c.setFillColor(HexColor("#ffffff1a"))
    draw_rounded_rect(c, 30*mm, cred_y-52, W-60*mm, 62, r=6,
                      fill=HexColor("#ffffff14"), stroke=HexColor("#ffffff33"), lw=0.5)
    c.setFillColor(HexColor("#a5b4fc"))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(33*mm, cred_y+2, "DEMO LOGIN CREDENTIALS")
    rows = [
        ("Admin",    "admin@test.com",    "admin",    "#d1fae5","#065f46"),
        ("Manager",  "manager@test.com",  "manager",  "#fef3c7","#92400e"),
        ("Employee", "employee@test.com", "employee", "#ede9fe","#3730a3"),
    ]
    ry = cred_y - 14
    for role, email, pw, bg, fg in rows:
        draw_rounded_rect(c, 33*mm, ry-8, 18, 11, r=3, fill=HexColor(bg))
        c.setFillColor(HexColor(fg))
        c.setFont("Helvetica-Bold", 6.5)
        c.drawCentredString(42*mm, ry-2, role)
        c.setFillColor(white)
        c.setFont("Helvetica", 8)
        c.drawString(55*mm, ry-2, f"{email}  /  {pw}")
        ry -= 15

    # ── Page number ───────────────────────────────────────
    c.setFillColor(HexColor("#ffffff4d"))
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 18, "1")

# ═══════════════════════════════════════════════════════════
# CONTENT PAGES helper state
# ═══════════════════════════════════════════════════════════
class ContentPage:
    MARGIN = 22*mm
    TOP    = H - 28*mm
    BOTTOM = 22*mm
    W_INNER= W - 44*mm

    def __init__(self, pdf):
        self.pdf = pdf
        self.c   = pdf.c
        self.y   = self.TOP
        self._start_new_page()

    def _start_new_page(self):
        self.pdf.new_page()
        self.y = self.TOP
        # Header bar
        draw_rounded_rect(self.c, 0, H-15*mm, W, 15*mm, r=0, fill=INDIGO_DARK)
        self.c.setFillColor(white)
        self.c.setFont("Helvetica-Bold", 9)
        self.c.drawString(self.MARGIN, H-9*mm, "AtomTracker")
        self.c.setFillColor(HexColor("#a5b4fc"))
        self.c.setFont("Helvetica", 8)
        self.c.drawRightString(W-self.MARGIN, H-9*mm, f"Atomquest Hackathon 1.0  ·  Page {self.pdf.page}")

    def check_space(self, need):
        if self.y - need < self.BOTTOM:
            self._start_new_page()

    def section(self, num, title):
        self.check_space(30)
        self.y -= 8
        draw_rounded_rect(self.c, self.MARGIN, self.y-4, 8, 14, r=2, fill=INDIGO)
        self.c.setFillColor(white)
        self.c.setFont("Helvetica-Bold", 7)
        self.c.drawCentredString(self.MARGIN+4, self.y+1, str(num))
        self.c.setFillColor(INDIGO_DARK)
        self.c.setFont("Helvetica-Bold", 13)
        self.c.drawString(self.MARGIN+12, self.y+1, title)
        self.y -= 20
        # Rule
        self.c.setStrokeColor(BORDER)
        self.c.setLineWidth(1)
        self.c.line(self.MARGIN, self.y+6, W-self.MARGIN, self.y+6)
        self.y -= 4

    def h3(self, title):
        self.check_space(20)
        self.y -= 6
        self.c.setFillColor(INDIGO_MID)
        self.c.setFont("Helvetica-Bold", 10)
        self.c.drawString(self.MARGIN, self.y, title)
        self.y -= 14

    def para(self, text, color=SLATE, size=8.5, indent=0):
        lines = wrap_text(text, 95)
        for ln in lines:
            self.check_space(12)
            self.c.setFillColor(color)
            self.c.setFont("Helvetica", size)
            self.c.drawString(self.MARGIN+indent, self.y, ln)
            self.y -= 11
        self.y -= 2

    def link_card(self, label, url, icon="→"):
        self.check_space(30)
        lh = 24
        draw_rounded_rect(self.c, self.MARGIN, self.y-lh+6, self.W_INNER, lh, r=5,
                          fill=BG_CARD, stroke=BORDER, lw=0.8)
        # Icon box
        draw_rounded_rect(self.c, self.MARGIN+4, self.y-lh+9, 16, 16, r=4, fill=INDIGO)
        self.c.setFillColor(white)
        self.c.setFont("Helvetica-Bold", 8)
        self.c.drawCentredString(self.MARGIN+12, self.y-lh+14, icon)
        # Label
        self.c.setFillColor(INDIGO)
        self.c.setFont("Helvetica-Bold", 7)
        self.c.drawString(self.MARGIN+25, self.y-3, label)
        # URL
        self.c.setFillColor(SLATE)
        self.c.setFont("Helvetica", 8)
        self.c.drawString(self.MARGIN+25, self.y-13, url)
        # Clickable annotation covering the whole card
        clickable_link(self.c, self.MARGIN, self.y-lh+6, self.W_INNER, lh, url)
        self.y -= lh + 4

    def feature_row(self, emoji, title, desc):
        self.check_space(36)
        bx, by, bw, bh = self.MARGIN, self.y-28, self.W_INNER/2-4, 32
        draw_rounded_rect(self.c, bx, by, bw, bh, r=5, fill=BG_CARD, stroke=BORDER, lw=0.7)
        self.c.setFillColor(INDIGO_DARK)
        self.c.setFont("Helvetica-Bold", 9)
        self.c.drawString(bx+8, by+bh-13, f"{emoji}  {title}")
        self.c.setFillColor(SLATE)
        self.c.setFont("Helvetica", 7.5)
        for i, ln in enumerate(wrap_text(desc, 42)):
            self.c.drawString(bx+8, by+bh-24-i*9, ln)
        return bx+bw+8, by, bw, bh  # return right-side coords

    def table_row(self, cols, widths, header=False, check=False):
        self.check_space(16)
        bg = INDIGO_LITE if header else (SLATE_LITE if check else white)
        draw_rounded_rect(self.c, self.MARGIN, self.y-12, self.W_INNER, 16, r=0, fill=bg)
        x = self.MARGIN + 4
        for i, (col, w) in enumerate(zip(cols, widths)):
            if header:
                self.c.setFillColor(INDIGO_TEXT)
                self.c.setFont("Helvetica-Bold", 7.5)
            elif i == len(cols)-1 and check:
                self.c.setFillColor(CHECK_GRN)
                self.c.setFont("Helvetica-Bold", 8)
            else:
                self.c.setFillColor(SLATE)
                self.c.setFont("Helvetica", 7.5)
            self.c.drawString(x, self.y-8, str(col)[:60])
            x += w
        self.y -= 16
        # divider
        self.c.setStrokeColor(BORDER)
        self.c.setLineWidth(0.3)
        self.c.line(self.MARGIN, self.y+4, W-self.MARGIN, self.y+4)

    def image_2col(self, img1, cap1, img2, cap2):
        self.check_space(90)
        iw = self.W_INNER/2 - 3
        ih = iw * 0.48  # 16:7 approx
        try:
            self.c.drawImage(ImageReader(img1), self.MARGIN, self.y-ih, iw, ih, preserveAspectRatio=True)
            self.c.setFillColor(INDIGO)
            self.c.setFont("Helvetica-Bold", 6.5)
            self.c.drawString(self.MARGIN, self.y-ih-9, cap1)
        except Exception: pass
        try:
            self.c.drawImage(ImageReader(img2), self.MARGIN+iw+6, self.y-ih, iw, ih, preserveAspectRatio=True)
            self.c.setFillColor(INDIGO)
            self.c.setFont("Helvetica-Bold", 6.5)
            self.c.drawString(self.MARGIN+iw+6, self.y-ih-9, cap2)
        except Exception: pass
        self.y -= ih + 16

    def image_full(self, imgpath, caption):
        self.check_space(110)
        iw = self.W_INNER
        ih = iw * 0.45
        try:
            self.c.drawImage(ImageReader(imgpath), self.MARGIN, self.y-ih, iw, ih, preserveAspectRatio=True)
            self.c.setFillColor(INDIGO)
            self.c.setFont("Helvetica-Bold", 7)
            self.c.drawString(self.MARGIN, self.y-ih-10, caption)
        except Exception: pass
        self.y -= ih + 18

    def gap(self, pts=8):
        self.y -= pts

# ═══════════════════════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════════════════════
def build():
    pdf = PDF(OUT)
    cover(pdf)

    p = ContentPage(pdf)

    # ── SECTION 1: Links ────────────────────────────────────
    p.section(1, "Live Links & Repository")
    p.link_card("Frontend — Live Working App", "https://atom-tracker-rust.vercel.app", "W")
    p.link_card("Source Code Repository (GitHub)", "https://github.com/dharmendra26-wiz/AtomTracker", "G")
    p.link_card("Backend API (FastAPI on Render)", "https://atomtracker.onrender.com", "A")
    p.link_card("Interactive API Docs (Swagger UI)", "https://atomtracker.onrender.com/docs", "D")
    p.gap(4)
    draw_rounded_rect(p.c, p.MARGIN, p.y-20, p.W_INNER, 24, r=5, fill=AMBER, stroke=HexColor("#fde68a"), lw=0.7)
    p.c.setFillColor(HexColor("#92400e"))
    p.c.setFont("Helvetica", 8)
    p.c.drawString(p.MARGIN+8, p.y-12, "⚠  First load may take ~30 s — backend sleeps on Render free tier. App auto-retries.")
    p.y -= 30

    # ── SECTION 2: Problem & Solution ──────────────────────
    p.section(2, "Problem Statement & Solution")
    p.para("Atomberg's goal-setting ran on fragile Excel sheets — no weight validation, no audit trail, no digital "
           "manager review cycle. AtomTracker is the structured digital replacement.")
    p.gap(4)

    features = [
        ("🎯","Structured Goal Setting","Up to 8 goals/sheet. Weight enforced at exactly 100%. Supports Min/Max/Zero/Timeline UoMs with automatic quarterly scoring."),
        ("✅","Manager Approval Flow","Managers review, inline-edit target/weight, approve & lock, or return with a rework comment. Full round-trip in the UI."),
        ("📊","Quarterly Check-ins","Employees log Q1–Q4 actuals on locked sheets. Scores computed per UoM. Managers add per-check-in feedback."),
        ("🛡","Tamper-Evident Audit","Every change logged with old/new values, timestamp, actor. Admin searches by entity UUID."),
        ("🔗","Cascaded Goals","Admin pushes a primary goal to multiple employees. Copies sync actuals from the primary — no duplication."),
        ("📈","Org Analytics","Charts: users by role, sheets by status, QoQ score trend, per-employee completion matrix. CSV export."),
    ]
    i = 0
    while i < len(features):
        p.check_space(42)
        em1,t1,d1 = features[i]
        rx, ry, rw, rh = p.feature_row(em1,t1,d1)
        if i+1 < len(features):
            em2,t2,d2 = features[i+1]
            draw_rounded_rect(p.c, rx, ry, rw, rh, r=5, fill=BG_CARD, stroke=BORDER, lw=0.7)
            p.c.setFillColor(INDIGO_DARK)
            p.c.setFont("Helvetica-Bold", 9)
            p.c.drawString(rx+8, ry+rh-13, f"{em2}  {t2}")
            p.c.setFillColor(SLATE)
            p.c.setFont("Helvetica", 7.5)
            for j, ln in enumerate(wrap_text(d2, 42)):
                p.c.drawString(rx+8, ry+rh-24-j*9, ln)
        p.y -= 42
        i += 2

    # ── SECTION 3: Architecture ─────────────────────────────
    p.section(3, "System Architecture")
    p.image_full(ARCH_IMG, "Figure 1 — Browser → Vercel Proxy → FastAPI (Render) → SQLite")

    p.h3("Architecture Decisions")
    cols = ["Component","Technology","Purpose"]
    ws   = [55*mm, 65*mm, 60*mm]
    p.table_row(cols, ws, header=True)
    rows = [
        ("Frontend", "React 19 + Vite + Tailwind v4", "SPA on Vercel CDN"),
        ("Proxy",    "Vercel /api/* rewrite",          "Server-side proxy — eliminates CORS"),
        ("Backend",  "FastAPI + Uvicorn on Render",    "Stateless REST API"),
        ("Database", "SQLite via SQLAlchemy 2",         "Zero-config; Postgres-ready via env var"),
        ("Auth",     "PyJWT HS256 + bcrypt",            "Signed 12-hr tokens, role checked server-side"),
    ]
    for r in rows:
        p.table_row(r, ws)
    p.gap(8)

    # ── SECTION 4: Feature Coverage ─────────────────────────
    p.section(4, "BRD Feature Coverage")
    hcols = ["Requirement","Status","Endpoint"]
    hws   = [95*mm, 18*mm, 70*mm]
    p.table_row(hcols, hws, header=True)
    reqs = [
        ("Three roles (Employee / Manager / Admin) with RBAC", "✅", "auth.require_role"),
        ("Up to 8 goals, min weight 10, total = 100", "✅", "POST /sheets/{id}/goals + /submit"),
        ("Manager approves & locks the sheet", "✅", "POST /sheets/{id}/approve"),
        ("Manager returns sheet with rework comment", "✅", "POST /sheets/{id}/reject"),
        ("Manager inline edits target/weight pre-approval", "✅", "POST /goals/{id}/override"),
        ("Quarterly check-ins with auto-scored UoMs", "✅", "POST /goals/{id}/checkins"),
        ("Manager comments on a specific check-in", "✅", "POST /checkins/{id}/comment"),
        ("Shared/cascaded goals (actuals sync)", "✅", "POST /goals/{id}/cascade"),
        ("Admin override of locked goals + audit trail", "✅", "POST /goals/{id}/override"),
        ("Per-employee × quarter completion matrix", "✅", "GET /completion"),
        ("Full audit trail explorer (entity + global)", "✅", "GET /audit-logs[/{id}]"),
        ("CSV achievement report export", "✅", "GET /reports/achievements.csv"),
        ("Org analytics (roles, status, QoQ trend)", "✅", "GET /analytics, /analytics/qoq"),
    ]
    for r in reqs:
        p.table_row(r, hws, check=True)
    p.gap(8)

    # ── SECTION 5: Screenshots ──────────────────────────────
    p.section(5, "Live Demo Screenshots")
    p.para("All screenshots from the live production deployment at https://atom-tracker-rust.vercel.app", SLATE_MID, 7.5)
    p.h3("👤 Employee Role")
    ss = SCREENSHOTS
    p.image_2col(f"{ss}/01_employee_dashboard.png", "Employee Dashboard — KPI cards",
                 f"{ss}/05_all_goals_100pct.png",   "Goal Sheet — 3 goals, weight 100/100")
    p.image_2col(f"{ss}/06_sheet_submitted.png",    "Sheet Submitted — awaiting manager",
                 f"{ss}/03_goal_1_added.png",        "Adding a goal — form with live weight bar")
    p.h3("👥 Manager Role")
    p.image_2col(f"{ss}/07_manager_dashboard.png",  "Manager Dashboard — team sheets & scores",
                 f"{ss}/08_manager_review.png",      "Review Page — inline-editable Target/Weight")
    p.image_2col(f"{ss}/09_manager_approved.png",   "Approved & Locked sheet",
                 f"{ss}/10_admin_overview.png",      "Admin Console — org analytics & charts")

    # ── SECTION 6: Stack & Repo ─────────────────────────────
    p.section(6, "Tech Stack & Repository")
    p.h3("Frontend")
    p.para("React 19 · Vite 8 · Tailwind CSS v4 · React Router v7 · Recharts · lucide-react · Vercel")
    p.h3("Backend")
    p.para("FastAPI · SQLAlchemy 2 · SQLite · PyJWT (HS256) · bcrypt · Pydantic v2 · Uvicorn · Render")
    p.h3("Repository Structure")
    tree = [
        "atomtracker/",
        "  backend/   — FastAPI app, auth, models, routes, startup migrations",
        "  frontend/  — React SPA, Vite config, Vercel proxy (vercel.json)",
        "  docs/      — Architecture diagram, 10 live screenshots",
    ]
    for line in tree:
        p.c.setFillColor(INDIGO_TEXT if line.endswith("/") else SLATE)
        p.c.setFont("Helvetica-Bold" if "/" in line[:12] else "Helvetica", 8)
        p.c.drawString(p.MARGIN + (0 if not line.startswith("  ") else 8), p.y, line)
        p.y -= 11
    p.gap(12)

    # ── Footer on last page ─────────────────────────────────
    p.check_space(24)
    p.c.setStrokeColor(BORDER); p.c.setLineWidth(1)
    p.c.line(p.MARGIN, p.y, W-p.MARGIN, p.y)
    p.y -= 12
    p.c.setFillColor(INDIGO)
    p.c.setFont("Helvetica-Bold", 9)
    p.c.drawCentredString(W/2, p.y, "AtomTracker  ·  Atomquest Hackathon 1.0  ·  Built by Dharmendra")
    p.y -= 10
    # Clickable footer links
    u1, u2 = "https://atom-tracker-rust.vercel.app", "https://github.com/dharmendra26-wiz/AtomTracker"
    p.c.setFillColor(INDIGO)
    p.c.setFont("Helvetica", 8)
    p.c.drawCentredString(W/2 - 70, p.y, u1)
    clickable_link(p.c, W/2-70 - p.c.stringWidth(u1,"Helvetica",8)/2, p.y-3,
                   p.c.stringWidth(u1,"Helvetica",8), 10, u1)
    p.c.drawString(W/2, p.y, "  ·  ")
    p.c.drawString(W/2+10, p.y, u2)
    clickable_link(p.c, W/2+10, p.y-3, p.c.stringWidth(u2,"Helvetica",8), 10, u2)

    pdf.save()

if __name__ == "__main__":
    build()
