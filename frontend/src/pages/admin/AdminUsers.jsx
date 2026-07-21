import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Search, Shield, ShieldOff, Ban, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (p = page, q = search) => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users", { params: { page: p, search: q } });
      setUsers(data.users || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    } catch {
      toast.error("Couldn't load users");
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(1, ""); /* initial */ // eslint-disable-next-line
  }, []);

  const runSearch = (e) => {
    e?.preventDefault();
    setPage(1);
    load(1, search);
  };

  const update = async (u, changes) => {
    setBusyId(u.id);
    try {
      const { data } = await api.patch(`/admin/users/${u.id}`, changes);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...data } : x)));
      toast.success("Updated");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Update failed");
    } finally { setBusyId(null); }
  };

  const goto = (p) => { setPage(p); load(p, search); };

  return (
    <div className="space-y-6" data-testid="admin-users">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-sm text-white/50 mt-1">{total} total user{total === 1 ? "" : "s"}</p>
        </div>
        <form onSubmit={runSearch} className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              data-testid="admin-user-search"
              className="pl-9 pr-3 py-2 rounded-xl bg-[#12121a] border border-white/10 text-sm outline-none focus:border-white/30 w-64"
            />
          </div>
          <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm" data-testid="admin-user-search-btn">Search</button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#12121a] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/10">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-white/40" /></td></tr>
            ) : !users.length ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-white/40">No users found.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`user-row-${u.id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium flex items-center gap-2">
                    {u.name || "—"}
                    {u.is_admin && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase tracking-wide">Admin</span>}
                  </div>
                  <div className="text-white/40 text-xs">{u.email}</div>
                </td>
                <td className="px-4 py-3 uppercase text-xs text-white/70">{u.tier || "free"}</td>
                <td className="px-4 py-3 text-white/70">{u.level || 1}</td>
                <td className="px-4 py-3">
                  {u.suspended
                    ? <span className="text-xs text-red-400 flex items-center gap-1"><Ban className="w-3 h-3" />Suspended</span>
                    : <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Active</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {busyId === u.id && <Loader2 className="w-4 h-4 animate-spin text-white/40" />}
                    {/* toggle admin */}
                    <button
                      onClick={() => update(u, { is_admin: !u.is_admin })}
                      disabled={busyId === u.id}
                      title={u.is_admin ? "Remove admin" : "Make admin"}
                      data-testid={`toggle-admin-${u.id}`}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
                    >
                      {u.is_admin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </button>
                    {/* toggle suspend */}
                    <button
                      onClick={() => update(u, { suspended: !u.suspended })}
                      disabled={busyId === u.id}
                      title={u.suspended ? "Unsuspend" : "Suspend"}
                      data-testid={`toggle-suspend-${u.id}`}
                      className={`p-1.5 rounded-lg hover:bg-white/10 ${u.suspended ? "text-green-400" : "text-red-400"}`}
                    >
                      {u.suspended ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => goto(Math.max(1, page - 1))} disabled={page <= 1}
            className="p-2 rounded-lg bg-white/10 disabled:opacity-40" data-testid="admin-prev-page"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-white/60">Page {page} of {totalPages}</span>
          <button onClick={() => goto(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
            className="p-2 rounded-lg bg-white/10 disabled:opacity-40" data-testid="admin-next-page"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
