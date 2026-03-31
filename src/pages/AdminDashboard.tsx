import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  LogOut,
  Users,
  Briefcase,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PendingApplicant {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  government_id_url: string | null;
  created_at: string;
}

interface AllUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_verified: boolean;
  created_at: string;
}

interface JobPosting {
  id: string;
  title: string;
  location: string | null;
  employment_type: string | null;
  is_active: boolean;
  application_count: number;
  created_at: string;
  user_id: string;
  hr_email?: string;
}

interface Application {
  id: string;
  name: string;
  email: string;
  position: string;
  status: string | null;
  ai_score: number | null;
  created_at: string;
  job_posting_id: string | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [pendingApplicants, setPendingApplicants] = useState<PendingApplicant[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedGovId, setSelectedGovId] = useState<{ url: string; name: string } | null>(null);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchPendingApplicants(),
        fetchAllUsers(),
        fetchJobPostings(),
        fetchApplications(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingApplicants = async () => {
    const { data, error } = await (supabase.from("profiles" as any) as any)
      .select("id, user_id, full_name, email, government_id_url, created_at")
      .eq("is_verified", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending applicants:", error);
      return;
    }
    setPendingApplicants(data || []);
  };

  const fetchAllUsers = async () => {
    // Fetch all profiles with role info
    const { data: profiles, error: profileError } = await (supabase.from("profiles" as any) as any)
      .select("id, user_id, full_name, email, is_verified, created_at")
      .order("created_at", { ascending: false });

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      return;
    }

    const { data: roles } = await (supabase.from("user_roles" as any) as any)
      .select("user_id, role");

    const roleMap: Record<string, string> = {};
    (roles || []).forEach((r: any) => {
      roleMap[r.user_id] = r.role;
    });

    const combined: AllUser[] = (profiles || []).map((p: any) => ({
      ...p,
      role: roleMap[p.user_id] || "unknown",
    }));

    setAllUsers(combined);
  };

