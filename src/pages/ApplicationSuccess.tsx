import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const ApplicationSuccess = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full shadow-elevated">
                <CardContent className="pt-12 pb-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="rounded-full bg-success/10 p-4">
                            <CheckCircle className="h-16 w-16 text-success" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-4">Application Submitted!</h1>
                    <p className="text-muted-foreground mb-8">
                        Thank you for applying. We've received your application and our AI has analyzed your resume.
                        We'll review your profile and get back to you soon.
                    </p>
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            You'll receive an email confirmation shortly.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ApplicationSuccess;
