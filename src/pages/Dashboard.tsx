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
import { Download, FileText, LogOut, Search, TrendingUp, Users, Github, Shield, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Applicant {
  id: string;
  name: string;
  email: string;
  position: string;
  score: number;
  experience: string;
  skills: string[];
  appliedDate: string;
  status: "excellent" | "good" | "average" | "poor";
  githubUsername?: string;
  githubValidation?: {
    score: number;
    summary: string;
    redFlags: string[];
    positiveIndicators: string[];
    totalRepos: number;
    accountAge: number;
  };
}

const mockApplicants: Applicant[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    position: "Senior Software Engineer",
    score: 92,
    experience: "8 years",
    skills: ["React", "TypeScript", "Node.js", "AWS"],
    appliedDate: "2025-01-05",
    status: "excellent",
    githubUsername: "sarahj-dev",
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "m.chen@email.com",
    position: "Frontend Developer",
    score: 85,
    experience: "5 years",
    skills: ["Vue.js", "JavaScript", "CSS", "UI/UX"],
    appliedDate: "2025-01-04",
    status: "excellent",
    githubUsername: "mchen-code",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "e.rodriguez@email.com",
    position: "Full Stack Developer",
    score: 78,
    experience: "4 years",
    skills: ["Python", "Django", "React", "PostgreSQL"],
    appliedDate: "2025-01-03",
    status: "good",
    githubUsername: "emilyrod",
  },
  {
    id: "4",
    name: "David Kim",
    email: "d.kim@email.com",
    position: "DevOps Engineer",
    score: 88,
    experience: "6 years",
    skills: ["Docker", "Kubernetes", "CI/CD", "AWS"],
    appliedDate: "2025-01-02",
    status: "excellent",
    githubUsername: "davidkim-devops",
  },
  {
    id: "5",
    name: "Jessica Taylor",
    email: "j.taylor@email.com",
    position: "Backend Developer",
    score: 72,
    experience: "3 years",
    skills: ["Java", "Spring Boot", "MongoDB", "REST API"],
    appliedDate: "2025-01-01",
    status: "good",
    githubUsername: "jtaylor-backend",
  },
  {
    id: "6",
    name: "Alex Thompson",
    email: "a.thompson@email.com",
    position: "UI/UX Designer",
    score: 65,
    experience: "2 years",
    skills: ["Figma", "Adobe XD", "Prototyping", "Design Systems"],
    appliedDate: "2024-12-31",
    status: "average",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<Applicant[]>(mockApplicants);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [validatingGithub, setValidatingGithub] = useState<string | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  useEffect(() => {
    const isAuth = localStorage.getItem("isAuthenticated");
    if (!isAuth) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const validateGithubProfile = async (applicant: Applicant) => {
    if (!applicant.githubUsername) {
      toast.error("No GitHub username provided");
      return;
    }

    setValidatingGithub(applicant.id);
    
    try {
      const { data, error } = await supabase.functions.invoke("validate-github", {
        body: {
          githubUsername: applicant.githubUsername,
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

  const getScoreBadgeVariant = (status: string) => {
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

  const getScoreColor = (score: number) => {
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
    return matchesSearch && matchesFilter;
  });

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Position", "Score", "Experience", "Skills", "Applied Date", "Status"];
    const rows = filteredApplicants.map((a) => [
      a.name,
      a.email,
      a.position,
      a.score.toString(),
      a.experience,
      a.skills.join("; "),
      a.appliedDate,
      a.status,
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

  const averageScore = Math.round(
    filteredApplicants.reduce((acc, curr) => acc + curr.score, 0) / filteredApplicants.length
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-soft">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
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
          <Card className="shadow-soft border-border bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Applicants
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{filteredApplicants.length}</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-border bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Score
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getScoreColor(averageScore)}`}>
                {averageScore}%
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-border bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Excellent Candidates
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {filteredApplicants.filter((a) => a.status === "excellent").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table Card */}
        <Card className="shadow-elevated border-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Applicant Analysis</CardTitle>
                <CardDescription>AI-powered resume screening results</CardDescription>
              </div>
              <Button onClick={exportToCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Export to CSV
              </Button>
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
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
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
                    <TableRow key={applicant.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold text-foreground">{applicant.name}</div>
                          <div className="text-sm text-muted-foreground">{applicant.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{applicant.position}</TableCell>
                      <TableCell>
                        <span className={`text-lg font-bold ${getScoreColor(applicant.score)}`}>
                          {applicant.score}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {applicant.githubUsername ? (
                          <div className="flex items-center gap-2">
                            <Github className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{applicant.githubUsername}</span>
                            {applicant.githubValidation && (
                              <Badge 
                                variant={applicant.githubValidation.score >= 70 ? "default" : "destructive"}
                                className="gap-1"
                              >
                                <Shield className="h-3 w-3" />
                                {applicant.githubValidation.score}%
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not provided</span>
                        )}
                      </TableCell>
                      <TableCell>{applicant.experience}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {applicant.skills.slice(0, 3).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {applicant.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{applicant.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getScoreBadgeVariant(applicant.status)}>
                          {applicant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(applicant.appliedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {applicant.githubUsername && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => validateGithubProfile(applicant)}
                            disabled={validatingGithub === applicant.id}
                            className="gap-2"
                          >
                            {validatingGithub === applicant.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Validating...
                              </>
                            ) : applicant.githubValidation ? (
                              <>
                                <Shield className="h-4 w-4" />
                                View Details
                              </>
                            ) : (
                              <>
                                <Github className="h-4 w-4" />
                                Validate GitHub
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* GitHub Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Profile Validation
            </DialogTitle>
            <DialogDescription>
              AI-powered authenticity analysis for {selectedApplicant?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplicant?.githubValidation && (
            <div className="space-y-6">
              {/* Score Overview */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Authenticity Score</div>
                  <div className={`text-3xl font-bold ${getScoreColor(selectedApplicant.githubValidation.score)}`}>
                    {selectedApplicant.githubValidation.score}%
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Total Repos</div>
                  <div className="text-3xl font-bold text-foreground">
                    {selectedApplicant.githubValidation.totalRepos}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Account Age</div>
                  <div className="text-3xl font-bold text-foreground">
                    {Math.floor(selectedApplicant.githubValidation.accountAge / 365)}y
                  </div>
                </Card>
              </div>

              {/* Summary */}
              <div>
                <h4 className="font-semibold mb-2 text-foreground">Analysis Summary</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedApplicant.githubValidation.summary}
                </p>
              </div>

              {/* Positive Indicators */}
              {selectedApplicant.githubValidation.positiveIndicators.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Positive Indicators
                  </h4>
                  <ul className="space-y-2">
                    {selectedApplicant.githubValidation.positiveIndicators.map((indicator, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{indicator}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Red Flags */}
              {selectedApplicant.githubValidation.redFlags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Red Flags
                  </h4>
                  <ul className="space-y-2">
                    {selectedApplicant.githubValidation.redFlags.map((flag, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://github.com/${selectedApplicant.githubUsername}`, '_blank')}
                >
                  View GitHub Profile
                </Button>
                <Button onClick={() => setShowValidationDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
