import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Download,
    Eye,
    Github,
    Mail,
    Briefcase,
    Calendar,
    CheckCircle,
    AlertTriangle,
    Shield,
    Loader2,
    FileText,
    GitBranch,
    Info,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EffortVsClaimChart } from "@/components/EffortVsClaimChart";
import { ResumeTimelineChart } from "@/components/ResumeTimelineChart";

interface ResumeAnalysis {
    score?: number;
    status?: string;
    experience?: string;
    skills?: string[];
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: string[];
    timeline?: Array<{
        type: "education" | "job" | "project";
        title: string;
        start: string;
        end: string;
        description: string;
    }>;
}

interface GitHubValidation {
    id: string;
    authenticity_score: number;
    analysis_summary: string | null;
    red_flags: string[];
    positive_indicators: string[];
    total_repos: number;
    account_age_days: number;
}

interface Applicant {
    id: string;
    name: string;
    email: string;
    position: string;
    ai_score: number | null;
    experience: string | null;
    skills: string[];
    created_at: string;
    status: string | null;
    github_username: string | null;
    github_extracted_username: string | null;
    github_match_status: string | null;
    github_validation_id: string | null;
    resume_url: string | null;
    resume_analysis: ResumeAnalysis | null;
}

const CandidateDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [applicant, setApplicant] = useState<Applicant | null>(null);
    const [loading, setLoading] = useState(true);
    const [githubValidation, setGithubValidation] = useState<GitHubValidation | null>(null);
    const [isReanalysing, setIsReanalysing] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/auth");
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        const fetchApplicant = async () => {
            if (!id || !user) return;

            try {
                const { data, error } = await supabase
                    .from("applicants")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error) {
                    console.error("Error fetching applicant:", error);
                    toast.error("Failed to load candidate details");
                    navigate("/dashboard");
                    return;
                }

                const mappedApplicant: Applicant = {
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    position: data.position,
                    ai_score: data.ai_score,
                    experience: data.experience,
                    skills: data.skills || [],
                    created_at: data.created_at,
                    status: data.status,
                    github_username: data.github_username,
                    github_extracted_username: (data as any).github_extracted_username ?? null,
                    github_match_status: (data as any).github_match_status ?? null,
                    github_validation_id: data.github_validation_id ?? null,
                    resume_url: data.resume_url,
                    resume_analysis: data.resume_analysis as ResumeAnalysis | null,
                };

                // Fetch GitHub validation if present
                if (data.github_validation_id) {
                    const { data: ghVal } = await supabase
                        .from("github_validations")
                        .select("*")
                        .eq("id", data.github_validation_id)
                        .single();
                    if (ghVal) {
                        setGithubValidation({
                            id: ghVal.id,
                            authenticity_score: ghVal.authenticity_score,
                            analysis_summary: ghVal.analysis_summary,
                            red_flags: (ghVal.red_flags as string[]) || [],
                            positive_indicators: (ghVal.positive_indicators as string[]) || [],
                            total_repos: ghVal.total_repos,
                            account_age_days: ghVal.account_age_days,
                        });
                    }
                }

                setApplicant(mappedApplicant);
            } catch (error) {
                console.error("Error:", error);
                toast.error("An error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchApplicant();
    }, [id, user, navigate]);

    const getScoreColor = (score: number | null) => {
        if (!score) return "text-muted-foreground";
        if (score >= 85) return "text-success";
        if (score >= 70) return "text-warning";
        return "text-destructive";
    };

    const getScoreBadgeVariant = (status: string | null) => {
        switch (status) {
            case "excellent":
                return "default";
            case "good":
                return "secondary";
            case "average":
                return "outline";
            default:
                return "outline";
        }
    };

    const getSignedResumeUrl = async (resumeUrl: string): Promise<string | null> => {
        try {
            // Extract the storage path from the full URL
            // URLs look like: https://<project>.supabase.co/storage/v1/object/public/resumes/<path>
            // or:             https://<project>.supabase.co/storage/v1/object/sign/resumes/<path>
            const url = new URL(resumeUrl);
            const pathParts = url.pathname.split('/resumes/');
            if (pathParts.length < 2) return resumeUrl; // fallback

            const filePath = pathParts[1];

            const { data, error } = await supabase.storage
                .from('resumes')
                .createSignedUrl(filePath, 60 * 60); // 1 hour

            if (error || !data?.signedUrl) {
                console.error('Signed URL error:', error);
                return null;
            }
            return data.signedUrl;
        } catch (err) {
            console.error('getSignedResumeUrl error:', err);
            return null;
        }
    };

    const handleViewResume = async () => {
        if (!applicant?.resume_url) return;
        const signedUrl = await getSignedResumeUrl(applicant.resume_url);
        if (!signedUrl) {
            toast.error('Failed to generate resume link');
            return;
        }
        window.open(signedUrl, '_blank');
    };

    const handleDownloadResume = async () => {
        if (!applicant?.resume_url) return;
        try {
            const signedUrl = await getSignedResumeUrl(applicant.resume_url);
            if (!signedUrl) {
                toast.error('Failed to generate download link');
                return;
            }
            const response = await fetch(signedUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${applicant.name.replace(/\s+/g, '_')}_resume.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Resume downloaded successfully!");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download resume");
        }
    };

    const handleReanalyse = async () => {
        if (!applicant?.resume_url || !applicant?.id) return;
        setIsReanalysing(true);

        try {
            // Step 1: Get a signed URL to fetch the resume file
            const signedUrl = await getSignedResumeUrl(applicant.resume_url);
            if (!signedUrl) {
                toast.error("Could not access resume file");
                return;
            }

            // Step 2: Fetch the file and extract text
            const fileRes = await fetch(signedUrl);
            if (!fileRes.ok) {
                toast.error("Failed to fetch resume file");
                return;
            }

            // Try to read as text — works well for text/plain, gives partial content for PDFs
            const blob = await fileRes.blob();
            let resumeText: string;
            try {
                resumeText = await blob.text();
            } catch {
                resumeText = `Resume file for ${applicant.name} (binary file, text extraction unavailable)`;
            }

            // Step 3: Call analyze-resume edge function
            const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
                "analyze-resume",
                {
                    body: {
                        resumeText,
                        position: applicant.position,
                        applicantName: applicant.name,
                    },
                }
            );

            if (analysisError || !analysisData?.analysis) {
                toast.error("Re-analysis failed — the old analysis has been kept");
                return;
            }

            const newAnalysis = analysisData.analysis;

            // Step 4: Update the DB record (only on success)
            const { error: updateError } = await (supabase
                .from("applicants" as any) as any)
                .update({
                    resume_analysis: newAnalysis,
                    ai_score: newAnalysis.score ?? applicant.ai_score,
                    status: newAnalysis.status ?? applicant.status,
                    experience: newAnalysis.experience ?? applicant.experience,
                    skills: newAnalysis.skills ?? applicant.skills,
                    github_extracted_username: newAnalysis.extracted_github_username ?? applicant.github_extracted_username,
                })
                .eq("id", applicant.id);

            if (updateError) {
                console.error("DB update error:", updateError);
                toast.error("Re-analysis complete but failed to save — please try again");
                return;
            }

            // Step 5: Update local state immediately (no page reload)
            setApplicant((prev) =>
                prev
                    ? {
                          ...prev,
                          resume_analysis: newAnalysis,
                          ai_score: newAnalysis.score ?? prev.ai_score,
                          status: newAnalysis.status ?? prev.status,
                          experience: newAnalysis.experience ?? prev.experience,
                          skills: newAnalysis.skills ?? prev.skills,
                          github_extracted_username:
                              newAnalysis.extracted_github_username ?? prev.github_extracted_username,
                      }
                    : prev
            );

            toast.success("Resume re-analysed successfully!");
        } catch (error) {
            console.error("Re-analysis error:", error);
            toast.error("An unexpected error occurred during re-analysis");
        } finally {
            setIsReanalysing(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!applicant) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Candidate not found</h2>
                    <Button asChild>
                        <Link to="/dashboard">Back to Dashboard</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card shadow-soft">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <Button variant="ghost" asChild className="gap-2">
                            <Link to="/dashboard">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Dashboard
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <h1 className="text-xl font-bold">Candidate Profile</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Candidate Header */}
                <Card className="shadow-elevated border-border mb-6">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-bold">{applicant.name}</h2>
                                    <Badge variant={getScoreBadgeVariant(applicant.status)} className="text-lg px-3 py-1">
                                        {applicant.status || "pending"}
                                    </Badge>
                                </div>
                                <div className="flex flex-col gap-2 text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        <a href={`mailto:${applicant.email}`} className="hover:text-primary">
                                            {applicant.email}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" />
                                        <span>{applicant.position}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>Applied {new Date(applicant.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {applicant.github_username && (
                                        <div className="flex items-center gap-2">
                                            <Github className="h-4 w-4" />
                                            <a
                                                href={`https://github.com/${applicant.github_username}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-primary"
                                            >
                                                @{applicant.github_username}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground mb-1">AI Score</p>
                                    <p className={`text-5xl font-bold ${getScoreColor(applicant.ai_score)}`}>
                                        {applicant.ai_score || 0}%
                                    </p>
                                </div>
                                {applicant.resume_url && (
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleViewResume}
                                            className="gap-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            View Resume
                                        </Button>
                                        <Button onClick={handleDownloadResume} className="gap-2">
                                            <Download className="h-4 w-4" />
                                            Download
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleReanalyse}
                                            disabled={isReanalysing}
                                            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
                                        >
                                            {isReanalysing ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Re-analysing...
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="h-4 w-4" />
                                                    Re-analyse
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── GitHub Cross-Validation Card ── */}
                {(applicant.github_username || applicant.github_extracted_username) && (
                    <Card className="shadow-soft border-border mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Github className="h-5 w-5" />
                                GitHub Verification
                            </CardTitle>
                            <CardDescription>Cross-validation between provided and resume-extracted GitHub</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Provided username */}
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provided by candidate</p>
                                    {applicant.github_username ? (
                                        <a
                                            href={`https://github.com/${applicant.github_username}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                                        >
                                            <Github className="h-4 w-4" />
                                            @{applicant.github_username}
                                        </a>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Not provided</p>
                                    )}
                                </div>

                                {/* Extracted from resume */}
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Extracted from resume</p>
                                    {applicant.github_extracted_username ? (
                                        <a
                                            href={`https://github.com/${applicant.github_extracted_username}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                                        >
                                            <GitBranch className="h-4 w-4" />
                                            @{applicant.github_extracted_username}
                                        </a>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Not found in resume</p>
                                    )}
                                </div>
                            </div>

                            {/* Match status badge */}
                            <div className="flex items-center gap-2">
                                {applicant.github_match_status === "match" && (
                                    <Badge variant="default" className="gap-1 bg-green-600">
                                        <CheckCircle className="h-3 w-3" /> Verified Match
                                    </Badge>
                                )}
                                {applicant.github_match_status === "mismatch" && (
                                    <Badge variant="destructive" className="gap-1">
                                        <AlertTriangle className="h-3 w-3" /> Mismatch — Review Required
                                    </Badge>
                                )}
                                {applicant.github_match_status === "provided_only" && (
                                    <Badge variant="outline" className="gap-1">
                                        <Info className="h-3 w-3" /> Provided only (not in resume)
                                    </Badge>
                                )}
                                {applicant.github_match_status === "extracted_only" && (
                                    <Badge variant="secondary" className="gap-1">
                                        <GitBranch className="h-3 w-3" /> Extracted only (not declared)
                                    </Badge>
                                )}
                            </div>

                            {/* GitHub validation score */}
                            {githubValidation && (
                                <>
                                    <Separator />
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold">Authenticity Score</p>
                                            <span className={`text-2xl font-bold ${githubValidation.authenticity_score >= 70 ? "text-success" :
                                                    githubValidation.authenticity_score >= 50 ? "text-warning" : "text-destructive"
                                                }`}>
                                                {githubValidation.authenticity_score}%
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                                            <div>📁 {githubValidation.total_repos} repositories</div>
                                            <div>📅 Account age: {Math.round(githubValidation.account_age_days / 30)}mo</div>
                                        </div>
                                        {githubValidation.analysis_summary && (
                                            <p className="text-sm text-muted-foreground">{githubValidation.analysis_summary}</p>
                                        )}
                                        {githubValidation.positive_indicators.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1">Positive Indicators</p>
                                                <ul className="space-y-1">
                                                    {githubValidation.positive_indicators.slice(0, 3).map((pi, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm">
                                                            <CheckCircle className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />
                                                            {pi}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {githubValidation.red_flags.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1">Red Flags</p>
                                                <ul className="space-y-1">
                                                    {githubValidation.red_flags.map((rf, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm">
                                                            <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                                                            {rf}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Tabs defaultValue="analysis" className="space-y-4">
                    <TabsList className="grid w-full max-w-lg grid-cols-3">
                        <TabsTrigger value="analysis">Analysis</TabsTrigger>
                        <TabsTrigger value="effort">Effort vs Claim</TabsTrigger>
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    </TabsList>

                    {/* Analysis Tab — existing cards */}
                    <TabsContent value="analysis">
                        <div className="grid gap-6 md:grid-cols-2">
                    {/* Skills & Experience */}
                    <Card className="shadow-soft border-border">
                        <CardHeader>
                            <CardTitle>Skills & Experience</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold mb-2">Experience</h4>
                                <p className="text-muted-foreground">
                                    {applicant.experience || applicant.resume_analysis?.experience || "Not specified"}
                                </p>
                            </div>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(applicant.skills || []).length > 0 ? (
                                        applicant.skills.map((skill) => (
                                            <Badge key={skill} variant="secondary">
                                                {skill}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground text-sm">No skills listed</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary */}
                    {applicant.resume_analysis?.summary && (
                        <Card className="shadow-soft border-border">
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{applicant.resume_analysis.summary}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Strengths */}
                    {applicant.resume_analysis?.strengths && applicant.resume_analysis.strengths.length > 0 ? (
                        <Card className="shadow-soft border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-success" />
                                    Strengths
                                </CardTitle>
                                <CardDescription>Key positive indicators from resume analysis</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {applicant.resume_analysis.strengths.map((strength, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                            <span className="text-muted-foreground">{strength}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ) : (
                        applicant.resume_analysis && (
                            <Card className="shadow-soft border-border">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-muted-foreground" />
                                        Strengths
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-sm italic">No notable strengths identified from this resume.</p>
                                </CardContent>
                            </Card>
                        )
                    )}

                    {/* Weaknesses */}
                    {applicant.resume_analysis?.weaknesses && applicant.resume_analysis.weaknesses.length > 0 ? (
                        <Card className="shadow-soft border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-warning" />
                                    Areas for Improvement
                                </CardTitle>
                                <CardDescription>Potential concerns or gaps identified</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {applicant.resume_analysis.weaknesses.map((weakness, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                            <span className="text-muted-foreground">{weakness}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ) : (
                        applicant.resume_analysis && (
                            <Card className="shadow-soft border-border">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                                        Areas for Improvement
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-sm italic">No specific areas for improvement identified.</p>
                                </CardContent>
                            </Card>
                        )
                    )}

                    {/* Recommendations */}
                    {applicant.resume_analysis?.recommendations && applicant.resume_analysis.recommendations.length > 0 && (
                        <Card className="shadow-soft border-border md:col-span-2">
                            <CardHeader>
                                <CardTitle>Hiring Recommendations</CardTitle>
                                <CardDescription>AI-generated suggestions for next steps</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ol className="space-y-3">
                                    {applicant.resume_analysis.recommendations.map((rec, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                                                {i + 1}
                                            </span>
                                            <span className="text-muted-foreground pt-0.5">{rec}</span>
                                        </li>
                                    ))}
                                </ol>
                            </CardContent>
                        </Card>
                    )}
                        </div>
                    </TabsContent>

                    {/* Effort vs Claim Tab */}
                    <TabsContent value="effort">
                        <Card className="shadow-soft border-border">
                            <CardHeader>
                                <CardTitle>Effort vs Claim</CardTitle>
                                <CardDescription>
                                    How well are the candidate's claimed skills backed by evidence in their resume?
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <EffortVsClaimChart analysis={applicant.resume_analysis ?? {}} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Timeline Tab */}
                    <TabsContent value="timeline">
                        <Card className="shadow-soft border-border">
                            <CardHeader>
                                <CardTitle>Career Timeline</CardTitle>
                                <CardDescription>
                                    Education, work history, and projects extracted from the resume. Gaps highlighted automatically.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResumeTimelineChart timeline={applicant.resume_analysis?.timeline ?? []} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};

export default CandidateDetail;
