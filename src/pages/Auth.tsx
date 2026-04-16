import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Brain, Upload, IdCard, ArrowRight, CheckCircle2,
  TrendingUp, Shield, Zap, ChevronLeft, Loader2, Eye, EyeOff
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Role = "hr" | "applicant";

/* ─── Left Panel Illustration ──────────────────────────────── */
const AuthIllustration = () => (
  <div className="relative w-full max-w-xs mx-auto select-none mt-8">
    <svg viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl">
      {/* Glow */}
      <ellipse cx="140" cy="240" rx="110" ry="28" fill="rgba(255,255,255,0.08)" />

      {/* Main dashboard card */}
      <rect x="20" y="20" width="240" height="160" rx="16" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

      {/* Header bar */}
      <rect x="20" y="20" width="240" height="38" rx="16" fill="rgba(255,255,255,0.15)" />
      <rect x="20" y="42" width="240" height="16" fill="rgba(255,255,255,0.15)" />
      <circle cx="46" cy="39" r="8" fill="rgba(255,255,255,0.3)" />
      <rect x="62" y="34" width="80" height="8" rx="4" fill="rgba(255,255,255,0.5)" />

      {/* Score ring */}
      <circle cx="70" cy="120" r="34" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
      <circle cx="70" cy="120" r="34" stroke="rgba(255,255,255,0.85)" strokeWidth="6"
        strokeDasharray="175" strokeDashoffset="35" strokeLinecap="round"
        style={{ animation: "dashPulse 3s ease-in-out infinite" }}
        transform="rotate(-90 70 120)" />
      <text x="70" y="115" textAnchor="middle" fontSize="16" fill="white" fontWeight="900" fontFamily="Inter,sans-serif">91%</text>
      <text x="70" y="129" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.6)" fontFamily="Inter,sans-serif" letterSpacing="0.05em">AI SCORE</text>

      {/* Bar chart */}
      <rect x="130" y="142" width="14" height="30" rx="4" fill="rgba(255,255,255,0.2)" />
      <rect x="152" y="128" width="14" height="44" rx="4" fill="rgba(255,255,255,0.5)" />
      <rect x="174" y="118" width="14" height="54" rx="4" fill="rgba(255,255,255,0.8)" />
      <rect x="196" y="134" width="14" height="38" rx="4" fill="rgba(255,255,255,0.4)" />
      <rect x="218" y="110" width="14" height="62" rx="4" fill="rgba(255,255,255,0.3)" />

      {/* Floating tag: "New Candidate" */}
      <g style={{ animation: "floatTag 4s ease-in-out infinite" }}>
        <rect x="30" y="198" width="118" height="32" rx="10" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <circle cx="50" cy="214" r="8" fill="rgba(255,255,255,0.3)" />
        <text x="66" y="218" fontSize="10" fill="white" fontWeight="700" fontFamily="Inter,sans-serif">New Candidate</text>
      </g>

      {/* Floating score badge */}
      <g style={{ animation: "floatTag 4s ease-in-out infinite 1.5s" }}>
        <rect x="162" y="198" width="98" height="32" rx="10" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <text x="211" y="211" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)" fontFamily="Inter,sans-serif">VERIFIED</text>
        <text x="211" y="224" textAnchor="middle" fontSize="10" fill="white" fontWeight="700" fontFamily="Inter,sans-serif">✓ GitHub Match</text>
      </g>
    </svg>

    <style>{`
      @keyframes dashPulse {
        0%, 100% { stroke-dashoffset: 35; opacity: 1; }
        50% { stroke-dashoffset: 80; opacity: 0.7; }
      }
      @keyframes floatTag {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes formFadeIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .form-fade { animation: formFadeIn 0.4s ease both; }
      .input-focus-ring:focus-within {
        box-shadow: 0 0 0 2px hsl(221, 83%, 53%, 0.25);
      }
      .upload-drop:hover { border-color: hsl(221, 83%, 53%, 0.6); background: hsl(221, 83%, 53%, 0.04); }
      .upload-drop.has-file { border-color: hsl(142, 71%, 35%); background: hsl(142, 71%, 35%, 0.04); }
      @keyframes shimmerBtn {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      .btn-shimmer { position: relative; overflow: hidden; }
      .btn-shimmer::after {
        content: '';
        position: absolute; top: 0; left: 0;
        width: 40%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        animation: shimmerBtn 2.5s ease-in-out infinite;
      }
    `}</style>
  </div>
);

