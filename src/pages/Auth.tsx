import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Upload, IdCard, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Role = "hr" | "applicant";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>("applicant");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const govIdInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
      // Applicant — check verification
      const { data: profileData } = await (supabase.from("profiles" as any) as any)
        .select("is_verified")
        .eq("user_id", userId)
        .single();

      if (profileData?.is_verified === false) {
        // Sign them out and show pending message
        await supabase.auth.signOut();
        toast.warning("Your account is pending admin verification. Please wait for approval.");
        return;
      }
      navigate("/applicant-dashboard");
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

    if (selectedRole === "applicant" && !govIdFile) {
      toast.error("Please upload your government ID to continue");
      return;
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
      if (selectedRole === "applicant" && githubUsername) {
        metadata.github_username = githubUsername;
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

        // Upload government ID for applicants
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

        // Create profile (is_verified = false by default for applicants, true for HR)
        await (supabase.from("profiles" as any) as any).insert({
          user_id: data.user.id,
          email,
          full_name: fullName,
          company_name: selectedRole === "hr" ? companyName : null,
          government_id_url: govIdUrl,
          is_verified: selectedRole === "hr", // HR is auto-verified; applicants need admin approval
        });

        // Assign role
        await (supabase.from("user_roles" as any) as any).insert({
          user_id: data.user.id,
          role: selectedRole,
        });

        // For applicants, upload resume and create applicant record
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

            // Create applicant record
            await (supabase.from("applicants" as any) as any).insert({
              user_id: data.user.id,
              name: fullName,
              email,
              position: "General Application",
              resume_url: urlData.publicUrl,
              github_username: githubUsername || null,
              status: "pending",
            });

            // Trigger resume analysis
            try {
              await supabase.functions.invoke("analyze-resume", {
                body: {
                  resumeUrl: urlData.publicUrl,
                  applicantName: fullName,
                  position: "General Application",
                },
              });
            } catch (analysisError) {
              console.error("Resume analysis error:", analysisError);
            }
          }
        }

        if (selectedRole === "hr") {
          toast.success("Account created! Redirecting to your HR dashboard...");
          // Sign in immediately since HR is auto-verified
          const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
          if (signInData.user) {
            navigate("/dashboard");
          } else {
            toast.info("Please sign in with your new account.");
            setIsSignUp(false);
          }
        } else {
          // Applicant — account needs admin approval
          await supabase.auth.signOut();
          toast.success(
            "Account created! Your government ID will be reviewed. You'll be able to log in once an admin approves your account.",
            { duration: 8000 }
          );
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
                    {/* Government ID upload — required */}
                    <div className="space-y-2">
                      <Label htmlFor="govId">
                        Government ID <span className="text-destructive">*</span>
                      </Label>
                      <div
                        onClick={() => govIdInputRef.current?.click()}
                        className={`flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                          govIdFile ? "border-primary" : "border-input"
                        }`}
                      >
                        <IdCard className={`h-4 w-4 ${govIdFile ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm ${govIdFile ? "text-foreground" : "text-muted-foreground"}`}>
                          {govIdFile ? govIdFile.name : "Upload Aadhaar / PAN / Passport (required)"}
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
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Your account will be reviewed by an admin before you can log in.</span>
                      </div>
                    </div>

                    {/* Resume upload — optional */}
                    <div className="space-y-2">
                      <Label htmlFor="resume">Resume (PDF) — Optional</Label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 border border-input rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {resumeFile ? resumeFile.name : "Upload your resume"}
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="github">GitHub Username (Optional)</Label>
                      <Input
                        id="github"
                        type="text"
                        placeholder="johndoe"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                      />
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
