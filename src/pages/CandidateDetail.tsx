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
    FileText
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ResumeAnalysis {
    score?: number;
    status?: string;
    experience?: string;
    skills?: string[];
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: string[];
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
    resume_url: string | null;
    resume_analysis: ResumeAnalysis | null;
}

const CandidateDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [applicant, setApplicant] = useState<Applicant | null>(null);
    const [loading, setLoading] = useState(true);

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
                    resume_url: data.resume_url,
                    resume_analysis: data.resume_analysis as ResumeAnalysis | null,
                };

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

    const handleDownloadResume = async () => {
        if (!applicant?.resume_url) return;
        try {
            const response = await fetch(applicant.resume_url);
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
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => window.open(applicant.resume_url!, '_blank')}
                                            className="gap-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            View Resume
                                        </Button>
                                        <Button onClick={handleDownloadResume} className="gap-2">
                                            <Download className="h-4 w-4" />
                                            Download
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

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
                    {applicant.resume_analysis?.strengths && applicant.resume_analysis.strengths.length > 0 && (
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
                    )}

                    {/* Weaknesses */}
                    {applicant.resume_analysis?.weaknesses && applicant.resume_analysis.weaknesses.length > 0 && (
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
            </main>
        </div>
    );
};

export default CandidateDetail;
