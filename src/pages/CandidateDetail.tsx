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
    ChevronDown,
    ChevronUp,
    Star,
    TrendingDown,
    Lightbulb,
    GitMerge,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EffortVsClaimChart } from "@/components/EffortVsClaimChart";
import { ResumeTimelineChart } from "@/components/ResumeTimelineChart";

/* ─────────────────────────────────────────────────────────────
   Helper: extract a short headline from a long AI bullet string
   e.g. "Strong Project Portfolio: ..." → "Strong Project Portfolio"
   Falls back to first ~6 words if no colon found.
───────────────────────────────────────────────────────────────*/
function extractHeadline(text: string): { headline: string; detail: string } {
    const colonIdx = text.indexOf(":");
    if (colonIdx > 4 && colonIdx < 60) {
        return {
            headline: text.slice(0, colonIdx).trim(),
            detail: text.slice(colonIdx + 1).trim(),
        };
    }
    const words = text.split(" ");
    const headline = words.slice(0, 6).join(" ") + (words.length > 6 ? "…" : "");
    return { headline, detail: text };
}

/* ─────────────────────────────────────────────────────────────
   InsightCard — Strengths or Weaknesses with accordion items
───────────────────────────────────────────────────────────────*/
interface InsightCardProps { type: "strength" | "weakness"; items: string[]; }