/* ─── Feature bullet ────────────────────────────────────────── */
const Bullet = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-3 text-white/80">
    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
      <Icon className="h-3.5 w-3.5 text-white" />
    </div>
    <span className="text-sm font-medium">{text}</span>
  </div>
);

/* ─── File Picker ──────────────────────────────────────────── */
const FilePicker = ({
  id, label, required, file, icon: Icon, hint, accept, onChange, inputRef,
}: {
  id: string; label: string; required?: boolean; file: File | null;
  icon: React.ElementType; hint?: string; accept: string;
  onChange: (f: File | null) => void; inputRef: React.RefObject<HTMLInputElement>;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm font-semibold">
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
      {!required && <span className="text-muted-foreground text-xs font-normal ml-1">(optional)</span>}
    </Label>
    <div
      onClick={() => inputRef.current?.click()}
      className={`upload-drop flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all duration-200 ${file ? "has-file" : "border-border"}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${file ? "text-success" : "text-muted-foreground"}`} />
      <div className="min-w-0">
        <p className={`text-sm font-medium truncate ${file ? "text-foreground" : "text-muted-foreground"}`}>
          {file ? file.name : `Click to upload ${label.toLowerCase()}`}
        </p>
        {!file && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {file && <CheckCircle2 className="h-4 w-4 text-success ml-auto shrink-0" />}
    </div>
    <input ref={inputRef} id={id} type="file" accept={accept} className="hidden"
      onChange={(e) => onChange(e.target.files?.[0] || null)} />
  </div>
);

/* ─── Main Component ─────────────────────────────────────── */
const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>("applicant");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const govIdInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? null;

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await redirectByRole(session.user.id);
    };
    checkUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redirectByRole = async (userId: string) => {
    const { data: roleData } = await (supabase.from("user_roles" as any) as any)
      .select("role").eq("user_id", userId).single();
    if (roleData?.role === "admin") navigate("/admin-dashboard");
    else if (roleData?.role === "hr") navigate("/dashboard");
    else if (redirectTo) navigate(redirectTo);
    else navigate("/applicant-dashboard");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) toast.error("Invalid email or password");
        else if (error.message.includes("Email not confirmed")) toast.error("Please verify your email before signing in");
        else toast.error(error.message);
        return;
      }
      if (data.user) await redirectByRole(data.user.id);
    } catch { toast.error("An unexpected error occurred"); }
    finally { setIsLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === "applicant" && !resumeFile) {
      toast.error("Please upload your resume to continue");
      return;
    }
    setIsLoading(true);
    try {
      const metadata: Record<string, string> = { full_name: fullName, role: selectedRole };
      if (selectedRole === "hr") metadata.company_name = companyName;

      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/`, data: metadata },
      });

      if (error) {
        if (error.message.includes("User already registered")) toast.error("An account with this email already exists. Please sign in.");
        else toast.error(error.message);
        return;
      }

      if (data.user) {
        let govIdUrl: string | null = null;
        if (selectedRole === "applicant" && govIdFile) {
          const ext = govIdFile.name.split(".").pop();
          const path = `${data.user.id}/${Date.now()}.${ext}`;
          const { error: govErr } = await supabase.storage.from("government-ids").upload(path, govIdFile);
          if (!govErr) {
            const { data: govUrl } = await supabase.storage.from("government-ids").createSignedUrl(path, 60 * 60 * 24 * 365);
            govIdUrl = govUrl?.signedUrl ?? null;
          }
        }

        await (supabase.from("profiles" as any) as any).insert({
          user_id: data.user.id, email, full_name: fullName,
          company_name: selectedRole === "hr" ? companyName : null,
          government_id_url: govIdUrl, is_verified: true,
        });

        await (supabase.from("user_roles" as any) as any).insert({ user_id: data.user.id, role: selectedRole });

        if (selectedRole === "applicant" && resumeFile) {
          const ext = resumeFile.name.split(".").pop();
          const path = `${data.user.id}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from("resumes").upload(path, resumeFile);
          if (!upErr) {
            const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
            await (supabase.from("user_resumes" as any) as any).insert({
              user_id: data.user.id, file_name: resumeFile.name, resume_url: urlData.publicUrl,
            });
          }
        }

        toast.success("Account created! Signing you in...");
        const { data: siData } = await supabase.auth.signInWithPassword({ email, password });
        if (siData.user) await redirectByRole(siData.user.id);
        else { toast.info("Please sign in with your new account."); setIsSignUp(false); }
      }
    } catch { toast.error("An unexpected error occurred"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT: Branding Panel ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, hsl(221,83%,48%) 0%, hsl(240,70%,38%) 50%, hsl(262,83%,42%) 100%)" }}>

        {/* Ambient shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-white/4 blur-3xl" />
          {/* Dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
            <defs>
              <pattern id="gdots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gdots)" />
          </svg>
          {/* Decorative rings */}
          <svg className="absolute bottom-0 right-0 opacity-10" width="360" height="360" viewBox="0 0 360 360" fill="none">
            <circle cx="360" cy="360" r="280" stroke="white" strokeWidth="1" />
            <circle cx="360" cy="360" r="200" stroke="white" strokeWidth="1" />
            <circle cx="360" cy="360" r="120" stroke="white" strokeWidth="1" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">CareerLens</span>
          </Link>

          {/* Main copy */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-10">
              <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-4">Trusted by 500+ HR teams</p>
              <h2 className="text-4xl font-black text-white leading-tight mb-5">
                Smarter hiring<br />starts here.
              </h2>
              <p className="text-white/70 text-base leading-relaxed max-w-sm">
                AI-powered resume screening, GitHub validation, and career analytics — all in one platform designed for modern recruiters.
              </p>
            </div>

            <div className="space-y-4 mb-10">
              <Bullet icon={Zap} text="Analyse a resume in under 10 seconds" />
              <Bullet icon={TrendingUp} text="Instant AI compatibility scoring" />
              <Bullet icon={Shield} text="GitHub authentication & fraud detection" />
              <Bullet icon={CheckCircle2} text="Full career timeline gap analysis" />
            </div>

            {/* Illustration */}
            <AuthIllustration />
          </div>

          {/* Footer quote */}
          <p className="text-white/40 text-xs mt-auto">
            © {new Date().getFullYear()} CareerLens · Intelligent Hiring Platform
          </p>
        </div>
      </div>

      {/* ── RIGHT: Form Panel ─────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-background overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 px-6 py-5 border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-foreground">CareerLens</span>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 max-w-lg mx-auto w-full">
          {/* Back link */}
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group">
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to home
          </Link>

          {/* Heading */}
          <div className="mb-8 form-fade">
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {isSignUp
                ? "Join CareerLens to start your journey."
                : "Sign in to access your CareerLens dashboard."}
            </p>
          </div>

          {/* Role switcher (signup only) */}
          {isSignUp && (
            <div className="form-fade flex rounded-xl border border-border bg-muted/40 p-1 mb-6">
              {(["applicant", "hr"] as Role[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    selectedRole === role
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {role === "applicant" ? "I'm an Applicant" : "I'm a Recruiter"}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4 form-fade">
            {/* SignUp fields */}
            {isSignUp && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm font-semibold">Full Name</Label>
                  <Input id="fullName" type="text" placeholder="Jane Smith" value={fullName}
                    onChange={(e) => setFullName(e.target.value)} required
                    className="h-11 border-border/80 focus-visible:ring-primary/30" />
                </div>

                {selectedRole === "hr" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-sm font-semibold">Company Name</Label>
                    <Input id="companyName" type="text" placeholder="Acme Inc." value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-11 border-border/80 focus-visible:ring-primary/30" />
                  </div>
                )}

                {selectedRole === "applicant" && (
                  <>
                    <FilePicker
                      id="govId" label="Government ID" icon={IdCard}
                      file={govIdFile} onChange={setGovIdFile} inputRef={govIdInputRef}
                      accept=".pdf,.jpg,.jpeg,.png"
                      hint="Aadhaar / PAN / Passport (PDF, JPG, PNG)"
                    />
                    <FilePicker
                      id="resume" label="Resume (PDF)" required icon={Upload}
                      file={resumeFile} onChange={setResumeFile} inputRef={fileInputRef}
                      accept=".pdf,.doc,.docx"
                      hint="Saved to your library — reuse when applying to jobs"
                    />
                  </>
                )}
              </>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                className="h-11 border-border/80 focus-visible:ring-primary/30" />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"}
                  placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className="h-11 pr-10 border-border/80 focus-visible:ring-primary/30" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="btn-shimmer w-full h-12 text-base font-bold gap-2 shadow-md mt-2" disabled={isLoading}>
              {isLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" />{isSignUp ? "Creating account..." : "Signing in..."}</>
                : <>{isSignUp ? "Create Account" : "Sign In"} <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          {/* Toggle link */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary font-semibold hover:underline underline-offset-4">
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
