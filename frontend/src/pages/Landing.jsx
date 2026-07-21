import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { startCheckout } from "@/lib/checkout";
import { toast } from "sonner";
import sushantImg from "@/assets/sushant.jpeg";
import ninadImg from "@/assets/ninad.jpeg";
import {
  Zap, Activity, Sparkles, Brain, Camera, Utensils, Dumbbell, TrendingUp,
  Moon, Sun, Check, ArrowRight, Flame, ScanLine,
  Mail, MapPin, Phone, Twitter, Instagram, Youtube, Linkedin, Github, Send,
} from "lucide-react";

const HERO_BG = "https://images.pexels.com/photos/17959564/pexels-photo-17959564.jpeg";
const FORM_BG = "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5";
const MEAL_BG = "https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg";

const features = [
  { icon: Brain, title: "AI Fitness Assessment", desc: "Generate BMI, TDEE, calorie targets, and ideal weight ranges instantly." },
  { icon: Utensils, title: "Smart Calorie Tracker", desc: "Log meals via photo, voice, or search. Macros estimated in seconds." },
  { icon: Dumbbell, title: "Custom Workout Plans", desc: "Sets, reps, rest, and progression — tailored to your goal & gear." },
  { icon: Camera, title: "Live Form Correction", desc: "Skeleton overlay analyzes your reps with joint-by-joint feedback." },
  { icon: Sparkles, title: "AI Personal Coach", desc: "Chat 24/7 with a coach trained on your stats, goals & history." },
  { icon: ScanLine, title: "AI Body Scan", desc: "Upload 3 photos. Get a transformation roadmap." },
];

const pricing = [
  { name: "Free", price: "₹0", period: "/forever", desc: "Get started", testid: "pricing-free", plan: null,
    features: ["Calorie tracking", "Basic workouts", "Progress dashboard"], cta: "Start free" },
  { name: "Pro", price: "₹999", period: "/mo", desc: "Most popular", featured: true, testid: "pricing-pro", plan: "pro",
    features: ["Everything in Free", "AI Form Correction", "AI Personal Trainer", "Custom Meal Plans", "AI Body Scan"], cta: "Go Pro" },
  { name: "Elite", price: "₹2,499", period: "/mo", desc: "All-in performance", testid: "pricing-elite", plan: "elite",
    features: ["Everything in Pro", "Live coach support", "Priority AI analysis", "Recovery tracking"], cta: "Unlock Elite" },
];

const faqs = [
  { q: "What is Fitrize?", a: "Fitrize is an AI-powered fitness platform designed to help you achieve your health and fitness goals with personalized workout plans, nutrition guidance, progress tracking, and intelligent recommendations all in one place." },
  { q: "Is Fitrize free to use?", a: "Yes! Fitrize is completely free to use during our early access phase. Our goal is to make personalized fitness accessible to everyone." },
  { q: "Who can use Fitrize?", a: "Fitrize is built for everyone — whether you're a beginner, looking to lose weight, build muscle, improve endurance, or simply maintain a healthy lifestyle." },
  { q: "How does Fitrize use AI?", a: "Our AI analyzes your fitness goals, preferences, and progress to provide personalized workout suggestions, nutrition recommendations, and fitness insights tailored specifically to you." },
  { q: "Do I need gym equipment?", a: "Not at all. Fitrize supports both home workouts and gym-based training, so you can stay fit wherever you are." },
  { q: "Is Fitrize available on the App Store or Google Play?", a: "Not yet. We are currently preparing for launch. You can stay updated through our website and social media channels." },
  { q: "Can I track my fitness progress?", a: "Yes. Fitrize helps you monitor your workouts, achievements, and overall fitness journey, making it easier to stay motivated and consistent." },
  { q: "Is my personal data secure?", a: "Absolutely. Protecting your privacy is a top priority. Your personal information is handled securely and is never shared without your permission." },
  { q: "Can beginners use Fitrize?", a: "Yes. Fitrize is designed for users of all fitness levels, from complete beginners to experienced athletes." },
  { q: "How do I get started?", a: "Simply create your account, tell us about your fitness goals, and let Fitrize build a personalized plan tailored to your needs." },
  { q: "Will Fitrize always be free?", a: "Fitrize is completely free during the current phase. As we introduce new premium features in the future, we'll continue to offer a valuable free experience for all users." },
  { q: "How can I contact the Fitrize team?", a: "You can reach us through the Contact page on our website or email us with your questions, feedback, or suggestions. We're always happy to hear from you." },
];

