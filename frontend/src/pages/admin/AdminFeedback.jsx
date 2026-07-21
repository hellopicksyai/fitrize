import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, Star, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";

export default function AdminFeedback() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = (p = 1) => {
    setLoading(true);
    api.get("/admin/feedback", { params: { page: p } })
      .then((r) => { setItems(r.data.feedback || []); setTotalPages(r.data.total_pages || 1); setTotal(r.data.total || 0); setPage(r.data.page || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(1); }, []);

  return (
    <div className="space-y-6" data-testid="admin-feedback">
      <div>
        <h1 className="text-3xl font-bold">Feedback</h1>
        <p className="text-sm text-white/50 mt-1">{total} message{total === 1 ? "" : "s"} from users</p>
      </div>

      {loading ? (
        <div className="grid place-items-center h-48"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
      ) : !items.length ? (
        <div className="rounded-2xl border border-white/10 bg-[#12121a] p-10 text-center text-white/40">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No feedback submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <div key={f.id} className="rounded-2xl border border-white/10 bg-[#12121a] p-4" data-testid={`feedback-${f.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-sm">{f.user_name || "Anonymous"} <span className="text-white/40">· {f.user_email}</span></div>
                  {f.category && <div className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wide text-white/60">{f.category}</div>}
                </div>
                <div className="text-right shrink-0">
                  {f.rating ? (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < f.rating ? "text-yellow-400 fill-yellow-400" : "text-white/20"}`} />
                      ))}
                    </div>
                  ) : null}
                  <div className="text-white/30 text-xs mt-1">{String(f.created_at).slice(0, 16).replace("T", " ")}</div>
                </div>
              </div>
              <p className="text-sm text-white/80 mt-2 whitespace-pre-wrap">{f.message}</p>
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
