import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText, LogOut, Search, TrendingUp, Users, Github, Shield, AlertTriangle, CheckCircle, Loader2, Eye, BarChart3, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateJobDialog } from "@/components/CreateJobDialog";
import { JobPostingCard } from "@/components/JobPostingCard";
import { WhatIfSimulator } from "@/components/WhatIfSimulator";

/* ═══════════════════════════════════════════════════════════
   Animated SVG Illustrations
═══════════════════════════════════════════════════════════ */

/** Card 1: flowing people/applicant network */
const ApplicantsSVG = () => (
  <svg viewBox="0 0 80 56" fill="none" className="w-16 h-12 opacity-80" aria-hidden>
    <style>{`
      @keyframes da-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
      @keyframes da-pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
      @keyframes da-line { 0%{stroke-dashoffset:40} 100%{stroke-dashoffset:0} }
    `}</style>
    {/* Person 1 (centre) */}
    <g style={{animation:"da-float 3s ease-in-out infinite"}}>
      <circle cx="40" cy="16" r="7" fill="hsl(221,83%,53%)" opacity=".9"/>
      <rect x="30" y="26" width="20" height="14" rx="7" fill="hsl(221,83%,53%)" opacity=".7"/>
    </g>
    {/* Person 2 (left) */}
    <g style={{animation:"da-float 3s ease-in-out infinite .8s"}}>
      <circle cx="14" cy="22" r="5.5" fill="hsl(262,83%,58%)" opacity=".8"/>
      <rect x="6" y="30" width="16" height="11" rx="5.5" fill="hsl(262,83%,58%)" opacity=".6"/>
    </g>
    {/* Person 3 (right) */}
    <g style={{animation:"da-float 3s ease-in-out infinite 1.4s"}}>
      <circle cx="66" cy="22" r="5.5" fill="hsl(142,71%,35%)" opacity=".8"/>
      <rect x="58" y="30" width="16" height="11" rx="5.5" fill="hsl(142,71%,35%)" opacity=".6"/>
    </g>
    {/* Connecting arcs */}
    <path d="M22 32 Q31 24 33 28" stroke="hsl(221,83%,53%)" strokeWidth="1.2" strokeDasharray="5,3"
      style={{animation:"da-line 2s linear infinite"}} strokeLinecap="round"/>
    <path d="M47 28 Q49 24 58 32" stroke="hsl(221,83%,53%)" strokeWidth="1.2" strokeDasharray="5,3"
      style={{animation:"da-line 2s linear infinite .5s"}} strokeLinecap="round"/>
    {/* Dots at node centres */}
    <circle cx="40" cy="16" r="2.5" fill="white" opacity=".5" style={{animation:"da-pulse 2s ease-in-out infinite"}}/>
    <circle cx="14" cy="22" r="2" fill="white" opacity=".4" style={{animation:"da-pulse 2s ease-in-out infinite .6s"}}/>
    <circle cx="66" cy="22" r="2" fill="white" opacity=".4" style={{animation:"da-pulse 2s ease-in-out infinite 1.2s"}}/>
  </svg>
);

/** Card 2: animated score gauge/arc */
const ScoreGaugeSVG = ({ score }: { score: number }) => {
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const r = 22;
  const circ = Math.PI * r; // half-circle circumference
  const dash = pct * circ;
  return (
    <svg viewBox="0 0 80 50" fill="none" className="w-16 h-12 opacity-90" aria-hidden>
      <style>{`@keyframes sg-fill{from{stroke-dasharray:0 ${circ}}to{stroke-dasharray:${dash} ${circ}}}`}</style>
      {/* Track */}
      <path d="M10 42 A30 30 0 0 1 70 42" stroke="hsl(262,83%,58%,.15)" strokeWidth="6" strokeLinecap="round"/>
      {/* Fill arc */}
      <path d="M10 42 A30 30 0 0 1 70 42" stroke="hsl(262,83%,58%)" strokeWidth="6" strokeLinecap="round"
        style={{
          strokeDasharray: `${dash} ${circ}`,
          animation: "sg-fill 1.4s ease-out both",
        }}/>
      {/* Needle tip */}
      <circle
        cx={40 + 30 * Math.cos(Math.PI + pct * Math.PI)}
        cy={42 + 30 * Math.sin(Math.PI + pct * Math.PI)}
        r="4" fill="hsl(262,83%,58%)" opacity=".9"/>
      <text x="40" y="38" textAnchor="middle" fontSize="11" fontWeight="900"
        fill="hsl(262,83%,58%)" fontFamily="Inter,sans-serif">{score}%</text>
    </svg>
  );
};

