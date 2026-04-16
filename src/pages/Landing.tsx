import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, FileCheck, TrendingUp, Users, Zap, Shield, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

/* ─── Animated SVG Hero Illustration ──────────────────────── */
const HeroIllustration = () => (
  <div className="relative w-full max-w-lg mx-auto select-none">
    <svg viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Background glow orbs */}
      <ellipse cx="260" cy="340" rx="200" ry="60" fill="hsl(221 83% 53% / 0.08)" />
      <ellipse cx="120" cy="180" rx="80" ry="80" fill="hsl(262 83% 58% / 0.07)" />

      {/* Resume/document base */}
      <rect x="110" y="40" width="180" height="240" rx="12" fill="white" stroke="hsl(221, 83%, 53%, 0.2)" strokeWidth="1.5" />
      <rect x="110" y="40" width="180" height="36" rx="12" fill="hsl(221, 83%, 53%)" />
      <rect x="110" y="64" width="180" height="12" fill="hsl(221, 83%, 53%)" />

      {/* Lines on resume */}
      <rect x="128" y="96" width="100" height="6" rx="3" fill="hsl(222, 47%, 11%, 0.15)" />
      <rect x="128" y="110" width="140" height="4" rx="2" fill="hsl(222, 47%, 11%, 0.08)" />
      <rect x="128" y="120" width="120" height="4" rx="2" fill="hsl(222, 47%, 11%, 0.08)" />
      <rect x="128" y="140" width="80" height="5" rx="2" fill="hsl(221, 83%, 53%, 0.5)" />
      <rect x="128" y="153" width="140" height="3" rx="1.5" fill="hsl(222, 47%, 11%, 0.08)" />
      <rect x="128" y="162" width="130" height="3" rx="1.5" fill="hsl(222, 47%, 11%, 0.08)" />
      <rect x="128" y="171" width="110" height="3" rx="1.5" fill="hsl(222, 47%, 11%, 0.08)" />
      <rect x="128" y="190" width="80" height="5" rx="2" fill="hsl(221, 83%, 53%, 0.5)" />
      <rect x="128" y="203" width="140" height="3" rx="1.5" fill="hsl(222, 47%, 11%, 0.08)" />
      <rect x="128" y="212" width="120" height="3" rx="1.5" fill="hsl(222, 47%, 11%, 0.08)" />
      <rect x="128" y="221" width="100" height="3" rx="1.5" fill="hsl(222, 47%, 11%, 0.08)" />

      {/* AI Score card — animated */}
      <g style={{ animation: "floatCard 4s ease-in-out infinite" }}>
        <rect x="258" y="60" width="168" height="100" rx="14" fill="white" stroke="hsl(221, 83%, 53%, 0.15)" strokeWidth="1" filter="url(#shadow1)" />
        <text x="276" y="91" fontSize="10" fill="hsl(215, 16%, 47%)" fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.08em">AI SCORE</text>
        <text x="276" y="128" fontSize="36" fill="hsl(142, 71%, 35%)" fontFamily="Inter, sans-serif" fontWeight="900">91%</text>
        <circle cx="388" cy="110" r="22" fill="hsl(142, 71%, 35%, 0.1)" />
        <path d="M381 115 l5 5 l10-12" stroke="hsl(142, 71%, 35%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Skills tag cloud */}
      <g style={{ animation: "floatCard 5s ease-in-out infinite 0.5s" }}>
        <rect x="258" y="178" width="168" height="112" rx="14" fill="white" stroke="hsl(262, 83%, 58%, 0.15)" strokeWidth="1" filter="url(#shadow1)" />
        <text x="276" y="202" fontSize="10" fill="hsl(215, 16%, 47%)" fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.08em">TOP SKILLS</text>
        {/* Skill pills */}
        <rect x="274" y="212" width="56" height="18" rx="9" fill="hsl(221, 83%, 53%, 0.1)" />
        <text x="302" y="225" fontSize="9" fill="hsl(221, 83%, 53%)" fontFamily="Inter, sans-serif" fontWeight="700" textAnchor="middle">React.js</text>
        <rect x="338" y="212" width="44" height="18" rx="9" fill="hsl(262, 83%, 58%, 0.1)" />
        <text x="360" y="225" fontSize="9" fill="hsl(262, 83%, 58%)" fontFamily="Inter, sans-serif" fontWeight="700" textAnchor="middle">Node.js</text>
        <rect x="274" y="238" width="38" height="18" rx="9" fill="hsl(142, 71%, 35%, 0.1)" />
        <text x="293" y="251" fontSize="9" fill="hsl(142, 71%, 35%)" fontFamily="Inter, sans-serif" fontWeight="700" textAnchor="middle">SQL</text>
        <rect x="320" y="238" width="52" height="18" rx="9" fill="hsl(38, 92%, 50%, 0.1)" />
        <text x="346" y="251" fontSize="9" fill="hsl(38, 92%, 50%)" fontFamily="Inter, sans-serif" fontWeight="700" textAnchor="middle">Python</text>
        <rect x="274" y="264" width="74" height="18" rx="9" fill="hsl(221, 83%, 53%, 0.08)" />
        <text x="311" y="277" fontSize="9" fill="hsl(221, 83%, 53%)" fontFamily="Inter, sans-serif" fontWeight="700" textAnchor="middle">TypeScript</text>
      </g>

      {/* Processing dots (animated) */}
      <g style={{ animation: "pulseDots 2s ease-in-out infinite" }}>
        <circle cx="210" cy="320" r="5" fill="hsl(221, 83%, 53%)" />
        <circle cx="228" cy="320" r="5" fill="hsl(221, 83%, 53%, 0.5)" />
        <circle cx="246" cy="320" r="5" fill="hsl(221, 83%, 53%, 0.2)" />
      </g>

      {/* Connector lines */}
      <line x1="290" y1="160" x2="290" y2="178" stroke="hsl(221, 83%, 53%, 0.2)" strokeWidth="1" strokeDasharray="4,3" />

      <defs>
        <filter id="shadow1" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="hsl(221, 83%, 53%)" floodOpacity="0.1" />
        </filter>
      </defs>
    </svg>

    <style>{`
      @keyframes floatCard {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      @keyframes pulseDots {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      @keyframes fadeSlideUp {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .anim-1 { animation: fadeSlideUp 0.7s ease both; }
      .anim-2 { animation: fadeSlideUp 0.7s 0.15s ease both; }
      .anim-3 { animation: fadeSlideUp 0.7s 0.3s ease both; }
      .anim-4 { animation: fadeSlideUp 0.7s 0.45s ease both; }
      .anim-5 { animation: fadeSlideUp 0.7s 0.6s ease both; }
      .anim-6 { animation: fadeIn 1s 0.8s ease both; }
      .feature-card:hover .feature-icon { transform: scale(1.15) rotate(-5deg); }
      .feature-icon { transition: transform 0.3s ease; }
      .btn-shimmer { position: relative; overflow: hidden; }
      .btn-shimmer::after {
        content: '';
        position: absolute;
        top: 0; left: 0;
        width: 40%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
        animation: shimmer 2.5s ease-in-out infinite;
      }
    `}</style>
  </div>
);

