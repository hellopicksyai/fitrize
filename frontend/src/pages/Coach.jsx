import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "What should I eat post-workout?",
  "How much protein do I need?",
  "Why is my weight not dropping?",
  "How do I improve my squat?",
];

export default function Coach() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    api.get("/coach/history").then(r => {
      const flat = [];
      r.data.forEach(m => {
        flat.push({ role: "user", text: m.role_user });
        flat.push({ role: "assistant", text: m.role_assistant });
      });
      setMessages(flat);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: msg }]);
    setBusy(true);
    try {
      const { data } = await api.post("/coach/chat", { message: msg });
      setMessages(m => [...m, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Something went wrong. Try again." }]);
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="coach-page" className="space-y-4">
      <div>
        <div className="text-xs text-accent uppercase tracking-widest">AI Coach</div>
        <h1 className="display text-4xl sm:text-5xl">Your personal trainer</h1>
        <p className="text-sm text-muted-foreground mt-1">Ask about nutrition, training, recovery — answered with your stats in mind.</p>
      </div>

      <Card className="rounded-3xl p-0 overflow-hidden flex flex-col h-[65vh]">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-5 space-y-4">
            {!messages.length && (
              <div className="text-center py-12">
                <Sparkles className="w-8 h-8 text-accent mx-auto mb-3"/>
                <div className="display text-2xl">How can I help?</div>
                <div className="flex flex-wrap gap-2 justify-center mt-5 max-w-md mx-auto">
                  {SUGGESTIONS.map((s,i) => (
                    <button key={i} data-testid={`suggest-${i}`} onClick={()=>send(s)} className="px-3 py-1.5 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground text-xs transition">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m,i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div data-testid={`msg-${m.role}-${i}`} className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {busy && <div className="flex justify-start"><div className="px-4 py-2.5 rounded-2xl bg-secondary text-sm glass glow-hover"><Loader2 className="w-4 h-4 animate-spin"/></div></div>}
          </div>
        </ScrollArea>
        <form onSubmit={(e)=>{e.preventDefault(); send();}} className="border-t border-border p-3 flex gap-2">
          <Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask anything…" className="rounded-full" data-testid="coach-input"/>
          <Button type="submit" disabled={busy || !input.trim()} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold" data-testid="coach-send">
            <Send className="w-4 h-4"/>
          </Button>
        </form>
      </Card>
    </div>
  );
}
