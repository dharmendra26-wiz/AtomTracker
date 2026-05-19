import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Loader2, User as UserIcon } from "lucide-react";
import { api } from "./api";
import { useAuth } from "./AuthContext";

const ROLE_STYLE = {
  Manager:  { bg: "#fef3c7", color: "#92400e", label: "Manager" },
  Admin:    { bg: "#d1fae5", color: "#065f46", label: "Admin"   },
  Employee: { bg: "#ede9fe", color: "#5b21b6", label: "Employee" },
};

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function SheetComments({ sheetId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState("");
  const [loading, setLoading]   = useState(true);
  const [posting, setPosting]   = useState(false);
  const [err, setErr]           = useState("");
  const bottomRef = useRef(null);

  async function load() {
    try {
      const data = await api(`/sheets/${sheetId}/comments`);
      setComments(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [sheetId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true); setErr("");
    try {
      const c = await api(`/sheets/${sheetId}/comments`, {
        method: "POST", body: { text: text.trim() },
      });
      setComments(prev => [...prev, c]);
      setText("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setPosting(false);
    }
  }

  const isMine = (c) => c.author_id === user?.id;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <MessageSquare size={17} style={{ color: "#6366f1" }} />
        <h3 className="font-bold text-slate-800 text-sm">
          Feedback Thread
        </h3>
        <span className="ml-auto text-xs text-slate-400">
          {comments.length} message{comments.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Messages */}
      <div
        className="px-4 py-4 space-y-3 overflow-y-auto"
        style={{ minHeight: 160, maxHeight: 340 }}
      >
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin-slow text-slate-400" />
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <MessageSquare size={28} className="opacity-30" />
            <p className="text-xs text-center">
              No messages yet. Start the conversation below.
            </p>
          </div>
        )}

        {comments.map((c) => {
          const mine = isMine(c);
          const rs = ROLE_STYLE[c.author_role] || ROLE_STYLE.Employee;
          return (
            <div
              key={c.id}
              className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: rs.bg, color: rs.color }}
              >
                {c.author_name.charAt(0).toUpperCase()}
              </div>

              {/* Bubble */}
              <div className={`max-w-[72%] ${mine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {!mine && (
                    <span className="text-xs font-semibold text-slate-700">
                      {c.author_name}
                    </span>
                  )}
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: rs.bg, color: rs.color }}
                  >
                    {rs.label}
                  </span>
                  <span className="text-[10px] text-slate-400">{formatTime(c.created_at)}</span>
                </div>

                <div
                  className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={{
                    background: mine
                      ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                      : "#f1f5f9",
                    color: mine ? "#fff" : "#1e293b",
                    borderTopRightRadius: mine ? 4 : undefined,
                    borderTopLeftRadius:  mine ? undefined : 4,
                  }}
                >
                  {c.text}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100">
        {err && (
          <p className="text-xs text-red-500 mb-2">{err}</p>
        )}
        <form onSubmit={submit} className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="Write a message to your manager/employee…"
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={posting}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={posting || !text.trim()}
            className="btn btn-primary px-3 py-2 disabled:opacity-40"
            title="Send"
          >
            {posting
              ? <Loader2 size={16} className="animate-spin-slow" />
              : <Send size={16} />
            }
          </button>
        </form>
        <p className="text-[10px] text-slate-400 mt-1.5">
          Visible to you and your {user?.role === "Employee" ? "manager" : "employee"} only.
        </p>
      </div>
    </div>
  );
}