  const fetchJobPostings = async () => {
    const { data, error } = await (supabase.from("job_postings" as any) as any)
      .select("id, title, location, employment_type, is_active, application_count, created_at, user_id")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching job postings:", error);
      return;
    }
    setJobPostings(data || []);
  };

  const fetchApplications = async () => {
    const { data, error } = await (supabase.from("applicants" as any) as any)
      .select("id, name, email, position, status, ai_score, created_at, job_posting_id")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      return;
    }
    setApplications(data || []);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleApprove = async (applicant: PendingApplicant) => {
    setActionLoading(applicant.user_id);
    try {
      const { error } = await (supabase.from("profiles" as any) as any)
        .update({ is_verified: true })
        .eq("user_id", applicant.user_id);

      if (error) {
        toast.error("Failed to approve applicant");
        console.error(error);
        return;
      }

      toast.success(`${applicant.full_name || applicant.email} has been approved!`);
      await fetchPendingApplicants();
      await fetchAllUsers();
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (applicant: PendingApplicant) => {
    setActionLoading(`reject-${applicant.user_id}`);
    try {
      // Delete the user's auth account (cascades to all tables)
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId: applicant.user_id },
      });

      if (error) {
        // Fallback: just mark as rejected via admin notes
        await (supabase.from("profiles" as any) as any)
          .update({ admin_notes: "Rejected by admin" })
          .eq("user_id", applicant.user_id);
        toast.info(`${applicant.full_name || applicant.email} has been rejected and flagged.`);
      } else {
        toast.success(`${applicant.full_name || applicant.email} has been rejected and removed.`);
      }

      await fetchPendingApplicants();
      await fetchAllUsers();
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const viewGovId = async (applicant: PendingApplicant) => {
    if (!applicant.government_id_url) {
      toast.error("No government ID uploaded");
      return;
    }
    setSelectedGovId({
      url: applicant.government_id_url,
      name: applicant.full_name || applicant.email,
    });
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "excellent": return "default";
      case "good": return "secondary";
      case "average": return "outline";
      case "poor": return "destructive";
      default: return "outline";
    }
  };

  const stats = {
    pendingCount: pendingApplicants.length,
    totalUsers: allUsers.length,
    activeJobs: jobPostings.filter((j) => j.is_active).length,
    totalApplications: applications.length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-soft sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary p-2">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">CareerLens Control Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {stats.pendingCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.pendingCount} pending
                </Badge>
              )}
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <Card className="bg-gradient-card border-border shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-destructive/10 p-2">
                  <Clock className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <Briefcase className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Jobs</p>
                  <p className="text-2xl font-bold text-foreground">{stats.activeJobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Applications</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalApplications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="pending" className="gap-2 relative">
              <Clock className="h-4 w-4" />
              Verifications
              {stats.pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold">
                  {stats.pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Job Postings
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <FileText className="h-4 w-4" />
              Applications
            </TabsTrigger>
          </TabsList>

          {/* ── Pending Verifications ── */}
          <TabsContent value="pending">
            <Card className="shadow-elevated border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-destructive" />
                  Pending Applicant Verifications
                </CardTitle>
                <CardDescription>
                  Review government IDs and approve or reject new applicant registrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingApplicants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <CheckCircle className="h-14 w-14 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
                    <p className="text-muted-foreground mt-1">No pending verifications at this time.</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead>Gov. ID</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingApplicants.map((applicant) => (
                          <TableRow key={applicant.id}>
                            <TableCell className="font-medium">
                              {applicant.full_name || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{applicant.email}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(applicant.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {applicant.government_id_url ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => viewGovId(applicant)}
                                  className="gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View ID
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Not uploaded
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(applicant)}
                                  disabled={actionLoading === applicant.user_id}
                                  className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {actionLoading === applicant.user_id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(applicant)}
                                  disabled={actionLoading === `reject-${applicant.user_id}`}
                                  className="gap-1"
                                >
                                  {actionLoading === `reject-${applicant.user_id}` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                  )}
                                  Reject
                                </Button>
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

          {/* ── All Users ── */}
          <TabsContent value="users">
            <Card className="shadow-elevated border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Users
                </CardTitle>
                <CardDescription>Every registered user across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {allUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No users yet.</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.full_name || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.role === "admin"
                                    ? "default"
                                    : user.role === "hr"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="capitalize"
                              >
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.role === "applicant" ? (
                                <Badge
                                  variant={user.is_verified ? "default" : "destructive"}
                                  className="gap-1"
                                >
                                  {user.is_verified ? (
                                    <>
                                      <CheckCircle className="h-3 w-3" />
                                      Verified
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="h-3 w-3" />
                                      Pending
                                    </>
                                  )}
                                </Badge>
                              ) : (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
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

          {/* ── Job Postings ── */}
          <TabsContent value="jobs">
            <Card className="shadow-elevated border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  All Job Postings
                </CardTitle>
                <CardDescription>Every job posting created by HR users across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {jobPostings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No job postings yet.</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Applications</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobPostings.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-medium">{job.title}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {job.location || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {job.employment_type || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{job.application_count}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={job.is_active ? "default" : "secondary"}>
                                {job.is_active ? "Active" : "Closed"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(job.created_at).toLocaleDateString()}
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

          {/* ── All Applications ── */}
          <TabsContent value="applications">
            <Card className="shadow-elevated border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  All Applications
                </CardTitle>
                <CardDescription>Every application submitted on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No applications yet.</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Applicant</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>AI Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Applied</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{app.name}</div>
                                <div className="text-sm text-muted-foreground">{app.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>{app.position}</TableCell>
                            <TableCell>
                              <span className={`font-bold ${
                                (app.ai_score ?? 0) >= 85
                                  ? "text-green-600"
                                  : (app.ai_score ?? 0) >= 70
                                  ? "text-yellow-600"
                                  : "text-muted-foreground"
                              }`}>
                                {app.ai_score != null ? `${app.ai_score}%` : "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(app.status)} className="capitalize">
                                {app.status || "pending"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(app.created_at).toLocaleDateString()}
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
        </Tabs>
      </main>

      {/* Government ID Viewer Dialog */}
      <Dialog open={!!selectedGovId} onOpenChange={() => setSelectedGovId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Government ID — {selectedGovId?.name}
            </DialogTitle>
            <DialogDescription>
              Review the uploaded government ID to verify this applicant's identity.
            </DialogDescription>
          </DialogHeader>
          {selectedGovId && (
            <div className="mt-4">
              {selectedGovId.url.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                <img
                  src={selectedGovId.url}
                  alt="Government ID"
                  className="w-full rounded-lg border border-border object-contain max-h-[500px]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Document preview not available</p>
                  <Button
                    onClick={() => window.open(selectedGovId.url, "_blank")}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Open Document
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
