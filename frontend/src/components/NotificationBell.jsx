import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Flame, Trophy, Droplet, Utensils, Dumbbell, Sparkles, Check } from "lucide-react";

const ICONS = { Flame, Trophy, Droplet, Utensils, Dumbbell, Sparkles };

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const ref = useRef();

  const load = () => api.get("/notifications").then((r) => setData(r.data)).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // refresh each minute
    return () => clearInterval(t);
  }, []);

  // close on outside click
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const notes = data.notifications || [];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full grid place-items-center hover:bg-secondary transition"
        data-testid="notif-bell" aria-label="Notifications">
        <Bell className="w-5 h-5" />
        {data.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center glow-accent">
            {data.unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl bg-popover border border-border shadow-2xl z-50 overflow-hidden backdrop-blur-none"
            data-testid="notif-panel"
            style={{ backgroundColor: "hsl(var(--popover))" }}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="text-sm font-medium">Notifications</div>
              <div className="text-xs text-muted-foreground">{notes.length}</div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto sidebar-scroll">
              {notes.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <Check className="w-6 h-6 mx-auto mb-2 text-accent" />
                  You're all caught up.
                </div>
              ) : (
                notes.map((n, i) => {
                  const Icon = ICONS[n.icon] || Bell;
                  const actionable = n.priority <= 2;
                  return (
                    <div key={i} className={`px-4 py-3 flex gap-3 border-b border-border/50 last:border-0 ${actionable ? "" : "opacity-80"}`} data-testid={`notif-${n.type}`}>
                      <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${actionable ? "bg-accent/15" : "bg-secondary"}`}>
                        <Icon className={`w-4 h-4 ${actionable ? "text-accent" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-snug">{n.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}