import { useAuth } from "@/lib/auth";
import { startCheckout } from "@/lib/checkout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";

export default function Paywall({ feature, children, requiredTier = "pro" }) {
  const { user, refresh } = useAuth();
  const tierOrder = { free: 0, pro: 1, elite: 2 };
  const ok = tierOrder[user?.tier || "free"] >= tierOrder[requiredTier];
  if (ok) return children;

  return (
    <div className="relative" data-testid="paywall-blocker">
      <div className="pointer-events-none opacity-30 blur-sm select-none">{children}</div>
      <div className="absolute inset-0 grid place-items-center">
        <Card className="max-w-md w-[92%] p-8 rounded-3xl neon-ring text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-accent grid place-items-center mb-3">
            <Lock className="w-6 h-6 text-accent-foreground"/>
          </div>
          <div className="text-xs text-accent uppercase tracking-widest">Fitrize Pro</div>
          <div className="display text-3xl mt-1">Unlock {feature}</div>
          <p className="text-sm text-muted-foreground mt-2">Upgrade to Pro to access AI form correction, body scan, and unlimited AI meal plans.</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => startCheckout("pro", refresh)} data-testid="paywall-pro" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold">
              <Sparkles className="w-4 h-4 mr-1"/>Go Pro · ₹999/mo
            </Button>
            <Button onClick={() => startCheckout("elite", refresh)} variant="outline" data-testid="paywall-elite" className="rounded-full">
              Elite · ₹2,499/mo
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
