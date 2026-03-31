import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, DollarSign, LogOut, Clock, Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface JobPosting {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  salary_range: string | null;
  employment_type: string | null;
  requirements: string[] | null;
  is_active: boolean;
  created_at: string;
}

interface Application {
  id: string;
  position: string;
  status: string | null;
  ai_score: number | null;
  created_at: string;
  job_posting_id: string | null;
}

const ApplicantDashboard = () => {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchJobs();
      fetchApplications();
    }
  }, [user]);

  const fetchJobs = async () => {
    const { data, error } = await (supabase.from("job_postings" as any) as any)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching jobs:", error);
    } else {
      setJobs(data || []);
    }
    setLoading(false);
  };

  const fetchApplications = async () => {
    if (!user) return;
    const { data, error } = await (supabase.from("applicants" as any) as any)
      .select("id, position, status, ai_score, created_at, job_posting_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
    } else {
      setApplications(data || []);
    }
  };

  const handleApply = (jobId: string) => {
    navigate(`/apply/${jobId}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const appliedJobIds = new Set(applications.map((a) => a.job_posting_id));

  const statusColor = (status: string | null) => {
    switch (status) {
      case "shortlisted": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "reviewing": return "bg-yellow-100 text-yellow-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary p-2">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Job Portal</h1>
              <p className="text-sm text-muted-foreground">Find your next opportunity</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* My Applications */}
        {applications.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Applications ({applications.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {applications.map((app) => (
                <Card key={app.id} className="border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{app.position}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <Badge className={statusColor(app.status)}>
                      {app.status || "Pending"}
                    </Badge>
                    {app.ai_score !== null && (
                      <span className="text-sm text-muted-foreground">
                        AI Score: {app.ai_score}/100
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Job Listings */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Active Job Postings
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                No active job postings found.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="border border-border hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {job.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {job.location}
                        </span>
                      )}
                      {job.salary_range && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> {job.salary_range}
                        </span>
                      )}
                      {job.employment_type && (
                        <Badge variant="secondary">{job.employment_type}</Badge>
                      )}
                    </div>

                    {job.requirements && job.requirements.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {job.requirements.slice(0, 3).map((req, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                        {job.requirements.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{job.requirements.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {appliedJobIds.has(job.id) ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Already Applied
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => handleApply(job.id)}>
                        Apply Now
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ApplicantDashboard;
