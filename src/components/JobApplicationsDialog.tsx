import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Users, Eye, Github, Shield, Loader2, FileText } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
}

interface JobApplicationsDialogProps {
    jobId: string;
    jobTitle: string;
    applicationCount: number;
    trigger: React.ReactNode;
}

export const JobApplicationsDialog = ({
    jobId,
    jobTitle,
    applicationCount,
    trigger,
}: JobApplicationsDialogProps) => {
    const [open, setOpen] = useState(false);
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (open) {
            fetchApplicants();
        }
    }, [open, jobId]);

    const fetchApplicants = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("applicants")
                .select("*")
                .eq("job_posting_id", jobId)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching applicants:", error);
                toast.error("Failed to load applicants");
                return;
            }

            setApplicants(data || []);
        } catch (error) {
            console.error("Error:", error);
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number | null) => {
        if (!score) return "text-muted-foreground";
        if (score >= 85) return "text-success";
        if (score >= 70) return "text-warning";
        return "text-destructive";
    };

    const getScoreBadgeVariant = (status: string | null): "default" | "secondary" | "outline" => {
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <div onClick={() => setOpen(true)}>{trigger}</div>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Applications for {jobTitle}
                    </DialogTitle>
                    <DialogDescription>
                        {applicationCount} {applicationCount === 1 ? "application" : "applications"} received
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : applicants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground">No applications yet</h3>
                            <p className="text-muted-foreground mt-1">
                                Applications will appear here once candidates apply
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
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
                                    {applicants.map((applicant) => (
                                        <TableRow key={applicant.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">
                                                <div>
                                                    <div className="font-semibold text-foreground">{applicant.name}</div>
                                                    <div className="text-sm text-muted-foreground">{applicant.email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-lg font-bold ${getScoreColor(applicant.ai_score)}`}>
                                                    {applicant.ai_score || 0}%
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {applicant.github_username ? (
                                                    <div className="flex items-center gap-2">
                                                        <Github className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">{applicant.github_username}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Not provided</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{applicant.experience || "N/A"}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(applicant.skills || []).slice(0, 2).map((skill) => (
                                                        <Badge key={skill} variant="secondary" className="text-xs">
                                                            {skill}
                                                        </Badge>
                                                    ))}
                                                    {(applicant.skills || []).length > 2 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{applicant.skills.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getScoreBadgeVariant(applicant.status)}>
                                                    {applicant.status || "pending"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(applicant.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        navigate(`/candidate/${applicant.id}`);
                                                        setOpen(false);
                                                    }}
                                                    className="gap-1"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
