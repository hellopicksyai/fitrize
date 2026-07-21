import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, ChevronLeft, ChevronRight, MessageCircle, User, Bot } from "lucide-react";

export default function AdminCoachMessages() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = (p = 1) => {
    setLoading(true);
    api.get("/admin/coach-messages", { params: { page: p } })
      .then((r) => { setItems(r.data.messages || []); setTotalPages(r.data.total_pages || 1); setTotal(r.data.total || 0); setPage(r.data.page || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(1); }, []);

  return (
    <div className="space-y-6" data-testid="admin-coach-messages">
      <div>
        <h1 className="text-3xl font-bold">Coach Conversations</h1>
        <p className="text-sm text-white/50 mt-1">What users are asking the AI coach · {total} message{total === 1 ? "" : "s"}</p>
      </div>

      {loading ? (
        <div className="grid place-items-center h-48"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
      ) : !items.length ? (
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-10 text-center text-white/40">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No coach conversations yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <div key={m.id} className="rounded-2xl border border-white/10 bg-[#12121a] p-4" data-testid={`coach-msg-${m.id}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-white/50">{m.user_name || "Unknown"} · {m.user_email || m.user_id}</div>
                <div className="text-white/30 text-xs">{String(m.created_at).slice(0, 16).replace("T", " ")}</div>
              </div>
              {m.role_user && (
                <div className="flex gap-2 mb-2">
                  <User className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-white/90">{m.role_user}</p>
                </div>
              )}
              {m.role_assistant && (
                <div className="flex gap-2 pl-2 border-l-2 border-white/10">
                  <Bot className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-white/60">{m.role_assistant}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => load(Math.max(1, page - 1))} disabled={page <= 1} className="p-2 rounded-lg bg-white/10 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-white/60">Page {page} of {totalPages}</span>
          <button onClick={() => load(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-2 rounded-lg bg-white/10 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
