"""
AtomTracker — Hackathon Submission PDF Generator
Run: python scripts/generate_pdf.py
"""
import os, textwrap
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

W, H = A4
OUT        = os.path.join(os.path.dirname(__file__), "..", "SUBMISSION.pdf")
SCREENSHOTS= os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots")
ARCH_IMG   = os.path.join(os.path.dirname(__file__), "..", "docs", "architecture_diagram.png")

# ── Solid colours (NO alpha — ReportLab ignores it) ─────────
INDIGO      = HexColor("#4f46e5")   # primary indigo
INDIGO_DARK = HexColor("#1e1b4b")   # dark navy
INDIGO_MID  = HexColor("#312e81")   # mid navy
INDIGO_LITE = HexColor("#ede9fe")   # lavender tint
INDIGO_TEXT = HexColor("#3730a3")   # dark indigo text
LILAC       = HexColor("#c7d2fe")   # light periwinkle (on dark bg)
PERIWINKLE  = HexColor("#a5b4fc")   # bright periwinkle (on dark bg)
COVER_CARD  = HexColor("#2d2a6e")   # card bg on cover (darker than bg)
COVER_BORD  = HexColor("#4a47a3")   # card border on cover
SLATE       = HexColor("#334155")
SLATE_LITE  = HexColor("#f8fafc")
BORDER      = HexColor("#c7d2fe")   # indigo border
BG_CARD     = HexColor("#f0f0ff")   # slightly tinted white card
CHECK_GRN   = HexColor("#059669")
WARN_BG     = HexColor("#fff7ed")   # soft orange bg
WARN_BORD   = HexColor("#fed7aa")
WARN_TEXT   = HexColor("#9a3412")

# ── Helpers ─────────────────────────────────────────────────
def rr(c, x, y, w, h, r=4, fill=None, stroke=None, lw=0.8):
    if fill:   c.setFillColor(fill)
    if stroke: c.setStrokeColor(stroke); c.setLineWidth(lw)
    else:      c.setStrokeColor(HexColor("#ffffffff")); c.setLineWidth(0)
    c.roundRect(x, y, w, h, r, fill=1 if fill else 0, stroke=1 if stroke else 0)

def link(c, x, y, w, h, url):
    c.linkURL(url, (x, y, x+w, y+h), relative=0)

def wrap(text, n):
    return textwrap.wrap(text, n)

# ── PDF wrapper ─────────────────────────────────────────────
class PDF:
    def __init__(self, path):
        self.c = canvas.Canvas(path, pagesize=A4)
        self.c.setTitle("AtomTracker — Hackathon Submission")
        self.c.setAuthor("Dharmendra")
        self.page = 0
    def new_page(self):
        if self.page > 0: self.c.showPage()
        self.page += 1
    def save(self):
        self.c.save()
        print(f"[OK] SUBMISSION.pdf saved ({self.page} pages)")

