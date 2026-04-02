import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { JobApplicationsDialog } from "@/components/JobApplicationsDialog";
import {
    Copy,
    ExternalLink,
    Trash2,
    Users,
    MapPin,
    Briefcase,
    DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface JobPosting {
    id: string;
    title: string;
    description: string | null;
    requirements: string[];
    location: string | null;
    employment_type: string | null;
    salary_range: string | null;
    is_active: boolean;
    application_count: number;
    created_at: string;
}

interface JobPostingCardProps {
    job: JobPosting;
    onUpdate: () => void;
    onViewApplications: (jobId: string) => void;
}

export const JobPostingCard = ({ job, onUpdate, onViewApplications }: JobPostingCardProps) => {
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);

    const applicationLink = `${window.location.origin}/apply/${job.id}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(applicationLink);
        toast.success("Application link copied to clipboard!");
    };

    const handleToggleStatus = async () => {
        setIsTogglingStatus(true);
        try {
            const { error } = await (supabase
                .from("job_postings" as any) as any)
                .update({ is_active: !job.is_active })
                .eq("id", job.id);

            if (error) {
                console.error("Toggle error:", error);
                toast.error("Failed to update job status");
                return;
            }

            toast.success(`Job posting ${!job.is_active ? "activated" : "deactivated"}`);
            onUpdate();
        } catch (error) {
            console.error("Error:", error);
            toast.error("An error occurred");
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const handleDelete = async () => {
        try {
            const { error } = await (supabase
                .from("job_postings" as any) as any)
                .delete()
                .eq("id", job.id);

            if (error) {
                console.error("Delete error:", error);
                toast.error("Failed to delete job posting");
                return;
            }

            toast.success("Job posting deleted");
            onUpdate();
        } catch (error) {
            console.error("Error:", error);
            toast.error("An error occurred");
        }
    };

    return (
        <Card className="shadow-soft border-border hover:shadow-elevated transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-xl">{job.title}</CardTitle>
                            {job.is_active ? (
                                <Badge variant="default">Active</Badge>
                            ) : (
                                <Badge variant="outline">Inactive</Badge>
                            )}
                        </div>
                        <CardDescription className="line-clamp-2">
                            {job.description || "No description provided"}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Job Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
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
                            {/* <DollarSign className="h-4 w-4" /> */}
                            <span>₹  {job.salary_range}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{job.application_count} {job.application_count === 1 ? 'application' : 'applications'}</span>
                    </div>
                </div>

                {/* Requirements */}
                {job.requirements.length > 0 && (
                    <div>
                        <p className="text-sm font-semibold mb-2">Requirements:</p>
                        <div className="flex flex-wrap gap-1">
                            {job.requirements.slice(0, 3).map((req, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    {req}
                                </Badge>
                            ))}
                            {job.requirements.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{job.requirements.length - 3} more
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        className="gap-2"
                    >
                        <Copy className="h-4 w-4" />
                        Copy Link
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(applicationLink, '_blank')}
                        className="gap-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Preview
                    </Button>
                    <JobApplicationsDialog
                        jobId={job.id}
                        jobTitle={job.title}
                        applicationCount={job.application_count}
                        trigger={
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <Users className="h-4 w-4" />
                                View Applications
                            </Button>
                        }
                    />

                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-muted-foreground">
                            {job.is_active ? "Active" : "Inactive"}
                        </span>
                        <Switch
                            checked={job.is_active}
                            onCheckedChange={handleToggleStatus}
                            disabled={isTogglingStatus}
                        />
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Job Posting?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete this job posting. Applications will be preserved but will no longer be linked to this job.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
};