/** Card 3: rising star / medal for excellent candidates */
const ExcellentSVG = ({ count }: { count: number }) => (
  <svg viewBox="0 0 80 56" fill="none" className="w-16 h-12 opacity-85" aria-hidden>
    <style>{`
      @keyframes es-spin{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
      @keyframes es-scale{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
      @keyframes es-trail{0%{opacity:0;transform:translateY(4px)}60%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
    `}</style>
    {/* Star rays */}
    {[0,45,90,135,180,225,270,315].map((deg,i)=>(
      <line key={deg}
        x1={40 + 14*Math.cos(deg*Math.PI/180)} y1={28 + 14*Math.sin(deg*Math.PI/180)}
        x2={40 + 20*Math.cos(deg*Math.PI/180)} y2={28 + 20*Math.sin(deg*Math.PI/180)}
        stroke="hsl(142,71%,35%)" strokeWidth="1.5" strokeLinecap="round" opacity=".4"
        style={{animation:`es-scale 2.5s ease-in-out infinite ${i*0.1}s`, transformOrigin:"40px 28px"}}/>
    ))}
    {/* Medal circle */}
    <circle cx="40" cy="28" r="13" fill="hsl(142,71%,35%)" opacity=".15"/>
    <circle cx="40" cy="28" r="11" stroke="hsl(142,71%,35%)" strokeWidth="2" fill="none" opacity=".6"
      style={{animation:"es-scale 3s ease-in-out infinite", transformOrigin:"40px 28px"}}/>
    {/* Trophy cup simplified */}
    <text x="40" y="33" textAnchor="middle" fontSize="14" style={{animation:"es-spin 4s ease-in-out infinite", transformOrigin:"40px 28px"}}>🏆</text>
    {/* Count badge */}
    <rect x="52" y="8" width="22" height="14" rx="7" fill="hsl(142,71%,35%)"/>
    <text x="63" y="19" textAnchor="middle" fontSize="9" fill="white" fontWeight="900" fontFamily="Inter,sans-serif">{count}</text>
    {/* Rising sparkles */}
    {[1,2,3].map(i=>(
      <circle key={i} cx={20+i*8} cy={48} r="1.5" fill="hsl(142,71%,35%)" opacity=".7"
        style={{animation:`es-trail 1.8s ease-out infinite ${i*0.4}s`}}/>
    ))}
  </svg>
);

/** Empty state: magnifying glass scanning a resume */
const EmptyStateSVG = () => (
  <svg viewBox="0 0 200 160" fill="none" className="w-48 h-36 mx-auto opacity-70" aria-hidden>
    <style>{`
      @keyframes emp-scan{0%,100%{transform:translateY(0)}50%{transform:translateY(50px)}}
      @keyframes emp-blink{0%,100%{opacity:1}50%{opacity:.2}}
    `}</style>
    {/* Document */}
    <rect x="55" y="20" width="90" height="120" rx="8" fill="hsl(210,40%,98%)" stroke="hsl(214,32%,91%)" strokeWidth="1.5"/>
    {/* Lines on document */}
    {[44,56,68,80,92,104].map(y=>(
      <rect key={y} x="70" y={y} width={y%24===20?50:65} height="5" rx="2.5" fill="hsl(214,32%,91%)"/>
    ))}
    {/* Scanning line */}
    <rect x="55" y="0" width="90" height="3" rx="1.5" fill="hsl(221,83%,53%)" opacity=".5"
      style={{animation:"emp-scan 2.5s ease-in-out infinite", transformOrigin:"55px 20px"}}/>
    {/* Magnifier */}
    <circle cx="148" cy="108" r="28" stroke="hsl(221,83%,53%)" strokeWidth="4" fill="hsl(221,83%,53%,.08)"/>
    <line x1="168" y1="128" x2="185" y2="145" stroke="hsl(221,83%,53%)" strokeWidth="5" strokeLinecap="round"/>
    {/* Lens glint */}
    <circle cx="138" cy="98" r="5" fill="white" opacity=".5" style={{animation:"emp-blink 2s ease-in-out infinite"}}/>
  </svg>
);