# ═══════════════════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════════════════
def cover(pdf):
    c = pdf.c
    pdf.new_page()

    # Full-page dark background
    rr(c, 0, 0, W, H, r=0, fill=INDIGO_DARK)

    # Tag line
    rr(c, 30*mm, H-54, 95*mm, 13, r=6, fill=INDIGO_MID, stroke=COVER_BORD, lw=0.7)
    c.setFillColor(PERIWINKLE); c.setFont("Helvetica-Bold", 7)
    c.drawString(33*mm, H-49, "ATOMQUEST HACKATHON 1.0  -  SUBMISSION")

    # Title
    c.setFillColor(white); c.setFont("Helvetica-Bold", 40)
    tw = c.stringWidth("Atom", "Helvetica-Bold", 40)
    c.drawString(30*mm, H-88, "Atom")
    c.setFillColor(PERIWINKLE)
    c.drawString(30*mm + tw, H-88, "Tracker")

    # Subtitle
    c.setFillColor(LILAC); c.setFont("Helvetica", 10.5)
    c.drawString(30*mm, H-108, "In-House Goal Setting & Tracking Portal")
    c.drawString(30*mm, H-121, "100% weight enforcement  |  Quarterly scoring  |  JWT RBAC  |  Feedback threads  |  Audit trail")

    # ── 3 link cards (solid, high-contrast) ─────────────────
    links = [
        ("LIVE APP",  "https://atom-tracker-rust.vercel.app",          "L"),
        ("GITHUB",    "https://github.com/dharmendra26-wiz/AtomTracker","G"),
        ("API DOCS",  "https://atomtracker.onrender.com/docs",          "D"),
    ]
    cy = H - 148
    lw_box = W - 60*mm
    for lbl, url, icon in links:
        # Card: medium indigo bg, bright border
        rr(c, 30*mm, cy-18, lw_box, 22, r=5, fill=COVER_CARD, stroke=COVER_BORD, lw=1)
        # Icon box
        rr(c, 31*mm, cy-16, 18, 18, r=4, fill=INDIGO)
        c.setFillColor(white); c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(31*mm+9, cy-11, icon)
        # Label (bright periwinkle — visible on dark card)
        c.setFillColor(PERIWINKLE); c.setFont("Helvetica-Bold", 7.5)
        c.drawString(31*mm+22, cy-6, lbl)
        # URL (white — fully visible on dark card)
        c.setFillColor(white); c.setFont("Helvetica", 9)
        c.drawString(31*mm+22, cy-15, url)
        # PDF clickable annotation
        link(c, 30*mm, cy-18, lw_box, 22, url)
        cy -= 28

    # ── Stats bar ───────────────────────────────────────────
    # Divider line
    rr(c, 30*mm, H-288, W-60*mm, 0.7, r=0, fill=INDIGO_MID)
    stats = [("3","Roles"),("4","Quarters"),("100%","Weight\nEnforced"),("8","Max Goals"),("INF","Audit Trail")]
    sx = 30*mm; sw = (W-60*mm)/len(stats); sy = H-304
    for val, lbl in stats:
        c.setFillColor(PERIWINKLE); c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(sx+sw/2, sy, val)
        c.setFillColor(LILAC); c.setFont("Helvetica", 7)
        for i, ln in enumerate(lbl.split("\n")):
            c.drawCentredString(sx+sw/2, sy-11-i*8, ln)
        sx += sw

    # ── Demo credentials ────────────────────────────────────
    cred_y = H-380
    rr(c, 30*mm, cred_y-74, W-60*mm, 84, r=6, fill=COVER_CARD, stroke=COVER_BORD, lw=1)
    c.setFillColor(PERIWINKLE); c.setFont("Helvetica-Bold", 8)
    c.drawString(33*mm, cred_y, "DEMO LOGIN CREDENTIALS  (one-click buttons on login page — data auto-seeded)")
    rows = [
        ("Admin",    "admin@test.com",    "admin",     "#10b981","#d1fae5"),
        ("Manager",  "manager@test.com",  "manager",   "#f59e0b","#fef3c7"),
        ("Rahul",    "employee@test.com", "employee",  "#6366f1","#ede9fe"),
        ("Sneha",    "sneha@test.com",    "employee2", "#8b5cf6","#ede9fe"),
    ]
    ry = cred_y - 16
    for role, email, pw, dot, bg in rows:
        rr(c, 33*mm, ry-9, 20, 13, r=4, fill=HexColor(bg))
        c.setFillColor(HexColor(dot)); c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(43*mm, ry-3, role)
        c.setFillColor(white); c.setFont("Helvetica", 9)
        c.drawString(57*mm, ry-3, f"{email}   /   {pw}")
        ry -= 17

    # Page num
    c.setFillColor(INDIGO_MID); c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 16, "1")