const InsightCard = ({ type, items }: InsightCardProps) => {
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const isStrength = type === "strength";
    if (items.length === 0) {
        return (
            <Card className="shadow-soft border-border">
                <CardContent className="py-8 text-center text-muted-foreground text-sm italic">
                    {isStrength ? "No notable strengths identified." : "No specific improvement areas identified."}
                </CardContent>
            </Card>
        );
    }
    return (
        <Card className={`shadow-soft hover:shadow-md transition-shadow overflow-hidden border-t-4 ${isStrength ? "border-t-success" : "border-t-warning"}`}>
            <CardHeader className="bg-muted/10 border-b pb-4">
                <CardTitle className={`flex items-center gap-2.5 ${isStrength ? "text-success" : "text-warning"}`}>
                    {isStrength ? <><Star className="h-5 w-5" /> Key Strengths</> : <><TrendingDown className="h-5 w-5" /> Areas for Improvement</>}
                </CardTitle>
                <CardDescription>
                    {isStrength
                        ? `${items.length} positive indicator${items.length !== 1 ? "s" : ""} — click any to expand`
                        : `${items.length} concern${items.length !== 1 ? "s" : ""} identified — click any to expand`}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-border/60">
                {items.map((item, i) => {
                    const { headline, detail } = extractHeadline(item);
                    const isOpen = expandedIdx === i;
                    return (
                        <button key={i} className="w-full text-left py-3 px-1 group focus:outline-none"
                            onClick={() => setExpandedIdx(isOpen ? null : i)}>
                            <div className="flex items-center gap-3">
                                <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isStrength ? "bg-success/10" : "bg-warning/10"}`}>
                                    {isStrength
                                        ? <CheckCircle className="h-3 w-3 text-success" />
                                        : <AlertTriangle className="h-3 w-3 text-warning" />}
                                </div>
                                <span className="flex-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{headline}</span>
                                {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            </div>
                            {isOpen && detail !== headline && (
                                <p className="mt-2 ml-8 text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-3">{detail}</p>
                            )}
                        </button>
                    );
                })}
            </CardContent>
        </Card>
    );
};

/* ─────────────────────────────────────────────────────────────
   RecommendationsCard — numbered accordion
───────────────────────────────────────────────────────────────*/
const RecommendationsCard = ({ items }: { items: string[] }) => {
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    return (
        <Card className="shadow-soft border-border md:col-span-2 hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="bg-primary/5 border-b pb-4">
                <CardTitle className="flex items-center gap-2.5 text-primary">
                    <Lightbulb className="h-5 w-5" /> Hiring Recommendations
                </CardTitle>
                <CardDescription>{items.length} AI-generated action{items.length !== 1 ? "s" : ""} — click any to expand</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-border/60">
                {items.map((rec, i) => {
                    const { headline, detail } = extractHeadline(rec);
                    const isOpen = expandedIdx === i;
                    return (
                        <button key={i} className="w-full text-left py-3 px-1 group focus:outline-none"
                            onClick={() => setExpandedIdx(isOpen ? null : i)}>
                            <div className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black flex-shrink-0">{i + 1}</span>
                                <span className="flex-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{headline}</span>
                                {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            </div>
                            {isOpen && detail !== headline && (
                                <p className="mt-2 ml-9 text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-3">{detail}</p>
                            )}
                        </button>
                    );
                })}
            </CardContent>
        </Card>
    );
};

/* ─────────────────────────────────────────────────────────────
   GitHubCard — compact status bar, expandable full detail
───────────────────────────────────────────────────────────────*/
interface GitHubValidationLocal {
    id: string; authenticity_score: number; analysis_summary: string | null;
    red_flags: string[]; positive_indicators: string[]; total_repos: number; account_age_days: number;
}
interface GitHubCardProps {
    githubUsername: string | null; githubExtractedUsername: string | null;
    githubMatchStatus: string | null; githubValidation: GitHubValidationLocal | null;
}

const GitHubCard = ({ githubUsername, githubExtractedUsername, githubMatchStatus, githubValidation }: GitHubCardProps) => {
    const [expanded, setExpanded] = useState(false);
    const matchConfig: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
        match: { label: "Verified Match", icon: CheckCircle, cls: "text-success bg-success/10 border-success/20" },
        mismatch: { label: "Mismatch — Review", icon: AlertTriangle, cls: "text-destructive bg-destructive/10 border-destructive/20" },
        provided_only: { label: "Provided only", icon: Info, cls: "text-warning bg-warning/10 border-warning/20" },
        extracted_only: { label: "Extracted only", icon: GitMerge, cls: "text-muted-foreground bg-muted/40 border-border" },
    };
    const mc = matchConfig[githubMatchStatus ?? ""] ?? null;
    const authScore = githubValidation?.authenticity_score ?? null;
    const authColor = authScore == null ? "text-muted-foreground" : authScore >= 70 ? "text-success" : authScore >= 50 ? "text-warning" : "text-destructive";

    return (
        <Card className="shadow-soft border-border mb-6 overflow-hidden">
            {/* Compact always-visible row */}
            <button className="w-full text-left" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Github className="h-4 w-4 text-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">GitHub Verification</p>
                            <p className="text-xs text-muted-foreground">{githubUsername ? `@${githubUsername}` : "No username provided"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {authScore !== null && (
                            <div className={`text-base font-black ${authColor}`}>
                                {authScore}%<span className="text-xs font-normal text-muted-foreground ml-1">authentic</span>
                            </div>
                        )}
                        {mc && (
                            <div className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${mc.cls}`}>
                                <mc.icon className="h-3 w-3" /> {mc.label}
                            </div>
                        )}
                        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </div>
                </div>
            </button>

            {/* Expanded detail drawer */}
            {expanded && (
                <div className="px-6 pb-6 pt-4 space-y-5 border-t border-border bg-muted/10">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Provided by candidate</p>
                            {githubUsername ? (
                                <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors">
                                    <Github className="h-4 w-4" /> @{githubUsername}
                                </a>
                            ) : <p className="text-sm text-muted-foreground">Not provided</p>}
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Extracted from resume</p>
                            {githubExtractedUsername ? (
                                <a href={`https://github.com/${githubExtractedUsername}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors">
                                    <GitBranch className="h-4 w-4" /> @{githubExtractedUsername}
                                </a>
                            ) : <p className="text-sm text-muted-foreground">Not found in resume</p>}
                        </div>
                    </div>
                    {githubValidation && (
                        <>
                            <div className="flex gap-6 text-sm">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <GitBranch className="h-3.5 w-3.5" />
                                    <span><strong className="text-foreground">{githubValidation.total_repos}</strong> repos</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>Age: <strong className="text-foreground">{Math.round(githubValidation.account_age_days / 30)}mo</strong></span>
                                </div>
                            </div>
                            {githubValidation.analysis_summary && (
                                <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 pl-3">
                                    {githubValidation.analysis_summary}
                                </p>
                            )}
                            {githubValidation.positive_indicators.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-success mb-2">Positive Indicators</p>
                                    <ul className="space-y-1.5">
                                        {githubValidation.positive_indicators.map((pi, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <CheckCircle className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                                                <span className="text-muted-foreground">{pi}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {githubValidation.red_flags.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-destructive mb-2">Red Flags</p>
                                    <ul className="space-y-1.5">
                                        {githubValidation.red_flags.map((rf, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                                                <span className="text-muted-foreground">{rf}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </Card>
    );
};


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
    effort_vs_claim?: Array<{
        skill: string;
        evidence_score: number;
        evidence_text: string;
    }>;
}

// GitHubValidation is defined above as GitHubValidationLocal; alias it for use in this component
type GitHubValidation = GitHubValidationLocal;

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

            // Try to read as text or extract PDF content
            const blob = await fileRes.blob();
            let resumeText: string;
            try {
                if (blob.type === "application/pdf" || applicant.resume_url?.toLowerCase().includes('.pdf')) {
                    const { extractTextFromPdf } = await import("@/utils/pdfParser");
                    resumeText = await extractTextFromPdf(blob);
                    console.log("Resume text extracted:", resumeText);
                } else {
                    resumeText = await blob.text();
                }
            } catch (err) {
                console.error("Text extraction failed:", err);
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
                <Card className="shadow-elevated border-l-[6px] border-l-primary mb-6 overflow-hidden bg-card">
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                            <div className="flex-1 p-6 md:p-8">
                                <div className="flex items-center gap-4 mb-4">
                                    <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{applicant.name}</h2>
                                    <Badge 
                                        variant={getScoreBadgeVariant(applicant.status)} 
                                        className={
                                            applicant.status === 'excellent' 
                                            ? 'bg-success hover:bg-success/90 text-success-foreground border-transparent font-bold tracking-wider uppercase'
                                            : applicant.status === 'good'
                                            ? 'bg-warning hover:bg-warning/90 text-warning-foreground border-transparent font-bold tracking-wider uppercase'
                                            : 'font-bold tracking-wider uppercase'
                                        }
                                    >
                                        {applicant.status || "pending"}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-muted-foreground mt-6">
                                    <div className="flex items-center gap-2.5 bg-muted/30 p-2.5 rounded-md">
                                        <Mail className="h-4 w-4 text-primary" />
                                        <a href={`mailto:${applicant.email}`} className="hover:text-primary font-medium">
                                            {applicant.email}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-2.5 bg-muted/30 p-2.5 rounded-md">
                                        <Briefcase className="h-4 w-4 text-primary" />
                                        <span className="font-medium">{applicant.position}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 bg-muted/30 p-2.5 rounded-md">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span className="font-medium">Applied {new Date(applicant.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {applicant.github_username && (
                                        <div className="flex items-center gap-2.5 bg-muted/30 p-2.5 rounded-md">
                                            <Github className="h-4 w-4 text-primary" />
                                            <a
                                                href={`https://github.com/${applicant.github_username}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-primary font-medium"
                                            >
                                                @{applicant.github_username}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Score Box in Header */}
                            <div className="flex flex-col items-center justify-center bg-muted/40 p-8 border-t md:border-t-0 md:border-l border-border md:min-w-[280px]">
                                <div className="text-center group">
                                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">AI Score</p>
                                    <div className={`flex items-center justify-center w-32 h-32 rounded-full border-[6px] shadow-soft bg-card transition-transform group-hover:scale-105 ${
                                        (applicant.ai_score || 0) >= 85 ? 'border-success text-success' :
                                        (applicant.ai_score || 0) >= 70 ? 'border-warning text-warning' : 'border-destructive text-destructive'
                                    }`}>
                                        <span className="text-5xl font-black">
                                            {applicant.ai_score || 0}%
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="mt-8 flex flex-col gap-3 w-full">
                                {applicant.resume_url && (
                                    <>
                                        <div className="flex gap-2 w-full">
                                            <Button
                                                variant="outline"
                                                onClick={handleViewResume}
                                                className="flex-1 gap-2 shadow-sm"
                                            >
                                                <Eye className="h-4 w-4" />
                                                View
                                            </Button>
                                            <Button onClick={handleDownloadResume} className="flex-1 gap-2 shadow-sm">
                                                <Download className="h-4 w-4" />
                                                Save
                                            </Button>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            onClick={handleReanalyse}
                                            disabled={isReanalysing}
                                            className="w-full gap-2 border shadow-sm"
                                        >
                                            {isReanalysing ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="h-4 w-4" />
                                                    Re-analyse Candidate
                                                </>
                                            )}
                                        </Button>
                                    </>
                                )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── GitHub Cross-Validation Card ── */}
                {(applicant.github_username || applicant.github_extracted_username) && (
                    <GitHubCard
                        githubUsername={applicant.github_username}
                        githubExtractedUsername={applicant.github_extracted_username}
                        githubMatchStatus={applicant.github_match_status}
                        githubValidation={githubValidation}
                    />
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
                            <Card className="shadow-soft border-border hover:shadow-md transition-shadow">
                                <CardHeader className="bg-muted/30 border-b pb-4">
                                    <CardTitle>Skills & Experience</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5 pt-6">
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
                                <Card className="shadow-soft border-border hover:shadow-md transition-shadow">
                                    <CardHeader className="bg-muted/30 border-b pb-4">
                                        <CardTitle>Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <p className="text-muted-foreground leading-relaxed">{applicant.resume_analysis.summary}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Strengths */}
                            {applicant.resume_analysis?.strengths && applicant.resume_analysis.strengths.length > 0 ? (
                                <InsightCard
                                    type="strength"
                                    items={applicant.resume_analysis.strengths}
                                />
                            ) : (
                                applicant.resume_analysis && (
                                    <InsightCard type="strength" items={[]} />
                                )
                            )}

                            {/* Weaknesses */}
                            {applicant.resume_analysis?.weaknesses && applicant.resume_analysis.weaknesses.length > 0 ? (
                                <InsightCard
                                    type="weakness"
                                    items={applicant.resume_analysis.weaknesses}
                                />
                            ) : (
                                applicant.resume_analysis && (
                                    <InsightCard type="weakness" items={[]} />
                                )
                            )}

                            {/* Recommendations */}
                            {applicant.resume_analysis?.recommendations && applicant.resume_analysis.recommendations.length > 0 && (
                                <RecommendationsCard items={applicant.resume_analysis.recommendations} />
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
