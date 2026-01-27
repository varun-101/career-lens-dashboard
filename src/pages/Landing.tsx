import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Brain, FileCheck, TrendingUp, Users, Zap, Download } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-primary-foreground sm:text-6xl lg:text-7xl mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              AI-Powered Resume Analysis
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-primary-foreground/90 mb-8 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-100">
              Transform your hiring process with intelligent resume screening. Save time, reduce bias, and find the perfect candidates faster.
            </p>
            <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
              <Button asChild size="lg" variant="secondary" className="gap-2">
                <Link to="/auth">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
              Streamline Your Hiring Process
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI analyzes resumes in seconds, providing actionable insights to help you make better hiring decisions.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6 shadow-soft hover:shadow-elevated transition-all duration-300 border-border bg-gradient-card">
              <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">AI-Powered Analysis</h3>
              <p className="text-muted-foreground">
                Advanced machine learning algorithms analyze resumes for skills, experience, and cultural fit in real-time.
              </p>
            </Card>

            <Card className="p-6 shadow-soft hover:shadow-elevated transition-all duration-300 border-border bg-gradient-card">
              <div className="rounded-lg bg-success/10 w-12 h-12 flex items-center justify-center mb-4">
                <FileCheck className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">Smart Scoring</h3>
              <p className="text-muted-foreground">
                Get instant compatibility scores based on job requirements, helping you prioritize the best candidates.
              </p>
            </Card>

            <Card className="p-6 shadow-soft hover:shadow-elevated transition-all duration-300 border-border bg-gradient-card">
              <div className="rounded-lg bg-accent/10 w-12 h-12 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">Data Insights</h3>
              <p className="text-muted-foreground">
                Visualize candidate data with comprehensive analytics and export reports for team collaboration.
              </p>
            </Card>

            <Card className="p-6 shadow-soft hover:shadow-elevated transition-all duration-300 border-border bg-gradient-card">
              <div className="rounded-lg bg-warning/10 w-12 h-12 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-warning" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Process hundreds of resumes in minutes, not hours. Accelerate your time-to-hire significantly.
              </p>
            </Card>

            <Card className="p-6 shadow-soft hover:shadow-elevated transition-all duration-300 border-border bg-gradient-card">
              <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">Team Collaboration</h3>
              <p className="text-muted-foreground">
                Share insights with your hiring team and make collaborative decisions with ease.
              </p>
            </Card>

            <Card className="p-6 shadow-soft hover:shadow-elevated transition-all duration-300 border-border bg-gradient-card">
              <div className="rounded-lg bg-success/10 w-12 h-12 flex items-center justify-center mb-4">
                <Download className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">Easy Export</h3>
              <p className="text-muted-foreground">
                Export candidate data to CSV or Excel for further analysis and integration with your existing tools.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
            Ready to transform your hiring?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join forward-thinking HR teams using AI to make better hiring decisions.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/auth">
              Start Analyzing Resumes <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