# ═══════════════════════════════════════════════════════════
# CONTENT PAGE HELPER
# ═══════════════════════════════════════════════════════════
class Page:
    M = 22*mm
    TOP = H - 28*mm
    BOT = 22*mm
    IW = W - 44*mm

    def __init__(self, pdf):
        self.pdf = pdf; self.c = pdf.c; self.y = self.TOP
        self._new()

    def _new(self):
        self.pdf.new_page(); self.y = self.TOP
        rr(self.c, 0, H-14*mm, W, 14*mm, r=0, fill=INDIGO_DARK)
        self.c.setFillColor(white); self.c.setFont("Helvetica-Bold", 9)
        self.c.drawString(self.M, H-8.5*mm, "AtomTracker")
        self.c.setFillColor(PERIWINKLE); self.c.setFont("Helvetica", 8)
        self.c.drawRightString(W-self.M, H-8.5*mm,
                               f"Atomquest Hackathon 1.0  |  Page {self.pdf.page}")

    def need(self, n):
        if self.y - n < self.BOT: self._new()

    def section(self, n, title):
        self.need(30); self.y -= 8
        rr(self.c, self.M, self.y-4, 9, 15, r=3, fill=INDIGO)
        self.c.setFillColor(white); self.c.setFont("Helvetica-Bold", 7.5)
        self.c.drawCentredString(self.M+4.5, self.y+1, str(n))
        self.c.setFillColor(INDIGO_DARK); self.c.setFont("Helvetica-Bold", 13)
        self.c.drawString(self.M+13, self.y+1, title)
        self.y -= 20
        self.c.setStrokeColor(BORDER); self.c.setLineWidth(1)
        self.c.line(self.M, self.y+6, W-self.M, self.y+6); self.y -= 4

    def h3(self, t):
        self.need(20); self.y -= 5
        self.c.setFillColor(INDIGO_MID); self.c.setFont("Helvetica-Bold", 10)
        self.c.drawString(self.M, self.y, t); self.y -= 14

    def para(self, text, col=None, size=8.5):
        col = col or SLATE
        for ln in wrap(text, 95):
            self.need(12)
            self.c.setFillColor(col); self.c.setFont("Helvetica", size)
            self.c.drawString(self.M, self.y, ln); self.y -= 11
        self.y -= 2

    def link_card(self, label, url, tag):
        """High-contrast card: dark indigo bg, white text, bright border."""
        self.need(30); lh = 26
        # Card background — dark indigo, bright border
        rr(self.c, self.M, self.y-lh+6, self.IW, lh, r=5,
           fill=INDIGO_DARK, stroke=INDIGO, lw=1.5)
        # Tag box (bright indigo)
        rr(self.c, self.M+4, self.y-lh+9, 18, 18, r=4, fill=INDIGO)
        self.c.setFillColor(white); self.c.setFont("Helvetica-Bold", 7.5)
        self.c.drawCentredString(self.M+13, self.y-lh+15, tag)
        # Label — periwinkle (visible on dark bg)
        self.c.setFillColor(PERIWINKLE); self.c.setFont("Helvetica-Bold", 8)
        self.c.drawString(self.M+27, self.y-4, label)
        # URL — white (fully visible on dark bg)
        self.c.setFillColor(white); self.c.setFont("Helvetica", 9)
        self.c.drawString(self.M+27, self.y-14, url)
        # Clickable PDF annotation
        link(self.c, self.M, self.y-lh+6, self.IW, lh, url)
        self.y -= lh + 5

    def warn(self, text):
        self.need(26); rh = 22
        rr(self.c, self.M, self.y-rh+6, self.IW, rh, r=5,
           fill=WARN_BG, stroke=WARN_BORD, lw=0.8)
        self.c.setFillColor(WARN_TEXT); self.c.setFont("Helvetica", 8)
        self.c.drawString(self.M+8, self.y-11, text)
        self.y -= rh + 4

    def feat(self, title, desc, rx=None):
        """Draw a feature card. If rx given, draw at rx (right col)."""
        self.need(40)
        bw = self.IW/2 - 3
        bx = rx if rx is not None else self.M
        by = self.y - 30
        rr(self.c, bx, by, bw, 34, r=5, fill=BG_CARD, stroke=BORDER, lw=0.7)
        self.c.setFillColor(INDIGO_DARK); self.c.setFont("Helvetica-Bold", 8.5)
        self.c.drawString(bx+7, by+24, title)
        self.c.setFillColor(SLATE); self.c.setFont("Helvetica", 7)
        for i, ln in enumerate(wrap(desc, 44)):
            self.c.drawString(bx+7, by+14-i*9, ln)
        return bx+bw+6  # right-side x for paired card

    def trow(self, cols, widths, header=False, green_last=False):
        self.need(16)
        bg = INDIGO_LITE if header else (HexColor("#f8fafc") if green_last else white)
        rr(self.c, self.M, self.y-12, self.IW, 16, r=0, fill=bg)
        x = self.M+4
        for i, (col, w) in enumerate(zip(cols, widths)):
            if header:
                self.c.setFillColor(INDIGO_TEXT); self.c.setFont("Helvetica-Bold", 7.5)
            elif green_last and i == len(cols)-1:
                self.c.setFillColor(CHECK_GRN); self.c.setFont("Helvetica-Bold", 8)
            else:
                self.c.setFillColor(SLATE); self.c.setFont("Helvetica", 7.5)
            self.c.drawString(x, self.y-8, str(col)[:62])
            x += w
        self.y -= 16
        self.c.setStrokeColor(BORDER); self.c.setLineWidth(0.3)
        self.c.line(self.M, self.y+4, W-self.M, self.y+4)

    def img2(self, p1, c1, p2, c2):
        self.need(95)
        iw = self.IW/2-3; ih = iw*0.48
        for px, cx, ox in [(p1, c1, self.M), (p2, c2, self.M+iw+6)]:
            try:
                self.c.drawImage(ImageReader(px), ox, self.y-ih, iw, ih,
                                 preserveAspectRatio=True)
                self.c.setFillColor(INDIGO_MID); self.c.setFont("Helvetica-Bold", 6.5)
                self.c.drawString(ox, self.y-ih-9, cx)
            except Exception: pass
        self.y -= ih+18

    def img_full(self, path, cap):
        self.need(115)
        iw = self.IW; ih = iw*0.44
        try:
            self.c.drawImage(ImageReader(path), self.M, self.y-ih, iw, ih,
                             preserveAspectRatio=True)
            self.c.setFillColor(INDIGO_MID); self.c.setFont("Helvetica-Bold", 7)
            self.c.drawString(self.M, self.y-ih-10, cap)
        except Exception: pass
        self.y -= ih+18

    def gap(self, n=8): self.y -= n

