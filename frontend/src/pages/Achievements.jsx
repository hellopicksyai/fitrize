import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import CountUp from "@/components/CountUp";
import Celebrate from "@/components/Celebrate";
import { DashboardSkeleton } from "@/components/Skeletons";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { stagger, rise } from "@/components/PageTransition";
import { Dumbbell, Flame, Trophy, Footprints, Utensils, Star, Lock, Award } from "lucide-react";

const ICONS = { Dumbbell, Flame, Trophy, Footprints, Utensils, Star };

export default function Achievements() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    api.get("/achievements")
      .then((r) => {
        setData(r.data);
        if (r.data.newly_unlocked?.length) {
          setCelebrate(true);
          setTimeout(() => setCelebrate(false), 100);
          const names = r.data.newly_unlocked.map((b) => b.title).join(", ");
          toast.success(`🏅 Unlocked: ${names}! +${r.data.bonus_xp} XP`);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const badges = data?.badges || [];
  const unlocked = data?.unlocked_count || 0;
  const total = data?.total || badges.length;

  return (
    <div data-testid="achievements-page" className="space-y-6 relative">
      <Celebrate trigger={celebrate} />
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-accent uppercase tracking-widest">Milestones</div>
          <h1 className="display text-4xl sm:text-5xl">Achievements</h1>
          <p className="text-sm text-muted-foreground mt-1">Earn badges as you train, eat and stay consistent.</p>
        </div>
        <Card className="px-5 py-3 rounded-2xl glass grad-border text-center" data-testid="ach-count">
          <div className="display text-3xl text-accent"><CountUp value={unlocked} /> <span className="text-muted-foreground text-xl">/ {total}</span></div>
          <div className="text-xs text-muted-foreground">unlocked</div>
        </Card>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map((b) => {
          const Icon = ICONS[b.icon] || Award;
          return (
            <motion.div key={b.key} variants={rise}>
              <Card className={`p-5 rounded-2xl relative overflow-hidden h-full ${b.unlocked ? "glass glow-hover" : "bg-card/50"}`} data-testid={`badge-${b.key}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl grid place-items-center shrink-0 ${b.unlocked ? "bg-accent/15 glow-accent" : "bg-secondary"}`}>
                    {b.unlocked
                      ? <Icon className="w-7 h-7 text-accent" />
                      : <Lock className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium ${b.unlocked ? "" : "text-muted-foreground"}`}>{b.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{b.desc}</div>
                    {b.unlocked ? (
                      <div className="text-xs text-accent mt-2 flex items-center gap-1"><Star className="w-3 h-3" /> +{b.xp} XP earned</div>
                    ) : (
                      <>
                        <div className="h-1.5 mt-3 bg-secondary rounded-full overflow-hidden">
                          <motion.div className="h-full bg-gradient-to-r from-accent to-primary"
                            initial={{ width: 0 }} animate={{ width: `${b.pct}%` }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} />
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">{b.raw_current} / {b.target}</div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
