import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import CountUp from "@/components/CountUp";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { stagger, rise } from "@/components/PageTransition";
import { User, Mail, Crown, Flame, Star, Zap, Moon, Sun, Lock, Save, Target, Dumbbell, LogOut } from "lucide-react";

const Row = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium capitalize">{value ?? "—"}</span>
  </div>
);

export default function Profile() {
  const { user, refresh, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const p = user?.profile || {};

  const saveName = async () => {
    if (!name.trim()) { toast.error("Name can't be empty"); return; }
    setSavingName(true);
    try {
      await api.put("/profile", { name: name.trim() });
      await refresh();
      toast.success("Profile updated");
    } catch { toast.error("Couldn't update name"); }
    finally { setSavingName(false); }
  };

  const changePw = async () => {
    if (!cur || !next) { toast.error("Fill both password fields"); return; }
    if (next.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    setSavingPw(true);
    try {
      await api.put("/profile/password", { current_password: cur, new_password: next });
      toast.success("Password changed");
      setCur(""); setNext("");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't change password");
    } finally { setSavingPw(false); }
  };

  return (
    <div data-testid="profile-page" className="space-y-6">
      <div>
        <div className="text-xs text-accent uppercase tracking-widest">Account</div>
        <h1 className="display text-4xl sm:text-5xl">Profile & Settings</h1>
      </div>

      {/* Identity + membership */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid lg:grid-cols-3 gap-5">
        <motion.div variants={rise} className="lg:col-span-2">
          <Card className="p-6 rounded-3xl glass grad-border flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary grid place-items-center glow-primary shrink-0">
              <span className="display text-4xl text-primary-foreground">{(user?.name || "?").charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <div className="display text-3xl truncate">{user?.name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{user?.email}</div>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-accent/15 text-accent capitalize">
                <Crown className="w-3.5 h-3.5" /> {user?.tier || "free"} member
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div variants={rise}>
          <Card className="p-5 rounded-2xl glass h-full grid grid-cols-3 gap-2 place-items-center">
            <div className="text-center"><Zap className="w-4 h-4 text-primary mx-auto mb-1" /><div className="display text-2xl"><CountUp value={user?.xp || 0} /></div><div className="text-[10px] text-muted-foreground">XP</div></div>
            <div className="text-center"><Flame className="w-4 h-4 text-accent mx-auto mb-1" /><div className="display text-2xl text-accent"><CountUp value={user?.streak || 0} /></div><div className="text-[10px] text-muted-foreground">Streak</div></div>
            <div className="text-center"><Star className="w-4 h-4 text-primary mx-auto mb-1" /><div className="display text-2xl"><CountUp value={user?.level || 1} /></div><div className="text-[10px] text-muted-foreground">Level</div></div>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Fitness profile (from assessment) */}
        <Card className="p-5 rounded-2xl glass" data-testid="fitness-profile">
          <div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-accent" /><div className="text-sm font-medium">Fitness Profile</div></div>
          {p.goal ? (
            <>
              <Row label="Goal" value={(p.goal || "").replace("_", " ")} />
              <Row label="Experience" value={p.experience} />
              <Row label="Height" value={p.height_cm ? `${p.height_cm} cm` : null} />
              <Row label="Weight" value={p.weight_kg ? `${p.weight_kg} kg` : null} />
              <Row label="Activity" value={(p.activity_level || "").replace("_", " ")} />
              <Row label="Daily calories" value={p.target_cal ? `${p.target_cal} kcal` : null} />
              <Row label="Protein goal" value={p.protein_goal_g ? `${p.protein_goal_g} g` : null} />
              <Row label="BMI" value={p.bmi} />
              <Link to="/onboarding"><Button variant="outline" className="rounded-full mt-4 w-full" data-testid="redo-assessment"><Dumbbell className="w-4 h-4 mr-1" />Redo assessment</Button></Link>
            </>
          ) : (
            <div className="text-sm text-muted-foreground py-4">
              You haven't completed your assessment yet.
              <Link to="/onboarding"><Button className="rounded-full mt-3 w-full">Complete assessment</Button></Link>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          {/* Edit name */}
          <Card className="p-5 rounded-2xl glass" data-testid="edit-name">
            <div className="flex items-center gap-2 mb-3"><User className="w-4 h-4 text-primary" /><div className="text-sm font-medium">Display name</div></div>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" data-testid="profile-name" />
              <Button onClick={saveName} disabled={savingName} className="rounded-full shrink-0" data-testid="save-name"><Save className="w-4 h-4" /></Button>
            </div>
          </Card>

          {/* Change password */}
          <Card className="p-5 rounded-2xl glass" data-testid="change-password">
            <div className="flex items-center gap-2 mb-3"><Lock className="w-4 h-4 text-primary" /><div className="text-sm font-medium">Change password</div></div>
            <div className="space-y-2">
              <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="Current password" className="rounded-xl" data-testid="cur-pw" />
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (min 6 chars)" className="rounded-xl" data-testid="new-pw" />
              <Button onClick={changePw} disabled={savingPw} className="rounded-full w-full" data-testid="save-pw">{savingPw ? "Saving..." : "Update password"}</Button>
            </div>
          </Card>

          {/* Preferences */}
          <Card className="p-5 rounded-2xl glass" data-testid="preferences">
            <div className="text-sm font-medium mb-3">Preferences</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Theme</span>
              <Button variant="outline" size="sm" className="rounded-full" onClick={toggle} data-testid="profile-theme">
                {theme === "dark" ? <><Sun className="w-4 h-4 mr-1" />Light</> : <><Moon className="w-4 h-4 mr-1" />Dark</>}
              </Button>
            </div>
            <Button variant="outline" className="rounded-full w-full mt-4 text-destructive" onClick={logout} data-testid="profile-logout">
              <LogOut className="w-4 h-4 mr-1" />Log out
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