# ═══════════════════════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════════════════════
def build():
    pdf = PDF(OUT)
    cover(pdf)
    p = Page(pdf)

    # 1. Links
    p.section(1, "Live Links & Repository")
    p.link_card("Frontend — Live Working App",       "https://atom-tracker-rust.vercel.app",           "W")
    p.link_card("Source Code Repository (GitHub)",   "https://github.com/dharmendra26-wiz/AtomTracker","G")
    p.link_card("Backend API (FastAPI on Render)",   "https://atomtracker.onrender.com",               "A")
    p.link_card("Interactive API Docs (Swagger UI)", "https://atomtracker.onrender.com/docs",           "D")
    p.warn("! First load ~30 s — backend sleeps on Render free tier. Login page waits automatically and seeds demo data before enabling login.")  

    # 2. Problem
    p.section(2, "Problem Statement & Solution")
    p.para("Atomberg's goal-setting ran on fragile Excel sheets: no weight validation, no audit trail, no digital "
           "manager review cycle. AtomTracker is the structured, role-based digital replacement.")
    p.gap(4)
    i = 0
    features = [
        ("Goal Setting (100% Weight)",  "Up to 8 goals. Total weight enforced at 100%. Min/Max/Zero/Timeline UoMs with auto scoring."),
        ("Manager Approval Flow",        "Review, inline-edit target/weight, approve & lock, or return with a rework comment."),
        ("Quarterly Check-ins",          "Employees log Q1-Q4 actuals on locked sheets. Scores computed per UoM automatically."),
        ("Feedback Thread",              "Private chat per sheet between employee and manager — keeps all goal discussion in one place."),
        ("Tamper-Evident Audit Trail",   "Every change logged with old/new value, timestamp, actor. Admin searches by UUID."),
        ("Cascaded Shared Goals",        "Admin pushes a goal to multiple employees. Copies sync actuals from the primary owner."),
        ("Org Analytics & CSV Export",   "Users by role, sheets by status, QoQ score trend, completion matrix, CSV export."),
        ("Role-Based Onboarding Tour",   "6-step guided modal on first login per role — walks judges through every feature automatically."),
    ]
    while i < len(features):
        p.need(44)
        rx = p.feat(features[i][0], features[i][1])
        if i+1 < len(features):
            p.feat(features[i+1][0], features[i+1][1], rx=rx)
        p.y -= 44; i += 2

    # 3. Architecture
    p.section(3, "System Architecture")
    p.img_full(ARCH_IMG, "Figure 1 — Browser -> Vercel Proxy -> FastAPI (Render) -> SQLite")
    p.h3("Component Breakdown")
    ws = [50*mm, 65*mm, 62*mm]
    p.trow(["Component","Technology","Purpose"], ws, header=True)
    for r in [
        ("Frontend",  "React 19 + Vite + Tailwind v4",   "SPA on Vercel CDN"),
        ("Proxy",     "Vercel /api/* rewrite",             "Server-side proxy — eliminates CORS"),
        ("Backend",   "FastAPI + Uvicorn on Render",       "Stateless REST API"),
        ("Database",  "SQLite via SQLAlchemy 2",           "Zero-config; Postgres-ready via env var"),
        ("Auth",      "PyJWT HS256 + bcrypt",              "Signed 12-hr tokens, role enforced server-side"),
    ]: p.trow(r, ws)
    p.gap(8)

    # 4. Features
    p.section(4, "BRD Feature Coverage")
    hw = [98*mm, 16*mm, 70*mm]
    p.trow(["Requirement","Status","Endpoint"], hw, header=True)
    for r in [
        ("Three roles (Employee / Manager / Admin) with RBAC", "YES", "auth.require_role"),
        ("Up to 8 goals, min weight 10, total = 100",          "YES", "POST /sheets/{id}/goals + /submit"),
        ("Manager approves & locks the sheet",                  "YES", "POST /sheets/{id}/approve"),
        ("Manager returns sheet with rework comment",           "YES", "POST /sheets/{id}/reject"),
        ("Manager inline edits target/weight pre-approval",     "YES", "POST /goals/{id}/override"),
        ("Quarterly check-ins with auto-scored UoMs",           "YES", "POST /goals/{id}/checkins"),
        ("Manager <-> Employee feedback thread per sheet",      "YES", "GET+POST /sheets/{id}/comments"),
        ("Shared/cascaded goals (actuals sync from primary)",   "YES", "POST /goals/{id}/cascade"),
        ("Admin override of locked goals + audit trail",        "YES", "POST /goals/{id}/override"),
        ("Per-employee x quarter completion matrix",            "YES", "GET /completion"),
        ("Full audit trail (entity + system-wide)",             "YES", "GET /audit-logs[/{id}]"),
        ("CSV achievement report export",                       "YES", "GET /reports/achievements.csv"),
        ("Org analytics (roles, status, QoQ trend)",            "YES", "GET /analytics, /analytics/qoq"),
    ]: p.trow(r, hw, green_last=True)
    p.gap(8)

    # 5. Screenshots
    p.section(5, "Live Demo Screenshots")
    p.para("All screenshots from: https://atom-tracker-rust.vercel.app", INDIGO_TEXT, 7.5)
    p.h3("Employee Role")
    ss = SCREENSHOTS
    p.img2(f"{ss}/01_employee_dashboard.png", "Employee Dashboard - KPI cards",
           f"{ss}/05_all_goals_100pct.png",   "Goal Sheet - 3 goals, weight 100/100")
    p.img2(f"{ss}/06_sheet_submitted.png",    "Sheet Submitted - awaiting manager",
           f"{ss}/03_goal_1_added.png",        "Adding a goal - form with live weight bar")
    p.h3("Manager Role")
    p.img2(f"{ss}/07_manager_dashboard.png",  "Manager Console - team sheets & scores",
           f"{ss}/08_manager_review.png",      "Review Page - inline-editable Target/Weight")
    p.img2(f"{ss}/09_manager_approved.png",   "Approved & Locked sheet",
           f"{ss}/10_admin_overview.png",      "Admin Console - org analytics & charts")

    # 6. Stack
    p.section(6, "Tech Stack & Repository")
    p.h3("Frontend")
    p.para("React 19  |  Vite 8  |  Tailwind CSS v4  |  React Router v7  |  Recharts  |  lucide-react  |  Vercel")
    p.h3("Backend")
    p.para("FastAPI  |  SQLAlchemy 2  |  SQLite  |  PyJWT (HS256)  |  bcrypt  |  Pydantic v2  |  Uvicorn  |  Render")
    p.h3("Repository Layout")
    for line in ["atomtracker/",
                 "  backend/   - FastAPI app, auth, models, routes, startup schema migrations",
                 "  frontend/  - React SPA, Vite config, Vercel proxy rewrite (vercel.json)",
                 "  docs/      - Architecture diagram, 10 live demo screenshots"]:
        p.c.setFillColor(INDIGO_TEXT if "/" not in line[:4] else INDIGO_MID)
        p.c.setFont("Helvetica-Bold" if not line.startswith("  ") else "Helvetica", 8)
        p.c.drawString(p.M+(0 if not line.startswith("  ") else 10), p.y, line)
        p.y -= 12
    p.gap(12)

    # Footer
    p.need(30)
    p.c.setStrokeColor(BORDER); p.c.setLineWidth(1)
    p.c.line(p.M, p.y, W-p.M, p.y); p.y -= 14
    p.c.setFillColor(INDIGO_DARK); p.c.setFont("Helvetica-Bold", 8.5)
    p.c.drawCentredString(W/2, p.y, "AtomTracker  |  Atomquest Hackathon 1.0  |  Built by Dharmendra")
    p.y -= 12
    u1 = "https://atom-tracker-rust.vercel.app"
    u2 = "https://github.com/dharmendra26-wiz/AtomTracker"
    p.c.setFillColor(INDIGO); p.c.setFont("Helvetica", 8.5)
    # Link 1
    x1 = W/2 - 10 - p.c.stringWidth(u1, "Helvetica", 8.5)
    p.c.drawString(x1, p.y, u1)
    link(p.c, x1, p.y-3, p.c.stringWidth(u1,"Helvetica",8.5), 11, u1)
    # Separator
    p.c.setFillColor(SLATE); p.c.drawString(W/2-8, p.y, " | ")
    # Link 2
    x2 = W/2 + 8
    p.c.setFillColor(INDIGO); p.c.drawString(x2, p.y, u2)
    link(p.c, x2, p.y-3, p.c.stringWidth(u2,"Helvetica",8.5), 11, u2)

    pdf.save()

if __name__ == "__main__":
    build()
