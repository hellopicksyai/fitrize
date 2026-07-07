import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquarePlus, Loader2, Star, Bug, Lightbulb, Heart, MessageCircle } from "lucide-react";

const CATEGORIES = [
  { key: "general", label: "General", icon: MessageCircle },
  { key: "bug", label: "Bug", icon: Bug },
  { key: "feature", label: "Feature idea", icon: Lightbulb },
  { key: "praise", label: "Praise", icon: Heart },
];

export default function Feedback() {
  const [category, setCategory] = useState("general");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [past, setPast] = useState([]);

  const load = () => {
    api.get("/feedback").then(r => setPast(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!message.trim()) { toast.error("Please write your feedback first."); return; }
    setBusy(true);
    try {
      await api.post("/feedback", { category, rating, message: message.trim() });
      toast.success("Thanks for your feedback!");
      setMessage(""); setRating(0); setCategory("general");
      load();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="feedback-page" className="space-y-4">
      <div>
        <div className="text-xs text-accent uppercase tracking-widest">Feedback</div>
        <h1 className="display text-4xl sm:text-5xl">Tell us what you think</h1>
        <p className="text-sm text-muted-foreground mt-1">Spotted a bug, want a feature, or just want to say hi? We read everything.</p>
      </div>

      <Card className="rounded-3xl p-5 space-y-5">
        {/* category */}
        <div>
          <div className="text-sm font-medium mb-2">Category</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                data-testid={`fb-cat-${key}`}
                onClick={() => setCategory(key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition ${
                  category === key ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* rating */}
        <div>
          <div className="text-sm font-medium mb-2">Rating <span className="text-muted-foreground">(optional)</span></div>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                data-testid={`fb-star-${n}`}
                onClick={() => setRating(n === rating ? 0 : n)}
                className="p-1"
                aria-label={`${n} star`}
              >
                <Star className={`w-6 h-6 transition ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
        </div>

        {/* message */}
        <div>
          <div className="text-sm font-medium mb-2">Your feedback</div>
          <Textarea
            data-testid="fb-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-[120px] rounded-2xl glass glow-hover"
          />
        </div>

        <Button data-testid="fb-submit" onClick={submit} disabled={busy} className="rounded-full">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquarePlus className="w-4 h-4 mr-2" />}
          Submit feedback
        </Button>
      </Card>

      {/* past feedback */}
      {past.length > 0 && (
        <Card className="rounded-3xl p-5">
          <div className="text-sm font-medium mb-3">Your past feedback</div>
          <div className="space-y-3">
            {past.map(f => (
              <div key={f.id} data-testid={`fb-item-${f.id}`} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="uppercase tracking-wide">{f.category}</span>
                  {f.rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: f.rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-accent text-accent" />
                      ))}
                    </span>
                  )}
                  <span>· {new Date(f.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-sm whitespace-pre-wrap">{f.message}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