/* ─── Stat Ticker ─────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = target / (duration / 16);
      const timer = setInterval(() => {
        start += step;
        if (start >= target) { setVal(target); clearInterval(timer); }
        else setVal(Math.floor(start));
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return { val, ref };
}

const Stat = ({ value, suffix, label }: { value: number; suffix: string; label: string }) => {
  const { val, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center">
      <div className="text-5xl font-black text-foreground tabular-nums">
        {val.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-muted-foreground font-medium mt-1">{label}</div>
    </div>
  );
};

/* ─── Feature Card ────────────────────────────────────────── */
interface FeatureProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  delay?: string;
}

const FeatureCard = ({ icon: Icon, title, description, color, bgColor, delay = "0s" }: FeatureProps) => (
  <div
    className="feature-card group relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-default"
    style={{ animationDelay: delay }}
  >
    {/* Corner glow */}
    <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${bgColor} blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
    <div className={`feature-icon inline-flex items-center justify-center w-12 h-12 rounded-xl ${bgColor} mb-5`}>
      <Icon className={`h-6 w-6 ${color}`} />
    </div>
    <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

/* ─── Process Step SVG ────────────────────────────────────── */
const ProcessSVG = () => (
  <svg viewBox="0 0 600 120" className="w-full max-w-3xl mx-auto" fill="none">
    {/* Step 1 */}
    <circle cx="80" cy="60" r="32" fill="hsl(221, 83%, 53%, 0.1)" stroke="hsl(221, 83%, 53%)" strokeWidth="2" />
    <text x="80" y="55" textAnchor="middle" fontSize="11" fill="hsl(221, 83%, 53%)" fontWeight="700" fontFamily="Inter, sans-serif">UPLOAD</text>
    <text x="80" y="69" textAnchor="middle" fontSize="11" fill="hsl(221, 83%, 53%)" fontWeight="700" fontFamily="Inter, sans-serif">RESUME</text>
    {/* Arrow 1→2 */}
    <path d="M118 60 Q180 30 232 60" stroke="hsl(221, 83%, 53%, 0.4)" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arr)" />
    {/* Step 2 */}
    <circle cx="270" cy="60" r="32" fill="hsl(262, 83%, 58%, 0.1)" stroke="hsl(262, 83%, 58%)" strokeWidth="2" />
    <text x="270" y="55" textAnchor="middle" fontSize="11" fill="hsl(262, 83%, 58%)" fontWeight="700" fontFamily="Inter, sans-serif">AI</text>
    <text x="270" y="69" textAnchor="middle" fontSize="11" fill="hsl(262, 83%, 58%)" fontWeight="700" fontFamily="Inter, sans-serif">ANALYSIS</text>
    {/* Arrow 2→3 */}
    <path d="M308 60 Q370 30 422 60" stroke="hsl(262, 83%, 58%, 0.4)" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arr2)" />
    {/* Step 3 */}
    <circle cx="460" cy="60" r="32" fill="hsl(142, 71%, 35%, 0.1)" stroke="hsl(142, 71%, 35%)" strokeWidth="2" />
    <text x="460" y="55" textAnchor="middle" fontSize="11" fill="hsl(142, 71%, 35%)" fontWeight="700" fontFamily="Inter, sans-serif">GET</text>
    <text x="460" y="69" textAnchor="middle" fontSize="11" fill="hsl(142, 71%, 35%)" fontWeight="700" fontFamily="Inter, sans-serif">INSIGHTS</text>
    {/* Arrow 3→4 */}
    <path d="M498 60 Q530 40 550 60" stroke="hsl(142, 71%, 35%, 0.4)" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arr3)" />
    {/* Step 4 */}
    <circle cx="570" cy="60" r="22" fill="hsl(38, 92%, 50%, 0.1)" stroke="hsl(38, 92%, 50%)" strokeWidth="2" />
    <text x="570" y="56" textAnchor="middle" fontSize="10" fill="hsl(38, 92%, 50%)" fontWeight="700" fontFamily="Inter, sans-serif">HIRE</text>
    <text x="570" y="68" textAnchor="middle" fontSize="10" fill="hsl(38, 92%, 50%)" fontWeight="700" fontFamily="Inter, sans-serif">BEST</text>
    <defs>
      <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 z" fill="hsl(221, 83%, 53%, 0.6)" />
      </marker>
      <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 z" fill="hsl(262, 83%, 58%, 0.6)" />
      </marker>
      <marker id="arr3" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 z" fill="hsl(142, 71%, 35%, 0.6)" />
      </marker>
    </defs>
  </svg>
);

