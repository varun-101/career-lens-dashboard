import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface CreateJobDialogProps {
    onJobCreated: () => void;
    editJob?: JobPosting | null;
}

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

export const CreateJobDialog = ({ onJobCreated, editJob }: CreateJobDialogProps) => {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(editJob?.title || "");
    const [description, setDescription] = useState(editJob?.description || "");
    const [location, setLocation] = useState(editJob?.location || "");
    const [employmentType, setEmploymentType] = useState(editJob?.employment_type || "");
    const [salaryRange, setSalaryRange] = useState(editJob?.salary_range || "");
    const [requirements, setRequirements] = useState<string[]>(editJob?.requirements || []);
    const [currentRequirement, setCurrentRequirement] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleAddRequirement = () => {
        if (currentRequirement.trim()) {
            setRequirements([...requirements, currentRequirement.trim()]);
            setCurrentRequirement("");
        }
    };

    const handleRemoveRequirement = (index: number) => {
        setRequirements(requirements.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please sign in to create job postings");
                return;
            }

            const jobData = {
                user_id: user.id,
                title,
                description: description || null,
                requirements,
                location: location || null,
                employment_type: employmentType || null,
                salary_range: salaryRange || null,
            };

            if (editJob) {
                const { error } = await supabase
                    .from("job_postings")
                    .update(jobData)
                    .eq("id", editJob.id);

                if (error) {
                    console.error("Update error:", error);
                    toast.error("Failed to update job posting");
                    return;
                }
                toast.success("Job posting updated successfully!");
            } else {
                const { error } = await supabase
                    .from("job_postings")
                    .insert(jobData);

                if (error) {
                    console.error("Insert error:", error);
                    toast.error("Failed to create job posting");
                    return;
                }
                toast.success("Job posting created successfully!");
            }

            // Reset form
            setTitle("");
            setDescription("");
            setLocation("");
            setEmploymentType("");
            setSalaryRange("");
            setRequirements([]);
            setOpen(false);
            onJobCreated();
        } catch (error) {
            console.error("Error:", error);
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {editJob ? "Edit Job" : "Create Job Posting"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        {editJob ? "Edit Job Posting" : "Create New Job Posting"}
                    </DialogTitle>
                    <DialogDescription>
                        {editJob ? "Update the job posting details" : "Create a new job posting and get a shareable application link"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Job Title *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Senior React Developer"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Job Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the role, responsibilities, and what you're looking for..."
                            rows={4}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g., Remote, New York, Hybrid"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="employmentType">Employment Type</Label>
                            <Select value={employmentType} onValueChange={setEmploymentType} disabled={isLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full-time">Full-time</SelectItem>
                                    <SelectItem value="part-time">Part-time</SelectItem>
                                    <SelectItem value="contract">Contract</SelectItem>
                                    <SelectItem value="internship">Internship</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="salaryRange">Salary Range</Label>
                        <Input
                            id="salaryRange"
                            value={salaryRange}
                            onChange={(e) => setSalaryRange(e.target.value)}
                            placeholder="e.g., $80k - $120k"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="requirements">Requirements</Label>
                        <div className="flex gap-2">
                            <Input
                                id="requirements"
                                value={currentRequirement}
                                onChange={(e) => setCurrentRequirement(e.target.value)}
                                placeholder="Add a requirement and press Enter"
                                disabled={isLoading}
                                onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddRequirement();
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                onClick={handleAddRequirement}
                                disabled={isLoading || !currentRequirement.trim()}
                                variant="outline"
                            >
                                Add
                            </Button>
                        </div>
                        {requirements.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {requirements.map((req, index) => (
                                    <Badge key={index} variant="secondary" className="gap-1">
                                        {req}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRequirement(index)}
                                            className="ml-1 hover:text-destructive"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : editJob ? "Update Job" : "Create Job"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
