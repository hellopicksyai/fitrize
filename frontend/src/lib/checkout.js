import { api } from "@/lib/api";
import { toast } from "sonner";

const loadScript = (src) => new Promise((res) => {
  if (document.querySelector(`script[src="${src}"]`)) return res(true);
  const s = document.createElement("script");
  s.src = src; s.onload = () => res(true); s.onerror = () => res(false);
  document.body.appendChild(s);
});

export const startCheckout = async (plan, onSuccess) => {
  if (!localStorage.getItem("bitfits_token")) {
    window.location.href = "/auth?mode=register";
    return;
  }
  const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!ok || !window.Razorpay) { toast.error("Couldn't load checkout"); return; }
  try {
    const { data } = await api.post("/payments/order", { plan });
    const rzp = new window.Razorpay({
      key: data.key_id,
      amount: data.amount,
      currency: data.currency,
      order_id: data.order_id,
      name: "BitFits",
      description: data.plan_label,
      prefill: { name: data.user?.name, email: data.user?.email },
      theme: { color: "#007AFF" },
      handler: async (res) => {
        try {
          await api.post("/payments/verify", {
            order_id: res.razorpay_order_id,
            payment_id: res.razorpay_payment_id,
            signature: res.razorpay_signature,
            plan,
          });
          toast.success(`Welcome to BitFits ${plan === "elite" ? "Elite" : "Pro"}!`);
          onSuccess?.();
        } catch { toast.error("Payment verification failed"); }
      },
      modal: { ondismiss: () => toast.info("Checkout closed") },
    });
    rzp.open();
  } catch (e) {
    toast.error(e?.response?.data?.detail || "Couldn't start checkout");
  }
};