const Nav = () => {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
          <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center">
            <Zap className="w-5 h-5 text-primary-foreground" strokeWidth={2.5}/>
          </div>
          <span className="display text-2xl">Fitrize</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#form" className="hover:text-foreground">Form Coach</a>
          <a href="#meal" className="hover:text-foreground">Meal Plan</a>
          <a href="#about" className="hover:text-foreground">About</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} data-testid="nav-theme-toggle" className="rounded-full">
            {theme === "dark" ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
          </Button>
          {user ? (
            <Link to="/app"><Button className="rounded-full" data-testid="nav-open-app">Open App</Button></Link>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" data-testid="nav-login" className="rounded-full">Sign in</Button></Link>
              <Link to="/auth?mode=register"><Button data-testid="nav-get-started" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">Get Started</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

const Hero = () => {
  const nav = useNavigate();
  return (
    <section className="relative pt-32 pb-24 overflow-hidden noise">
      <div className="absolute inset-0 -z-10 grid-bg opacity-60"/>
      <div className="absolute -z-10 inset-0">
        <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-30 dark:opacity-25"/>
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background"/>
      </div>
      <div className="max-w-7xl mx-auto px-5 grid lg:grid-cols-12 gap-10 items-center">
        <motion.div initial={{opacity:0, y:30}} animate={{opacity:1, y:0}} transition={{duration:0.7}} className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs mb-6" data-testid="hero-tagline">
            <span className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot"/>
            Powered by Gemini 3 Flash · Vision-grade AI coaching
          </div>
          <h1 className="display text-balance text-5xl sm:text-6xl lg:text-7xl leading-[0.95]">
            Train smarter. <span className="text-primary">Transform</span> <span className="text-accent">faster</span>.
          </h1>
          <p className="mt-6 max-w-xl text-base md:text-lg text-muted-foreground">
            The premium AI fitness OS. Live form correction, vision-based calorie tracking, custom workouts, and a coach that actually knows you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-7" data-testid="hero-cta-start" onClick={() => nav("/auth?mode=register")}>
              Start free <ArrowRight className="w-4 h-4 ml-1"/>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-7" data-testid="hero-cta-demo" onClick={() => document.getElementById("form")?.scrollIntoView({ behavior: "smooth" })}>
              See AI form demo
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><Flame className="w-4 h-4 text-accent"/> 21-day streak avg</div>
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-primary"/> 3.2M reps coached</div>
          </div>
        </motion.div>

        <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} transition={{duration:0.7, delay:0.15}} className="lg:col-span-5">
          <div className="relative glass rounded-3xl p-5 blue-ring">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-muted-foreground">Today · Calorie Goal</div>
              <div className="text-xs text-accent">+12% vs avg</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 rounded-2xl bg-background/60 p-5">
                <div className="text-xs text-muted-foreground">Calories</div>
                <div className="display text-5xl mt-1">1,842</div>
                <div className="text-xs text-muted-foreground mt-1">of 2,400 kcal</div>
                <div className="mt-4 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{width:"76%"}}/>
                </div>
              </div>
              <div className="rounded-2xl bg-background/60 p-4 text-center">
                <div className="text-xs text-muted-foreground">Protein</div>
                <div className="display text-3xl mt-1 text-primary">142g</div>
                <div className="text-[10px] text-muted-foreground">of 180g</div>
              </div>
              <div className="rounded-2xl bg-background/60 p-4 text-center">
                <div className="text-xs text-muted-foreground">Carbs</div>
                <div className="display text-3xl mt-1">196g</div>
              </div>
              <div className="rounded-2xl bg-background/60 p-4 text-center">
                <div className="text-xs text-muted-foreground">Fats</div>
                <div className="display text-3xl mt-1">58g</div>
              </div>
              <div className="rounded-2xl bg-background/60 p-4 text-center">
                <div className="text-xs text-muted-foreground">Water</div>
                <div className="display text-3xl mt-1 text-accent">6/8</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Features = () => (
  <section id="features" className="py-24">
    <div className="max-w-7xl mx-auto px-5">
      <div className="max-w-2xl">
        <div className="text-xs text-accent uppercase tracking-widest mb-3">Capabilities</div>
        <h2 className="display text-4xl sm:text-5xl">Everything your body needs. In one app.</h2>
      </div>
      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="p-6 rounded-2xl border-border hover:-translate-y-1 transition-transform duration-300" data-testid={`feature-${title.toLowerCase().replace(/\s+/g,'-')}`}>
            <div className="w-11 h-11 rounded-xl bg-secondary grid place-items-center mb-4">
              <Icon className="w-5 h-5 text-primary" strokeWidth={1.75}/>
            </div>
            <div className="display text-2xl mb-2">{title}</div>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

const FormDemo = () => (
  <section id="form" className="py-24 relative overflow-hidden">
    <div className="absolute inset-0 -z-10 grid-bg opacity-40"/>
    <div className="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <div className="text-xs text-accent uppercase tracking-widest mb-3">Premium</div>
        <h2 className="display text-4xl sm:text-5xl">AI form correction, live.</h2>
        <p className="mt-4 text-muted-foreground max-w-md">
          Skeleton tracking maps every joint while you train. Real-time cues correct depth, spine angle, knee tracking, and tempo — rep by rep.
        </p>
        <ul className="mt-6 space-y-2 text-sm">
          {["Joint-angle analysis", "Auto rep counting", "Form & accuracy scoring", "Live verbal cues"].map(t => (
            <li key={t} className="flex items-center gap-2"><Check className="w-4 h-4 text-accent"/>{t}</li>
          ))}
        </ul>
      </div>
      <div className="relative aspect-[4/5] rounded-3xl overflow-hidden glass-strong">
        <img src={FORM_BG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70"/>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60"/>
        <svg viewBox="0 0 400 500" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
          {[[200,80],[200,160],[160,170],[240,170],[150,260],[250,260],[200,260],[170,360],[230,360],[170,460],[230,460]].map(([x,y],i)=>(
            <circle key={i} cx={x} cy={y} r="6" fill="#39FF14" opacity="0.95"/>
          ))}
          {[[200,80,200,160],[200,160,160,170],[200,160,240,170],[160,170,150,260],[240,170,250,260],[150,260,200,260],[250,260,200,260],[200,260,170,360],[200,260,230,360],[170,360,170,460],[230,360,230,460]].map(([x1,y1,x2,y2],i)=>(
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#39FF14" strokeWidth="2" opacity="0.7"/>
          ))}
        </svg>
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-xs text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot"/> Live · Squat
          </div>
          <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-xs text-white">Score · <span className="text-accent font-bold">94</span></div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 glass rounded-2xl p-3 text-xs text-white">
          <div className="font-semibold">Cue · Go 2cm deeper at the bottom</div>
          <div className="text-white/70 mt-0.5">Reps · 8 / 10 · Tempo on point</div>
        </div>
        <div className="absolute inset-x-0 h-px bg-accent/80 scan-line"/>
      </div>
    </div>
  </section>
);

const MealPlanSection = () => (
  <section id="meal" className="py-24">
    <div className="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-10 items-center">
      <div className="relative aspect-[5/4] rounded-3xl overflow-hidden">
        <img src={MEAL_BG} alt="" className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-black/20 to-transparent"/>
        <div className="absolute bottom-5 left-5 right-5 glass rounded-2xl p-4">
          <div className="text-xs text-white/70">Tomorrow · High Protein · 2,400 kcal</div>
          <div className="display text-2xl text-white mt-1">Grilled chicken bowl · 64g protein</div>
        </div>
      </div>
      <div>
        <div className="text-xs text-accent uppercase tracking-widest mb-3">AI Nutrition</div>
        <h2 className="display text-4xl sm:text-5xl">Meal plans that adapt as you do.</h2>
        <p className="mt-4 text-muted-foreground max-w-md">
          Tell us your goal, diet preference and budget. We generate breakfast, lunch, dinner & snacks — then auto-rebalance based on your progress.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 max-w-md">
          {["Indian","Keto","Vegan","Vegetarian","High Protein","Non-veg"].map(t => (
            <div key={t} className="text-center px-3 py-2 rounded-full bg-secondary text-xs">{t}</div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const Pricing = () => {
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const onCta = (p) => {
    if (!p.plan) { nav("/auth?mode=register"); return; }
    startCheckout(p.plan, async () => { await refresh(); nav("/app"); });
  };
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-7xl mx-auto px-5">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs text-accent uppercase tracking-widest mb-3">Pricing</div>
          <h2 className="display text-4xl sm:text-5xl">{`Pick your level. Upgrade when you're ready.`}</h2>
          {user?.tier && user.tier !== "free" && <div className="mt-3 text-sm text-accent">{`You're on Fitrize ${user.tier.toUpperCase()} · enjoy ✨`}</div>}
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {pricing.map(p => (
            <Card key={p.name} data-testid={p.testid}
              className={`p-7 rounded-3xl ${p.featured ? "neon-ring bg-card" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div className="display text-3xl">{p.name}</div>
                {p.featured && <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-accent text-accent-foreground font-bold">Popular</span>}
              </div>
              <div className="mt-4 flex items-end gap-1">
                <div className="display text-5xl">{p.price}</div>
                <div className="text-sm text-muted-foreground mb-1.5">{p.period}</div>
              </div>
              <div className="text-sm text-muted-foreground mt-1">{p.desc}</div>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2"><Check className="w-4 h-4 text-accent shrink-0 mt-0.5"/>{f}</li>
                ))}
              </ul>
              <Button onClick={() => onCta(p)} data-testid={`cta-${p.testid}`}
                className={`mt-7 w-full rounded-full ${p.featured ? "bg-accent text-accent-foreground hover:bg-accent/90 font-bold" : ""}`}>
                {p.cta}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

const About = () => (
  <section id="about" className="py-24 border-t border-border">
    <div className="max-w-6xl mx-auto px-5">
      <div className="text-center max-w-2xl mx-auto">
        <div className="text-xs text-accent uppercase tracking-widest">About Fitrize</div>
        <h2 className="display text-4xl sm:text-5xl mt-2">Smarter fitness. Powered by AI.</h2>
        <p className="text-muted-foreground mt-4">
          Fitrize was born from a simple idea: fitness should be personal, accessible, and powered by technology.
          We saw that many people struggle with generic workout plans and one-size-fits-all advice — so we created
          an AI-powered fitness platform that adapts to your goals, lifestyle and progress, helping you stay motivated every step of the way.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-12">
        <Card className="p-6 rounded-2xl glass">
          <div className="text-xs text-accent uppercase tracking-widest mb-2">Our Mission</div>
          <p className="text-muted-foreground">To empower people around the world with personalized, AI-driven fitness solutions that make healthy living simple, accessible, and achievable for everyone.</p>
        </Card>
        <Card className="p-6 rounded-2xl glass">
          <div className="text-xs text-accent uppercase tracking-widest mb-2">Our Vision</div>
          <p className="text-muted-foreground">To become the world's most trusted AI-powered fitness platform, inspiring millions to build healthier lifestyles through innovation, personalization, and technology.</p>
        </Card>
      </div>

      {/* Founders */}
      <div className="mt-20">
        <div className="text-center">
          <div className="text-xs text-accent uppercase tracking-widest">The team</div>
          <h3 className="display text-4xl mt-2">Meet the Founders</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 mt-10 max-w-4xl mx-auto">
          {[
            { img: ninadImg, name: "Ninad Rane", role: "Founder",
              bio: "The visionary behind Fitrize, driven by a passion for fitness and innovation. He founded Fitrize believing everyone deserves access to personalized, AI-powered fitness guidance — bridging technology and wellness to help people build healthier habits." },
            { img: sushantImg, name: "Sushant Amin", role: "Co-Founder",
              bio: "The technical architect of the platform, responsible for transforming ideas into scalable, secure and user-friendly products. With expertise in modern web technologies, Sushant is committed to building a seamless AI-powered fitness experience users can trust every day." },
          ].map((f) => (
            <Card key={f.name} className="p-6 rounded-3xl glass glow-hover flex flex-col items-center text-center">
              {/* circular photo with ring */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-accent to-primary opacity-70 blur-[2px]" aria-hidden />
                <img src={f.img} alt={f.name}
                  className="relative w-32 h-32 rounded-full object-cover object-center ring-2 ring-background" />
              </div>
              <div className="display text-2xl mt-5">{f.name}</div>
              <div className="mt-1.5 inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs uppercase tracking-widest">
                {f.role}
              </div>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{f.bio}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Why Fitrize */}
      <div className="mt-16 max-w-2xl mx-auto text-center">
        <h3 className="display text-2xl">Why "Fitrize"?</h3>
        <p className="text-muted-foreground mt-3">
          The name combines "Fit" and "Rise" — reflecting our belief that fitness is about continuous growth.
          We help you rise above your limits with personalized AI guidance, empowering you to become stronger,
          healthier, and more confident every day.
        </p>
      </div>
    </div>
  </section>
);

const FAQ = () => (
  <section id="faq" className="py-24">
    <div className="max-w-3xl mx-auto px-5">
      <h2 className="display text-4xl sm:text-5xl text-center">Frequently asked</h2>
      <Accordion type="single" collapsible className="mt-10">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`q-${i}`} className="border-border">
            <AccordionTrigger data-testid={`faq-${i}`} className="text-left hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

const Footer = () => {
  const [email, setEmail] = useState("");
  const sub = (e) => {
    e.preventDefault();
    if (!email) return;
    toast.success("You&apos;re on the list — check your inbox.");
    setEmail("");
  };
  return (
    <footer id="footer" className="border-t border-border bg-card/40 relative noise" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-5 py-16 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent grid place-items-center"><Zap className="w-5 h-5 text-accent-foreground" strokeWidth={2.5}/></div>
            <span className="display text-2xl">Fitrize</span>
          </div>
          <p className="text-sm text-muted-foreground mt-4 max-w-md">Train smarter. Transform faster. The premium AI fitness OS — vision-grade calorie tracking, live form correction, and a coach that actually knows you.</p>
          <form onSubmit={sub} className="mt-6 flex gap-2 max-w-sm">
            <Input data-testid="footer-newsletter-email" required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@fitrize.app" className="rounded-full"/>
            <Button data-testid="footer-newsletter-submit" type="submit" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold">
              <Send className="w-4 h-4"/>
            </Button>
          </form>
          <div className="mt-5 flex gap-2">
            {[
              { Icon: Twitter, href: "https://twitter.com", id: "twitter" },
              { Icon: Instagram, href: "https://instagram.com", id: "instagram" },
              { Icon: Youtube, href: "https://youtube.com", id: "youtube" },
              { Icon: Linkedin, href: "https://linkedin.com", id: "linkedin" },
              { Icon: Github, href: "https://github.com", id: "github" },
            ].map(({ Icon, href, id }) => (
              <a key={id} href={href} target="_blank" rel="noreferrer" data-testid={`footer-social-${id}`}
                 className="w-9 h-9 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground grid place-items-center transition">
                <Icon className="w-4 h-4"/>
              </a>
            ))}
          </div>
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot"/> Powered by Gemini 3 Flash · MediaPipe Pose AI
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="display text-lg mb-4">Product</div>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><a href="#features" data-testid="footer-link-features" className="hover:text-foreground">Features</a></li>
            <li><a href="#form" data-testid="footer-link-form" className="hover:text-foreground">Form Coach</a></li>
            <li><Link to="/app" data-testid="footer-link-app" className="hover:text-foreground">Open App</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <div className="display text-lg mb-4">Company</div>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><a href="#about" data-testid="footer-link-about" className="hover:text-foreground">About</a></li>
            <li><a href="#faq" data-testid="footer-link-faq" className="hover:text-foreground">FAQ</a></li>
            <li><a href="#" data-testid="footer-link-blog" className="hover:text-foreground">Blog</a></li>
            <li><a href="#" data-testid="footer-link-careers" className="hover:text-foreground">Careers</a></li>
            <li><a href="#" data-testid="footer-link-press" className="hover:text-foreground">Press kit</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-5 py-5 flex flex-col md:flex-row justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} Fitrize Labs. All rights reserved.</div>
          <div className="flex gap-5">
            <a href="#" data-testid="footer-legal-privacy" className="hover:text-foreground">Privacy</a>
            <a href="#" data-testid="footer-legal-terms" className="hover:text-foreground">Terms</a>
            <a href="#" data-testid="footer-legal-cookies" className="hover:text-foreground">Cookies</a>
            <a href="#" data-testid="footer-legal-refund" className="hover:text-foreground">Refund policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default function Landing() {
  return (
    <div data-testid="landing-page">
      <Nav />
      <Hero />
      <Features />
      <FormDemo />
      <MealPlanSection />
      <About />
      <FAQ />
      <Footer />
    </div>
  );
}
