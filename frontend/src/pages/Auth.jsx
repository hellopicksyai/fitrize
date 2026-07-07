import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Zap, Loader2 } from "lucide-react";

export default function Auth() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = mode === "login"
        ? await login(email, password)
        : await register(email, password, name);
      toast.success(`Welcome${user.name ? ", " + user.name : ""}!`);
      nav(user.onboarded ? "/app" : "/onboarding");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden bg-black">
        <div className="absolute inset-0 grid-bg opacity-50"/>
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/20"/>
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-2" data-testid="auth-logo">
            <div className="w-9 h-9 rounded-xl bg-accent grid place-items-center"><Zap className="w-5 h-5 text-black" strokeWidth={2.5}/></div>
            <span className="display text-2xl">BitFits</span>
          </Link>
          <div>
            <h2 className="display text-5xl">Train smarter.<br/>Transform faster.</h2>
            <p className="mt-4 text-white/70 max-w-md">Your AI fitness coach, vision-grade calorie tracker, custom workouts and live form correction — in one premium app.</p>
          </div>
          <div className="text-xs text-white/40">Powered by Gemini 3 Flash · Built for athletes</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 rounded-3xl">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center"><Zap className="w-4 h-4 text-primary-foreground"/></div>
            <span className="display text-xl">BitFits</span>
          </Link>
          <div className="display text-3xl">{mode === "login" ? "Welcome back" : "Create account"}</div>
          <p className="text-sm text-muted-foreground mt-1">{mode === "login" ? "Continue your transformation." : "Start your journey in 30 seconds."}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" data-testid="auth-name" required value={name} onChange={e=>setName(e.target.value)} placeholder="Alex Carter" className="mt-1.5 rounded-xl"/>
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" data-testid="auth-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@bitfits.app" className="mt-1.5 rounded-xl"/>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" data-testid="auth-password" type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="mt-1.5 rounded-xl"/>
            </div>
            <Button type="submit" disabled={busy} data-testid="auth-submit"
              className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : (mode === "login" ? "Sign in" : "Create account")}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? "No account yet?" : "Already have one?"}{" "}
            <button data-testid="auth-toggle" onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-primary font-medium hover:underline">
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
