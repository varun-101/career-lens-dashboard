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
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, Upload, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AddApplicantDialogProps {
  onApplicantAdded: () => void;
}

export const AddApplicantDialog = ({ onApplicantAdded }: AddApplicantDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === "application/pdf") {
      const { extractTextFromPdf } = await import("@/utils/pdfParser");
      try {
        return await extractTextFromPdf(file);
      } catch (error) {
        console.error("PDF Parsing error:", error);
        toast.error("Could not parse PDF content completely");
        return `Resume file: ${file.name}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nNote: PDF parsing failed.`;
      }
    }
    return await file.text();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) {
      toast.error("Please upload a resume file");
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      // Step 1: Get user session
      setCurrentStep("Authenticating...");
      setProgress(10);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to add applicants");
        return;
      }

      // Step 2: Upload resume to storage
      setCurrentStep("Uploading resume...");
      setProgress(25);
      
      const fileExt = resumeFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, resumeFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to upload resume");
        return;
      }

      // Get the URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(fileName);
      
      const resumeUrl = urlData.publicUrl;

      // Step 3: Extract text from resume
      setCurrentStep("Extracting resume content...");
      setProgress(40);
      
      const resumeText = await extractTextFromFile(resumeFile);

      // Step 4: Analyze resume with AI
      setCurrentStep("Analyzing resume with AI...");
      setProgress(60);
      
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze-resume", {
        body: {
          resumeText,
          position,
          applicantName: name,
        }
      });

      if (analysisError) {
        console.error("Analysis error:", analysisError);
        toast.error("Failed to analyze resume");
        return;
      }

      const analysis = analysisData?.analysis;

      // Step 5: Save applicant to database
      setCurrentStep("Saving applicant...");
      setProgress(85);
      
      const { error: insertError } = await (supabase
        .from("applicants" as any) as any)
        .insert({
          user_id: user.id,
          name,
          email,
          position,
          github_username: githubUsername || null,
          resume_url: resumeUrl,
          resume_analysis: analysis,
          ai_score: analysis?.score || 0,
          status: analysis?.status || "pending",
          experience: analysis?.experience || null,
          skills: analysis?.skills || [],
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        toast.error("Failed to save applicant");
        return;
      }

      setProgress(100);
      setCurrentStep("Complete!");
      
      toast.success("Applicant added successfully!");
      
      // Reset form
      setName("");
      setEmail("");
      setPosition("");
      setGithubUsername("");
      setResumeFile(null);
      setOpen(false);
      
      // Notify parent to refresh
      onApplicantAdded();

    } catch (error) {
      console.error("Error adding applicant:", error);
      toast.error("An error occurred while adding the applicant");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Applicant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Add New Applicant
          </DialogTitle>
          <DialogDescription>
            Upload a resume to automatically analyze it with AI
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Senior Developer"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub Username</Label>
              <Input
                id="github"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="johndoe"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume">Resume File *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="resume"
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
                required
                disabled={isLoading}
              />
            </div>
            {resumeFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-success" />
                {resumeFile.name}
              </div>
            )}
          </div>

          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{currentStep}</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Add & Analyze
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
