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
import {
    Briefcase,
    MapPin,
    DollarSign,
    CheckCircle,
    Loader2,
    Upload,
    FileText,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

const ApplyPage = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();

    const [job, setJob] = useState<JobPosting | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState("");

    // Form fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [githubUsername, setGithubUsername] = useState("");
    const [coverLetter, setCoverLetter] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchJob = async () => {
            if (!jobId) return;

            try {
                // Fetch job posting without authentication (public access)
                const { data, error } = await (supabase
                    .from("job_postings" as any) as any)
                    .select("*")
                    .eq("id", jobId)
                    .single();

                if (error || !data) {
                    console.error("Error fetching job:", error);
                    toast.error("Job posting not found");
                    return;
                }

                setJob(data as unknown as JobPosting);
            } catch (error) {
                console.error("Error:", error);
                toast.error("Failed to load job posting");
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [jobId]);

    const extractTextFromFile = async (file: File): Promise<string> => {
        if (file.type === "text/plain") {
            return await file.text();
        }

        if (file.type === "application/pdf") {
            return `Resume file: ${file.name}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nNote: PDF parsing would extract full text content here. For demonstration, please use a .txt file with resume content, or the AI will analyze based on the applicant information provided.`;
        }

        return await file.text();
    };

    const checkDuplicateApplication = async (): Promise<boolean> => {
        try {
            const { data, error } = await (supabase
                .from("applicants" as any) as any)
                .select("id")
                .eq("email", email)
                .eq("job_posting_id", jobId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                console.error("Duplicate check error:", error);
                return false;
            }

            return !!data; // Returns true if duplicate found
        } catch (error) {
            console.error("Error checking duplicate:", error);
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!resumeFile) {
            toast.error("Please upload your resume");
            return;
        }

        if (!job) return;

        setSubmitting(true);
        setProgress(0);

        try {
            // Step 1: Check for duplicate application
            setCurrentStep("Checking for existing application...");
            setProgress(10);

            const isDuplicate = await checkDuplicateApplication();
            if (isDuplicate) {
                toast.error("You have already applied to this position");
                setSubmitting(false);
                return;
            }

            // Step 2: Upload resume
            setCurrentStep("Uploading resume...");
            setProgress(25);

            const fileExt = resumeFile.name.split('.').pop();
            const fileName = `public/${jobId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("resumes")
                .upload(fileName, resumeFile);

            if (uploadError) {
                console.error("Upload error:", uploadError);
                toast.error("Failed to upload resume");
                return;
            }

            const { data: urlData } = supabase.storage
                .from("resumes")
                .getPublicUrl(fileName);

            const resumeUrl = urlData.publicUrl;

            // Step 3: Extract text from resume
            setCurrentStep("Extracting resume content...");
            setProgress(40);

            const resumeText = await extractTextFromFile(resumeFile);

            // Step 4: Analyze resume with AI
            setCurrentStep("Analyzing resume with AI...");
            setProgress(60);

            const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze-resume", {
                body: {
                    resumeText,
                    position: job.title,
                    applicantName: name,
                    jobRequirements: job.requirements,
                }
            });

            if (analysisError) {
                console.error("Analysis error:", analysisError);
                toast.error("Failed to analyze resume");
                return;
            }

            const analysis = analysisData?.analysis;

            // Step 5: Save applicant to database
            setCurrentStep("Submitting application...");
            setProgress(85);

            const { error: insertError } = await supabase
                .from("applicants")
                .insert({
                    job_posting_id: jobId,
                    name,
                    email,
                    position: job.title,
                    github_username: githubUsername || null,
                    resume_url: resumeUrl,
                    resume_analysis: analysis,
                    ai_score: analysis?.score || 0,
                    status: analysis?.status || "pending",
                    experience: analysis?.experience || null,
                    skills: analysis?.skills || [],
                    user_id: null, // Public applications don't have a user_id initially
                });

            if (insertError) {
                console.error("Insert error:", insertError);

                // Check if it's a duplicate error
                if (insertError.code === '23505') {
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
            console.error("Error submitting application:", error);
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
                        <p className="text-muted-foreground">
                            This job posting doesn't exist or has been removed.
                        </p>
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
                        <p className="text-muted-foreground">
                            This position is no longer accepting applications.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                                    <span className="capitalize">{job.employment_type.replace('-', ' ')}</span>
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
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name *</Label>
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
                                    <Label htmlFor="email">Email *</Label>
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
                                        placeholder="+1 (555) 000-0000"
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="github">GitHub Username</Label>
                                    <Input
                                        id="github"
                                        value={githubUsername}
                                        onChange={(e) => setGithubUsername(e.target.value)}
                                        placeholder="johndoe"
                                        disabled={submitting}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="resume">Resume *</Label>
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
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                                <Textarea
                                    id="coverLetter"
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    placeholder="Tell us why you're a great fit for this role..."
                                    rows={4}
                                    disabled={submitting}
                                />
                            </div>

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
