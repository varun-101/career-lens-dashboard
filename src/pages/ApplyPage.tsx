import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Briefcase,
  MapPin,
  DollarSign,
  CheckCircle,
  Loader2,
  Upload,
  FileText,
  AlertCircle,
  Github,
  BookOpen,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface JobPosting {
  id: string;
  title: string;
  description: string | null;
  requirements: string[];
  location: string | null;
  employment_type: string | null;
  salary_range: string | null;
  is_active: boolean;
}

interface SavedResume {
  id: string;
  file_name: string;
  resume_url: string;
  uploaded_at: string;
}

type ResumeChoice = "library" | "new";

const ApplyPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  // Saved resumes from library
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [resumeChoice, setResumeChoice] = useState<ResumeChoice>("library");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // GitHub cross-validation warning
  const [githubMismatchWarning, setGithubMismatchWarning] = useState<string | null>(null);

  // Prefill form for logged-in users
  useEffect(() => {
    if (user) {
      setEmail(user.email ?? "");
      const meta = user.user_metadata;
      if (meta?.full_name) setName(meta.full_name);
      if (meta?.github_username) setGithubUsername(meta.github_username);
    }
  }, [user]);

  // Fetch job
  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return;
      try {
        const { data, error } = await (supabase
          .from("job_postings" as any) as any)
          .select("*")
          .eq("id", jobId)
          .single();

        if (error || !data) {
          toast.error("Job posting not found");
          return;
        }
        setJob(data as unknown as JobPosting);
      } catch {
        toast.error("Failed to load job posting");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  // Fetch saved resumes for logged-in applicants
  useEffect(() => {
    const fetchSavedResumes = async () => {
      if (!user) return;
      try {
        const { data, error } = await (supabase
          .from("user_resumes" as any) as any)
          .select("id, file_name, resume_url, uploaded_at")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false });

        if (!error && data && data.length > 0) {
          setSavedResumes(data as SavedResume[]);
          setSelectedResumeId(data[0].id); // default to most recent
          setResumeChoice("library");
        } else {
          setResumeChoice("new"); // no library → go straight to upload
        }
      } catch {
        setResumeChoice("new");
      }
    };
    fetchSavedResumes();
  }, [user]);

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === "text/plain") return await file.text();
    if (file.type === "application/pdf") {
      return `Resume file: ${file.name}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nNote: PDF text extraction would run here. Applicant-provided GitHub: ${githubUsername || "none"}.`;
    }
    return await file.text();
  };

  const checkDuplicateApplication = async (): Promise<boolean> => {
    try {
      const { data } = await (supabase
        .from("applicants" as any) as any)
        .select("id")
        .eq("email", email)
        .eq("job_posting_id", jobId)
        .maybeSingle();
      return !!data;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Validation ──
    if (!githubUsername.trim()) {
      toast.error("GitHub username is required");
      return;
    }

    const usingLibraryResume = resumeChoice === "library" && selectedResumeId;
    const usingNewFile = resumeChoice === "new" && resumeFile;

    if (!usingLibraryResume && !usingNewFile) {
      toast.error(resumeChoice === "library"
        ? "Please select a resume from your library"
        : "Please upload your resume");
      return;
    }

    if (!job) return;

    setSubmitting(true);
    setProgress(0);
    setGithubMismatchWarning(null);

    try {
      // Step 1: Duplicate check
      setCurrentStep("Checking for existing application...");
      setProgress(8);

      const isDuplicate = await checkDuplicateApplication();
      if (isDuplicate) {
        toast.error("You have already applied to this position");
        return;
      }

      // Step 2: Determine resume URL (from library or upload)
      let resumeUrl: string;
      let resumeId: string | null = null;

      if (usingLibraryResume) {
        setCurrentStep("Using saved resume...");
        setProgress(20);
        const chosen = savedResumes.find((r) => r.id === selectedResumeId)!;
        resumeUrl = chosen.resume_url;
        resumeId = chosen.id;
      } else {
        // Upload new resume
        setCurrentStep("Uploading resume...");
        setProgress(15);

        const fileExt = resumeFile!.name.split(".").pop();
        const fileName = user
          ? `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`
          : `public/${jobId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(fileName, resumeFile!);

        if (uploadError) {
          toast.error("Failed to upload resume");
          return;
        }

        const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(fileName);
        resumeUrl = urlData.publicUrl;

        // Save to library if user is logged in
        if (user) {
          setCurrentStep("Saving to your resume library...");
          setProgress(25);
          const { data: savedRow } = await (supabase
            .from("user_resumes" as any) as any)
            .insert({
              user_id: user.id,
              file_name: resumeFile!.name,
              resume_url: resumeUrl,
            })
            .select("id")
            .single();
          if (savedRow?.id) resumeId = savedRow.id;
        }
      }

      // Step 3: Extract resume text
      setCurrentStep("Extracting resume content...");
      setProgress(35);

      let resumeText: string;
      if (usingLibraryResume) {
        // For library resumes we pass the URL as context; AI will work on what it can parse
        resumeText = `Resume URL: ${resumeUrl}\nApplicant: ${name}\nGitHub (provided): ${githubUsername}`;
      } else {
        resumeText = await extractTextFromFile(resumeFile!);
      }

      // Step 4: AI resume analysis (also extracts GitHub from resume)
      setCurrentStep("Analysing resume with AI...");
      setProgress(50);

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-resume",
        {
          body: {
            resumeText,
            position: job.title,
            applicantName: name,
            jobRequirements: job.requirements,
          },
        }
      );

      if (analysisError) {
        toast.error("Failed to analyse resume");
        return;
      }

      const analysis = analysisData?.analysis;
      const extractedGithub: string | null = analysis?.extracted_github_username ?? null;

      // ── GitHub cross-validation ──
      const providedGithub = githubUsername.trim().toLowerCase();
      const extractedLower = extractedGithub?.toLowerCase() ?? null;

      let matchStatus: string = "none";
      if (providedGithub && extractedLower) {
        matchStatus = providedGithub === extractedLower ? "match" : "mismatch";
        if (matchStatus === "mismatch") {
          setGithubMismatchWarning(
            `The GitHub username you entered ("${githubUsername}") differs from the one found in your resume ("${extractedGithub}"). We'll validate the username you provided.`
          );
        }
      } else if (providedGithub) {
        matchStatus = "provided_only";
      } else if (extractedLower) {
        matchStatus = "extracted_only";
      }

      // Step 5: GitHub validation (automatic)
      setCurrentStep("Validating GitHub profile...");
      setProgress(68);

      let githubValidationId: string | null = null;
      const githubToValidate = providedGithub || extractedLower;

      if (githubToValidate) {
        try {
          const { data: ghData } = await supabase.functions.invoke("validate-github", {
            body: {
              githubUsername: githubToValidate,
              applicantName: name,
            },
          });
          if (ghData?.success && ghData?.validation?.id) {
            githubValidationId = ghData.validation.id;
          }
        } catch (ghErr) {
          console.error("GitHub validation error (non-fatal):", ghErr);
        }
      }

      // Step 6: Save applicant
      setCurrentStep("Submitting application...");
      setProgress(85);

      const { error: insertError } = await (supabase
        .from("applicants" as any) as any)
        .insert({
          job_posting_id: jobId,
          user_id: user?.id ?? null,
          name,
          email,
          position: job.title,
          github_username: githubUsername.trim() || null,
          github_extracted_username: extractedGithub,
          github_match_status: matchStatus,
          github_validation_id: githubValidationId,
          resume_url: resumeUrl,
          resume_id: resumeId,
          resume_analysis: analysis,
          ai_score: analysis?.score || 0,
          status: analysis?.status || "pending",
          experience: analysis?.experience || null,
          skills: analysis?.skills || [],
        });

      if (insertError) {
        if (insertError.code === "23505") {
          toast.error("You have already applied to this position");
        } else {
          toast.error("Failed to submit application");
        }
        return;
      }

      setProgress(100);
      setCurrentStep("Complete!");

      toast.success("Application submitted successfully!");
      navigate("/apply/success");
    } catch (error) {
      console.error("Application error:", error);
      toast.error("An error occurred while submitting your application");
    } finally {
      setSubmitting(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
            <p className="text-muted-foreground">This job posting doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Position Closed</h2>
            <p className="text-muted-foreground">This position is no longer accepting applications.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedLibraryResume = savedResumes.find((r) => r.id === selectedResumeId);

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Job Details */}
        <Card className="shadow-elevated border-border mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{job.title}</CardTitle>
                <CardDescription className="text-base">
                  {job.description || "Apply for this position"}
                </CardDescription>
              </div>
              <Badge variant="default" className="text-sm">Open</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {job.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{job.location}</span>
                </div>
              )}
              {job.employment_type && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span className="capitalize">{job.employment_type.replace("-", " ")}</span>
                </div>
              )}
              {job.salary_range && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{job.salary_range}</span>
                </div>
              )}
            </div>

            {job.requirements.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Requirements</h3>
                  <ul className="space-y-1">
                    {job.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Application Form */}
        <Card className="shadow-elevated border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submit Your Application
            </CardTitle>
            <CardDescription>
              Fill out the form below to apply for this position
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github">
                      GitHub Username <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="github"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="johndoe"
                        disabled={submitting}
                        className="pl-9"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your GitHub profile URL — also extracted from resume and cross-validated.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Resume Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Resume <span className="text-destructive">*</span>
                </h3>

                {user && savedResumes.length > 0 ? (
                  <RadioGroup
                    value={resumeChoice}
                    onValueChange={(v) => setResumeChoice(v as ResumeChoice)}
                    className="space-y-3"
                  >
                    {/* Option A: Library */}
                    <div className={`border rounded-lg p-4 transition-colors ${resumeChoice === "library" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <RadioGroupItem value="library" id="choice-library" disabled={submitting} />
                        <Label htmlFor="choice-library" className="flex items-center gap-2 cursor-pointer font-medium">
                          <BookOpen className="h-4 w-4 text-primary" />
                          Choose from your resume library
                        </Label>
                      </div>

                      {resumeChoice === "library" && (
                        <div className="ml-7 space-y-2">
                          {savedResumes.map((resume) => (
                            <label
                              key={resume.id}
                              className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                                selectedResumeId === resume.id
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <input
                                type="radio"
                                name="savedResume"
                                value={resume.id}
                                checked={selectedResumeId === resume.id}
                                onChange={() => setSelectedResumeId(resume.id)}
                                disabled={submitting}
                                className="accent-primary"
                              />
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{resume.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                              {selectedResumeId === resume.id && (
                                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Option B: Upload new */}
                    <div className={`border rounded-lg p-4 transition-colors ${resumeChoice === "new" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <RadioGroupItem value="new" id="choice-new" disabled={submitting} />
                        <Label htmlFor="choice-new" className="flex items-center gap-2 cursor-pointer font-medium">
                          <Upload className="h-4 w-4 text-primary" />
                          Upload a new resume
                        </Label>
                        <Badge variant="outline" className="text-xs">Saved to library</Badge>
                      </div>

                      {resumeChoice === "new" && (
                        <div className="ml-7">
                          <Input
                            id="resume-file"
                            type="file"
                            accept=".pdf,.txt,.doc,.docx"
                            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                            className="cursor-pointer"
                            disabled={submitting}
                          />
                          {resumeFile && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                              <CheckCircle className="h-4 w-4 text-success" />
                              {resumeFile.name}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </RadioGroup>
                ) : (
                  /* No library (not logged in or no saved resumes) — show simple upload */
                  <div className="space-y-2">
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                      required
                      disabled={submitting}
                    />
                    {resumeFile && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-success" />
                        {resumeFile.name}
                      </div>
                    )}
                    {!user && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Sign in to save resumes to your library and reuse them.
                      </p>
                    )}
                  </div>
                )}

                {/* GitHub mismatch warning (shown after previous failed submission) */}
                {githubMismatchWarning && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/30 text-sm text-warning-foreground">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                    <span>{githubMismatchWarning}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Cover Letter */}
              <div className="space-y-2">
                <Label htmlFor="coverLetter">Cover Letter <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <Textarea
                  id="coverLetter"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell us why you're a great fit for this role..."
                  rows={4}
                  disabled={submitting}
                />
              </div>

              {/* Progress Bar */}
              {submitting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{currentStep}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplyPage;
