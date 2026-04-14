import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Upload, IdCard } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Role = "hr" | "applicant";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  // On mount, check if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await redirectByRole(session.user.id);
      }
    };
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redirectByRole = async (userId: string) => {
    const { data: roleData } = await (supabase.from("user_roles" as any) as any)
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData?.role === "admin") {
      navigate("/admin-dashboard");
    } else if (roleData?.role === "hr") {
      navigate("/dashboard");
    } else {
      // Applicant — redirect to original destination or dashboard
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        navigate("/applicant-dashboard");
      }
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Please verify your email before signing in");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        await redirectByRole(data.user.id);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Validation ── (resume is still required for applicants; gov-ID is now optional)
    if (selectedRole === "applicant") {
      if (!resumeFile) {
        toast.error("Please upload your resume to continue");
        return;
      }
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;

      const metadata: Record<string, string> = {
        full_name: fullName,
        role: selectedRole,
      };
      if (selectedRole === "hr") {
        metadata.company_name = companyName;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata,
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("An account with this email already exists. Please sign in.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        let govIdUrl: string | null = null;

        // ── Upload Government ID (optional for applicants) ──
        if (selectedRole === "applicant" && govIdFile) {
          const govIdExt = govIdFile.name.split(".").pop();
          const govIdPath = `${data.user.id}/${Date.now()}.${govIdExt}`;

          const { error: govUploadError } = await supabase.storage
            .from("government-ids")
            .upload(govIdPath, govIdFile);

          if (!govUploadError) {
            const { data: govUrlData } = await supabase.storage
              .from("government-ids")
              .createSignedUrl(govIdPath, 60 * 60 * 24 * 365); // 1 year
            govIdUrl = govUrlData?.signedUrl ?? null;
          } else {
            console.error("Gov ID upload error:", govUploadError);
          }
        }

        // ── Create Profile ── (applicants are auto-verified; gov-ID status tracked via government_id_url)
        await (supabase.from("profiles" as any) as any).insert({
          user_id: data.user.id,
          email,
          full_name: fullName,
          company_name: selectedRole === "hr" ? companyName : null,
          government_id_url: govIdUrl,
          is_verified: true, // all accounts auto-verified; gov-ID upload is optional
        });

        // ── Assign Role ──
        await (supabase.from("user_roles" as any) as any).insert({
          user_id: data.user.id,
          role: selectedRole,
        });

        // ── Upload Resume & save to library (required for applicants) ──
        if (selectedRole === "applicant" && resumeFile) {
          const fileExt = resumeFile.name.split(".").pop();
          const filePath = `${data.user.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("resumes")
            .upload(filePath, resumeFile);

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("resumes")
              .getPublicUrl(filePath);

            const resumePublicUrl = urlData.publicUrl;

            // ── Save to user_resumes library ──
            await (supabase.from("user_resumes" as any) as any).insert({
              user_id: data.user.id,
              file_name: resumeFile.name,
              resume_url: resumePublicUrl,
            });
          }
        }

        // ── Auto sign-in for both HR and applicants ──
        toast.success("Account created! Signing you in...");
        const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
        if (signInData.user) {
          await redirectByRole(signInData.user.id);
        } else {
          toast.info("Please sign in with your new account.");
          setIsSignUp(false);
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary p-3">
              <Brain className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Sign up to get started"
              : "Sign in to access your dashboard"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp && (
            <div className="flex rounded-lg border border-border mb-6 overflow-hidden">
              <button
                type="button"
                onClick={() => setSelectedRole("applicant")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  selectedRole === "applicant"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                Applicant
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("hr")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  selectedRole === "hr"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                HR / Recruiter
              </button>
            </div>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                {selectedRole === "hr" && (
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Acme Inc."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                )}

                {selectedRole === "applicant" && (
                  <>
                    {/* Government ID — optional */}
                    <div className="space-y-2">
                      <Label htmlFor="govId">
                        Government ID{" "}
                        <span className="text-muted-foreground text-xs">(optional — can be added later)</span>
                      </Label>
                      <div
                        onClick={() => govIdInputRef.current?.click()}
                        className={`flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                          govIdFile ? "border-primary" : "border-input"
                        }`}
                      >
                        <IdCard className={`h-4 w-4 ${govIdFile ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm ${govIdFile ? "text-foreground" : "text-muted-foreground"}`}>
                          {govIdFile ? govIdFile.name : "Upload Aadhaar / PAN / Passport (optional)"}
                        </span>
                      </div>
                      <input
                        ref={govIdInputRef}
                        id="govId"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setGovIdFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    {/* Resume — required */}
                    <div className="space-y-2">
                      <Label htmlFor="resume">
                        Resume (PDF) <span className="text-destructive">*</span>
                      </Label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                          resumeFile ? "border-primary" : "border-input"
                        }`}
                      >
                        <Upload className={`h-4 w-4 ${resumeFile ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm ${resumeFile ? "text-foreground" : "text-muted-foreground"}`}>
                          {resumeFile ? resumeFile.name : "Upload your resume (required)"}
                        </span>
                      </div>
                      <input
                        ref={fileInputRef}
                        id="resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Saved to your resume library — choose it when applying to jobs.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? isSignUp ? "Creating account..." : "Signing in..."
                : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
            <div>
              <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Back to home
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
