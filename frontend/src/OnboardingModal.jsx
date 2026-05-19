import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

const TOURS = {
  Employee: [
    {
      icon: "📋",
      title: "Your Goal Sheets",
      body: "Your dashboard shows all your goal sheets by year. Each sheet holds up to 8 goals. Click any card to open it.",
      tip: "Use the sidebar → 'My Goals' to see only active sheets.",
    },
    {
      icon: "➕",
      title: "Create a New Sheet",
      body: "Hit 'New Sheet' (top-right) and pick a year. You'll land on a blank sheet where you can start adding goals.",
      tip: "You can only have one sheet per year.",
    },
    {
      icon: "🎯",
      title: "Add Goals",
      body: "Inside a sheet, click 'Add Goal'. Give each goal a title, thrust area, unit of measure (UoM), a numeric target, and a weight. All weights must add up to exactly 100% before you can submit.",
      tip: "UoM choices: Min (higher is better), Max (lower is better), Timeline (% complete), Zero (zero = perfect).",
    },
    {
      icon: "📤",
      title: "Submit for Review",
      body: "Once weights total 100%, the 'Submit' button activates. Your manager will then review and either approve or return it for rework.",
      tip: "If returned, you'll see your manager's comment on the sheet card — fix the issues and re-submit.",
    },
    {
      icon: "✅",
      title: "Quarterly Check-ins",
      body: "After your manager approves (Locked), go to 'Check-ins' in the sidebar. Enter your actual value and status (On Track / Completed) for each quarter.",
      tip: "You can update check-ins for any quarter at any time — previous entries are always visible.",
    },
  ],
  Manager: [
    {
      icon: "🏠",
      title: "Manager Console",
      body: "Your dashboard shows KPI cards for your team — pending reviews, approved sheets, and a team achievement score bar chart.",
      tip: "Scores are calculated from quarterly check-in actuals vs. targets.",
    },
    {
      icon: "📝",
      title: "Team Sheets",
      body: "Go to 'Team Sheets' in the sidebar to see all submitted sheets awaiting your review. Click any card to open it.",
      tip: "You can only see sheets from employees who report to you.",
    },
    {
      icon: "✏️",
      title: "Inline Edits Before Approving",
      body: "Inside a submitted sheet, click any Target or Weight value to edit it inline — useful if a goal needs adjustment before locking.",
      tip: "Edits made here are logged in the Audit Trail automatically.",
    },
    {
      icon: "✅",
      title: "Approve or Return",
      body: "Click 'Approve & Lock' to lock the sheet (enabling employee check-ins). Or click 'Return for Rework' and write a comment explaining what to fix.",
      tip: "Once locked, the employee can log quarterly actuals under Check-ins.",
    },
    {
      icon: "📊",
      title: "Team Check-ins",
      body: "The 'Team Check-ins' view shows all locked sheets. Click through to see each employee's quarter-by-quarter actuals and scores.",
      tip: "Scores update in real-time as employees log their actuals.",
    },
  ],
  Admin: [
    {
      icon: "🏠",
      title: "Admin Overview",
      body: "The overview shows total users, sheets, and goals across the company — plus a check-in completion heatmap (Q1–Q4 per employee) and a Goal Cascade tool.",
      tip: "Use 'Export CSV' to download a full achievement report for any year.",
    },
    {
      icon: "📈",
      title: "Analytics",
      body: "Go to 'Analytics' in the sidebar for charts: Users by Role (donut), Sheets by Status (bar), and Quarter-on-Quarter avg scores (line chart).",
      tip: "Change the year filter and click Refresh to see historical trends.",
    },
    {
      icon: "🕵️",
      title: "Audit Trail",
      body: "Every approve, reject, override, and check-in is logged. Go to 'Audit Trail' to see the 50 most recent events — or paste any entity UUID to filter logs for a specific goal or sheet.",
      tip: "Every entity (sheet, goal, check-in) shows a copyable UUID — use it to trace its full history.",
    },
    {
      icon: "👥",
      title: "User Management",
      body: "Go to 'User Management' to create new users, change roles, set manager assignments, or deactivate accounts.",
      tip: "Changing a user's manager re-routes their sheets to the new manager.",
    },
    {
      icon: "🔗",
      title: "Cascade a Goal",
      body: "On the Overview page, use 'Cascade a Goal' to push a primary goal as a shared copy to multiple employees by email. Recipients can adjust the weight but actuals are synced from the primary owner.",
      tip: "Paste the goal's UUID (shown on any goal card) into the cascade form.",
    },
  ],
};

const SESSION_KEY = "at_tour_done";

export default function OnboardingModal({ role }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = sessionStorage.getItem(`${SESSION_KEY}_${role}`);
    if (!done) setOpen(true);
  }, [role]);

  function close() {
    sessionStorage.setItem(`${SESSION_KEY}_${role}`, "1");
    setOpen(false);
  }

  const steps = TOURS[role] || [];
  const cur = steps[step];
  if (!open || !cur) return null;

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-up overflow-hidden"
        style={{ boxShadow: "0 25px 60px -10px rgba(99,102,241,0.35)" }}
      >
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              AT
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {role} Guide · {step + 1}/{steps.length}
            </span>
          </div>
          <button
            onClick={close}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-2 pt-3 min-h-[200px]">
          <div className="text-5xl mb-4">{cur.icon}</div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">{cur.title}</h2>
          <p className="text-slate-600 leading-relaxed text-sm">{cur.body}</p>

          {cur.tip && (
            <div
              className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: "#ede9fe", color: "#5b21b6" }}
            >
              <span className="font-bold shrink-0 mt-0.5">💡</span>
              <span>{cur.tip}</span>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-slate-100 mt-4">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn btn-ghost text-sm disabled:opacity-30"
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: i === step ? "#6366f1" : "#e2e8f0" }}
              />
            ))}
          </div>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="btn btn-primary text-sm"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={close} className="btn btn-success text-sm">
              <CheckCircle2 size={16} /> Got it!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