/** Header: subtle animated wave / data-flow background */
const HeaderWaveSVG = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" preserveAspectRatio="xMidYMid slice" aria-hidden>
    <style>{`
      @keyframes hw-drift{0%{transform:translateX(0)}100%{transform:translateX(-200px)}}
    `}</style>
    <defs>
      <pattern id="hw-grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0 L0 0 0 40" stroke="hsl(221,83%,53%)" strokeWidth="0.6" fill="none"/>
      </pattern>
    </defs>
    <rect width="200%" height="100%" fill="url(#hw-grid)"
      style={{animation:"hw-drift 12s linear infinite"}}/>
  </svg>
);


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
  github_extracted_username: string | null;
  github_match_status: string | null;
  resume_url: string | null;
  resume_analysis: ResumeAnalysis | null;
  job_posting_id: string | null;
  githubValidation?: {
    score: number;
    summary: string;
    redFlags: string[];
    positiveIndicators: string[];
    totalRepos: number;
    accountAge: number;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterJobPosting, setFilterJobPosting] = useState<string>("all");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [validatingGithub, setValidatingGithub] = useState<string | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(true);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const fetchApplicants = async () => {
    if (!user) return;

    setIsLoadingApplicants(true);
    try {
      const { data, error } = await (supabase
        .from("applicants" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching applicants:", error);
        toast.error("Failed to load applicants");
        return;
      }

      // Map database records to Applicant interface
      const mappedApplicants: Applicant[] = (data || []).map(record => ({
        id: record.id,
        name: record.name,
        email: record.email,
        position: record.position,
        ai_score: record.ai_score,
        experience: record.experience,
        skills: record.skills || [],
        created_at: record.created_at,
        status: record.status,
        github_username: record.github_username,
        github_extracted_username: (record as any).github_extracted_username ?? null,
        github_match_status: (record as any).github_match_status ?? null,
        resume_url: record.resume_url,
        resume_analysis: record.resume_analysis as ResumeAnalysis | null,
        job_posting_id: record.job_posting_id || null,
      }));

      setApplicants(mappedApplicants);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoadingApplicants(false);
    }
  };

  const fetchJobPostings = async () => {
    if (!user) return;

    setIsLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from("job_postings" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching job postings:", error);
        toast.error("Failed to load job postings");
        return;
      }

      setJobPostings(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchApplicants();
      fetchJobPostings();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const getSignedResumeUrl = async (resumeUrl: string): Promise<string | null> => {
    try {
      const url = new URL(resumeUrl);
      const pathParts = url.pathname.split('/resumes/');
      if (pathParts.length < 2) return resumeUrl;
      const filePath = pathParts[1];
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 60 * 60); // 1-hour signed URL
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  };

  const validateGithubProfile = async (applicant: Applicant) => {
    if (!applicant.github_username) {
      toast.error("No GitHub username provided");
      return;
    }

    setValidatingGithub(applicant.id);

    try {
      const { data, error } = await supabase.functions.invoke("validate-github", {
        body: {
          githubUsername: applicant.github_username,
          applicantName: applicant.name
        }
      });

      if (error) {
        console.error("Validation error:", error);
        toast.error("Failed to validate GitHub profile");
        return;
      }

      if (data?.success && data?.validation) {
        // Update applicant with validation data
        const updatedApplicants = applicants.map(a => {
          if (a.id === applicant.id) {
            return {
              ...a,
              githubValidation: {
                score: data.validation.authenticity_score,
                summary: data.validation.analysis_summary,
                redFlags: data.validation.red_flags,
                positiveIndicators: data.validation.positive_indicators,
                totalRepos: data.validation.total_repos,
                accountAge: data.validation.account_age_days
              }
            };
          }
          return a;
        });

        setApplicants(updatedApplicants);
        setSelectedApplicant(updatedApplicants.find(a => a.id === applicant.id) || null);
        setShowValidationDialog(true);
        toast.success("GitHub profile validated successfully!");
      }
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Failed to validate GitHub profile");
    } finally {
      setValidatingGithub(null);
    }
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

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 85) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  const filteredApplicants = applicants.filter((applicant) => {
    const matchesSearch =
      applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicant.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicant.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || applicant.status === filterStatus;
    const matchesJobPosting = filterJobPosting === "all" || applicant.job_posting_id === filterJobPosting;
    return matchesSearch && matchesFilter && matchesJobPosting;
  });

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Position", "Score", "Experience", "Skills", "Applied Date", "Status"];
    const rows = filteredApplicants.map((a) => [
      a.name,
      a.email,
      a.position,
      (a.ai_score || 0).toString(),
      a.experience || "",
      (a.skills || []).join("; "),
      new Date(a.created_at).toLocaleDateString(),
      a.status || "pending",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applicants_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Data exported successfully!");
  };

  const averageScore = filteredApplicants.length > 0
    ? Math.round(
      filteredApplicants.reduce((acc, curr) => acc + (curr.ai_score || 0), 0) / filteredApplicants.length
    )
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-soft relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <HeaderWaveSVG />
          <div className="flex h-16 items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary p-2">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Resume Analyzer</h1>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="shadow-elevated border-t-4 border-t-primary bg-card transition-all hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Total Applicants
              </CardTitle>
              <div className="rounded-full bg-primary/10 p-2.5">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-4xl font-extrabold text-foreground">{filteredApplicants.length}</div>
              <ApplicantsSVG />
            </CardContent>
          </Card>

          <Card className="shadow-elevated border-t-4 border-t-accent bg-card transition-all hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Average Score
              </CardTitle>
              <div className="rounded-full bg-accent/10 p-2.5">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className={`text-4xl font-extrabold ${getScoreColor(averageScore)}`}>
                {averageScore}%
              </div>
              <ScoreGaugeSVG score={averageScore} />
            </CardContent>
          </Card>

          <Card className="shadow-elevated border-t-4 border-t-success bg-card transition-all hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Excellent Candidates
              </CardTitle>
              <div className="rounded-full bg-success/10 p-2.5">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-4xl font-extrabold text-success">
                {filteredApplicants.filter((a) => a.status === "excellent").length}
              </div>
              <ExcellentSVG count={filteredApplicants.filter((a) => a.status === "excellent").length} />
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="applicants" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="applicants" className="gap-2">
              <Users className="h-4 w-4" />
              Applicants
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Job Postings
            </TabsTrigger>
            <TabsTrigger value="simulator" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              What If
            </TabsTrigger>
          </TabsList>

          {/* Applicants Tab */}
          <TabsContent value="applicants">
            <Card className="shadow-elevated border-border">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">Applicant Analysis</CardTitle>
                    <CardDescription>AI-powered resume screening results</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={exportToCSV} variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, position, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingApplicants ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredApplicants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                    <EmptyStateSVG />
                    <h3 className="text-lg font-semibold text-foreground">No applicants yet</h3>
                    <p className="text-muted-foreground text-sm max-w-xs">
                      Upload a resume to get started with AI-powered analysis
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Name</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>GitHub</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Skills</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Applied</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApplicants.map((applicant) => (
                          <TableRow key={applicant.id} className="hover:bg-muted/60 transition-colors odd:bg-card even:bg-muted/20 border-b border-border/50">
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-semibold text-foreground">{applicant.name}</div>
                                <div className="text-sm text-muted-foreground">{applicant.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>{applicant.position}</TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center justify-center rounded-full px-3 py-1 font-extrabold shadow-sm border ${
                                (applicant.ai_score || 0) >= 85 ? 'bg-success/10 border-success/20 text-success' :
                                (applicant.ai_score || 0) >= 70 ? 'bg-warning/10 border-warning/20 text-warning' :
                                'bg-destructive/10 border-destructive/20 text-destructive'
                              }`}>
                                {applicant.ai_score || 0}%
                              </div>
                            </TableCell>
                            <TableCell>
                              {applicant.github_username ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <Github className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-sm">{applicant.github_username}</span>
                                    {applicant.githubValidation && (
                                      <Badge
                                        variant={applicant.githubValidation.score >= 70 ? "default" : "destructive"}
                                        className="gap-1 text-xs px-1.5 py-0"
                                      >
                                        <Shield className="h-3 w-3" />
                                        {applicant.githubValidation.score}%
                                      </Badge>
                                    )}
                                  </div>
                                  {/* Mismatch indicator */}
                                  {applicant.github_match_status === "mismatch" && applicant.github_extracted_username && (
                                    <div className="flex items-center gap-1 text-xs text-destructive">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span>Resume: @{applicant.github_extracted_username}</span>
                                    </div>
                                  )}
                                  {applicant.github_match_status === "match" && (
                                    <div className="flex items-center gap-1 text-xs text-success">
                                      <CheckCircle className="h-3 w-3" />
                                      <span>Verified in resume</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not provided</span>
                              )}
                            </TableCell>
                            <TableCell>{applicant.experience || applicant.resume_analysis?.experience || "N/A"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(applicant.skills || []).slice(0, 3).map((skill) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {(applicant.skills || []).length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{applicant.skills.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={getScoreBadgeVariant(applicant.status)}
                                className={
                                  applicant.status === 'excellent' 
                                    ? 'bg-success hover:bg-success/90 text-success-foreground border-transparent font-bold tracking-wider uppercase text-[10px]'
                                    : applicant.status === 'good'
                                    ? 'bg-warning hover:bg-warning/90 text-warning-foreground border-transparent font-bold tracking-wider uppercase text-[10px]'
                                    : 'font-bold tracking-wider uppercase text-[10px]'
                                }
                              >
                                {applicant.status || "pending"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(applicant.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/candidate/${applicant.id}`)}
                                  className="gap-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                                {applicant.github_username && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => validateGithubProfile(applicant)}
                                    disabled={validatingGithub === applicant.id}
                                    className="gap-1"
                                  >
                                    {validatingGithub === applicant.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      </>
                                    ) : applicant.githubValidation ? (
                                      <>
                                        <Shield className="h-4 w-4" />
                                      </>
                                    ) : (
                                      <>
                                        <Github className="h-4 w-4" />
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsCharts applicants={applicants} />
          </TabsContent>

          {/* Job Postings Tab */}
          <TabsContent value="jobs">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Job Postings</h2>
                  <p className="text-muted-foreground">Create and manage your job postings</p>
                </div>
                <CreateJobDialog onJobCreated={fetchJobPostings} />
              </div>

              {isLoadingJobs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : jobPostings.length === 0 ? (
                <Card className="shadow-soft border-border">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No job postings yet</h3>
                    <p className="text-muted-foreground mt-1 mb-4">
                      Create your first job posting to start receiving applications
                    </p>
                    <CreateJobDialog onJobCreated={fetchJobPostings} />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {jobPostings.map((job) => (
                    <JobPostingCard
                      key={job.id}
                      job={job}
                      onUpdate={fetchJobPostings}
                      onViewApplications={(jobId) => {
                        setFilterJobPosting(jobId);
                        // Switch to applicants tab
                        const tabsList = document.querySelector('[value="applicants"]') as HTMLElement;
                        tabsList?.click();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* What-If Simulator Tab */}
          <TabsContent value="simulator">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">What-If Simulator</h2>
                <p className="text-muted-foreground">
                  Adjust scoring weights to see how candidate rankings change in real time — no API calls needed.
                </p>
              </div>
              <WhatIfSimulator applicants={applicants} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Resume Analysis Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resume Analysis - {selectedApplicant?.name}
            </DialogTitle>
            <DialogDescription>
              AI-powered analysis of the applicant's resume
            </DialogDescription>
          </DialogHeader>

          {selectedApplicant?.resume_analysis && (
            <div className="space-y-6">
              {/* Score */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(selectedApplicant.ai_score)}`}>
                    {selectedApplicant.ai_score}%
                  </p>
                </div>
                <Badge variant={getScoreBadgeVariant(selectedApplicant.status)} className="text-lg px-4 py-2">
                  {selectedApplicant.status}
                </Badge>
              </div>

              {/* Summary */}
              {selectedApplicant.resume_analysis.summary && (
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-muted-foreground">{selectedApplicant.resume_analysis.summary}</p>
                </div>
              )}

              {/* Strengths */}
              {selectedApplicant.resume_analysis.strengths && selectedApplicant.resume_analysis.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {selectedApplicant.resume_analysis.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {selectedApplicant.resume_analysis.weaknesses && selectedApplicant.resume_analysis.weaknesses.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Areas for Improvement
                  </h4>
                  <ul className="space-y-2">
                    {selectedApplicant.resume_analysis.weaknesses.map((weakness, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {selectedApplicant.resume_analysis.recommendations && selectedApplicant.resume_analysis.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Hiring Recommendations</h4>
                  <ul className="space-y-2">
                    {selectedApplicant.resume_analysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="font-bold text-primary">{i + 1}.</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resume Actions */}
              {selectedApplicant.resume_url && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!selectedApplicant.resume_url) return;
                      const signedUrl = await getSignedResumeUrl(selectedApplicant.resume_url);
                      if (!signedUrl) { toast.error("Failed to generate resume link"); return; }
                      window.open(signedUrl, '_blank');
                    }}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Resume
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selectedApplicant.resume_url) return;
                      try {
                        const signedUrl = await getSignedResumeUrl(selectedApplicant.resume_url);
                        if (!signedUrl) { toast.error("Failed to generate download link"); return; }
                        const response = await fetch(signedUrl);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${selectedApplicant.name.replace(/\s+/g, '_')}_resume.pdf`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                        toast.success("Resume downloaded successfully!");
                      } catch (error) {
                        console.error("Download error:", error);
                        toast.error("Failed to download resume");
                      }
                    }}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Resume
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* GitHub Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Profile Validation
            </DialogTitle>
            <DialogDescription>
              AI analysis of {selectedApplicant?.name}'s GitHub profile authenticity
            </DialogDescription>
          </DialogHeader>

          {selectedApplicant?.githubValidation && (
            <div className="space-y-6">
              {/* Score */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Authenticity Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(selectedApplicant.githubValidation.score)}`}>
                    {selectedApplicant.githubValidation.score}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Repos</p>
                  <p className="text-xl font-bold">{selectedApplicant.githubValidation.totalRepos}</p>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="font-semibold mb-2">Analysis Summary</h4>
                <p className="text-muted-foreground">{selectedApplicant.githubValidation.summary}</p>
              </div>

              {/* Positive Indicators */}
              {selectedApplicant.githubValidation.positiveIndicators.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Positive Indicators
                  </h4>
                  <ul className="space-y-2">
                    {selectedApplicant.githubValidation.positiveIndicators.map((indicator, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Red Flags */}
              {selectedApplicant.githubValidation.redFlags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Red Flags
                  </h4>
                  <ul className="space-y-2">
                    {selectedApplicant.githubValidation.redFlags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