/* ─── Main Component ──────────────────────────────────────── */
const Landing = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── NAV ───────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Brain className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">CareerLens</span>
          </div>
          <Button asChild size="sm" className="btn-shimmer gap-1.5 shadow-sm">
            <Link to="/auth">Get Started <ChevronRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center px-4 sm:px-6 lg:px-8 py-20 overflow-hidden">
        {/* Ambient background blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 -left-40 w-[560px] h-[560px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-0 -right-40 w-[480px] h-[480px] rounded-full bg-accent/8 blur-3xl" />
          {/* Subtle dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="hsl(221, 83%, 53%)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <div className="anim-1 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary mb-8">
              <Zap className="h-3.5 w-3.5" />
              AI-Powered Hiring Platform
            </div>

            <h1 className="anim-2 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.05] mb-6">
              Hire Smarter.{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-primary">Faster.</span>
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" preserveAspectRatio="none" fill="none">
                  <path d="M2 5 Q100 1 198 5" stroke="hsl(221, 83%, 53%)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="anim-3 text-lg text-muted-foreground max-w-xl leading-relaxed mb-10">
              CareerLens uses multi-task AI to screen resumes, verify GitHub profiles, detect career timeline gaps, and rank candidates — all in seconds, not hours.
            </p>

            <div className="anim-4 flex flex-wrap gap-4">
              <Button asChild size="lg" className="btn-shimmer gap-2 shadow-md text-base px-8 h-12">
                <Link to="/auth">
                  Start for Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2 text-base h-12">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="anim-5 mt-10 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["hsl(221,83%,53%)", "hsl(262,83%,58%)", "hsl(142,71%,35%)", "hsl(38,92%,50%)"].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c, zIndex: 4 - i }}>
                    {["JM", "SR", "AK", "LP"][i]}
                  </div>
                ))}
              </div>
              <span><strong className="text-foreground">500+</strong> HR teams trust CareerLens</span>
            </div>
          </div>

          {/* Right: Illustration */}
          <div className="anim-6 hidden lg:block">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────── */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 divide-x-0 lg:divide-x divide-border">
            <Stat value={500} suffix="+" label="HR Teams Worldwide" />
            <Stat value={98} suffix="%" label="Resume Parsing Accuracy" />
            <Stat value={10} suffix="x" label="Faster Screening" />
            <Stat value={50000} suffix="+" label="Resumes Analyzed" />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Process</p>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">From resume to decision in 4 steps</h2>
          </div>
          <ProcessSVG />
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mb-4">
              Everything your HR team needs
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Purpose-built tools for modern recruitment teams. No fluff — just the data that matters.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={Brain} title="Multi-Task AI Analysis" description="Three simultaneous AI tasks evaluate skills, verify claims, and map career timelines in a single pass — far beyond basic keyword matching." color="text-primary" bgColor="bg-primary/10" />
            <FeatureCard icon={FileCheck} title="Effort vs Claim Verification" description="Our AI cross-references what candidates claim against actual evidence found in their resume, flagging inflated skills immediately." color="text-success" bgColor="bg-success/10" />
            <FeatureCard icon={TrendingUp} title="Career Timeline Mapping" description="Automatically extracts education, work history, and projects into a structured timeline, highlighting any unexplained gaps." color="text-accent" bgColor="bg-accent/10" />
            <FeatureCard icon={Shield} title="GitHub Profile Validation" description="Cross-validates declared GitHub usernames against resume content and analyzes repository authenticity to catch red flags." color="text-warning" bgColor="bg-warning/10" />
            <FeatureCard icon={Zap} title="Instant AI Scoring" description="Get a composite AI score in seconds. Re-analyse any candidate at any time as they update their profile or skills." color="text-primary" bgColor="bg-primary/10" />
            <FeatureCard icon={Users} title="Team-Ready Dashboard" description="A shared HR dashboard with role-based access, live filtering, and a 'What If' simulator to model hire/no-hire scenarios." color="text-accent" bgColor="bg-accent/10" />
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background artwork */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/6 blur-3xl" />
          <svg className="absolute bottom-0 left-0 w-full opacity-[0.04]" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path d="M0,160 Q300,60 600,140 T1200,80 L1200,200 L0,200 Z" fill="hsl(221, 83%, 53%)" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-8 shadow-sm">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mb-6">
            Ready to find your{" "}
            <span className="text-primary">next great hire?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join hundreds of forward-thinking HR teams who use CareerLens to make faster, more confident hiring decisions.
          </p>
          <Button asChild size="lg" className="btn-shimmer gap-2 shadow-lg text-base px-10 h-14">
            <Link to="/auth">
              Start Analysing Resumes <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-6 text-xs text-muted-foreground">No credit card required · Free to get started</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <Brain className="h-3 w-3 text-white" />
            </div>
            CareerLens
          </div>
          <span>© {new Date().getFullYear()} CareerLens. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
