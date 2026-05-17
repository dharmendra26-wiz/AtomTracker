import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function IdChip({ id, label }) {
  const [copied, setCopied] = useState(false);

  async function copy(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked on http or older browsers; ignore
    }
  }

  return (
    <span
      onClick={copy}
      title={`Copy ${label || "ID"}: ${id}`}
      className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer transition select-none"
    >
      {label && <span className="text-slate-400 font-sans">{label}:</span>}
      <span>{id.slice(0, 8)}…</span>
      {copied
        ? <Check size={12} className="text-emerald-600" />
        : <Copy size={12} />}
    </span>
  );
}
