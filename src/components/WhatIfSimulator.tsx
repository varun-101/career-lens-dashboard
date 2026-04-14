import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Sliders } from "lucide-react";

interface Applicant {
  id: string;
  name: string;
  email: string;
  position: string;
  ai_score: number | null;
  experience: string | null;
  github_username: string | null;
  resume_analysis: {
    score?: number;
    skills?: string[];
  } | null;
  githubValidation?: {
    score: number;
  };
  skills: string[];
}

interface WhatIfSimulatorProps {
  applicants: Applicant[];
}

interface Weights {
  resumeScore: number;
  githubScore: number;
  experienceScore: number;
  skillsScore: number;
}

/** Convert "X years" → numeric years */
function parseExperience(exp: string | null): number {
  if (!exp) return 0;
  const match = exp.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/** Normalize experience years to 0–100 */
function experienceToScore(years: number): number {
  // 0 yrs → 0, 10+ yrs → 100
  return Math.min(100, years * 10);
}

function computeWeightedScore(applicant: Applicant, weights: Weights): number {
  const resume = applicant.ai_score ?? 0;
  const github = applicant.githubValidation?.score ?? 0;
  const exp = experienceToScore(parseExperience(applicant.experience));
  // Skills score: ratio of verified skills (we approximate as resume score × 0.8 as skills proxy)
  const skills = Math.min(100, (applicant.skills?.length ?? 0) * 8);

  const totalWeight = weights.resumeScore + weights.githubScore + weights.experienceScore + weights.skillsScore;
  if (totalWeight === 0) return 0;

  const weighted =
    (resume * weights.resumeScore +
      github * weights.githubScore +
      exp * weights.experienceScore +
      skills * weights.skillsScore) /
    totalWeight;

  return Math.round(weighted);
}

const DEFAULT_WEIGHTS: Weights = {
  resumeScore: 40,
  githubScore: 25,
  experienceScore: 25,
  skillsScore: 10,
};

export const WhatIfSimulator = ({ applicants }: WhatIfSimulatorProps) => {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);

  const ranked = useMemo(() => {
    return [...applicants]
      .map((a) => ({
        ...a,
        simulatedScore: computeWeightedScore(a, weights),
        originalRank: 0,
        newRank: 0,
      }))
      .sort((a, b) => b.simulatedScore - a.simulatedScore)
      .map((a, i) => ({ ...a, newRank: i + 1 }));
  }, [applicants, weights]);

  // Compute original ranking using default weights for rank-change delta
  const originalRanked = useMemo(() => {
    const orig = [...applicants]
      .map((a) => ({
        id: a.id,
        score: computeWeightedScore(a, DEFAULT_WEIGHTS),
      }))
      .sort((a, b) => b.score - a.score);
    const rankMap: Record<string, number> = {};
    orig.forEach((a, i) => { rankMap[a.id] = i + 1; });
    return rankMap;
  }, [applicants]);

  const getScoreColor = (s: number) => {
    if (s >= 75) return "text-green-500";
    if (s >= 50) return "text-amber-500";
    return "text-destructive";
  };

  const totalWeight = weights.resumeScore + weights.githubScore + weights.experienceScore + weights.skillsScore;

  const SLIDERS = [
    {
      key: "resumeScore" as keyof Weights,
      label: "Resume Quality",
      color: "bg-primary",
      description: "AI-scored resume strength",
    },
    {
      key: "githubScore" as keyof Weights,
      label: "GitHub Authenticity",
      color: "bg-purple-500",
      description: "GitHub profile validation score",
    },
    {
      key: "experienceScore" as keyof Weights,
      label: "Experience Years",
      color: "bg-blue-500",
      description: "Total work experience",
    },
    {
      key: "skillsScore" as keyof Weights,
      label: "Skills Breadth",
      color: "bg-amber-500",
      description: "Number of listed skills",
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Sliders panel */}
      <div className="lg:col-span-2 space-y-5">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-1">
            <Sliders className="h-4 w-4 text-primary" />
            Adjust Scoring Weights
          </h3>
          <p className="text-xs text-muted-foreground">
            Drag sliders to see how different priorities affect candidate rankings in real time.
          </p>
        </div>

        {SLIDERS.map(({ key, label, color, description }) => {
          const pct = totalWeight > 0 ? Math.round((weights[key] / totalWeight) * 100) : 0;
          return (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <span className="text-sm font-bold text-foreground w-10 text-right">{pct}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[weights[key]]}
                onValueChange={([v]) => setWeights((prev) => ({ ...prev, [key]: v }))}
                className="w-full"
              />
              <div className={`h-1 rounded-full ${color} opacity-60`} style={{ width: `${pct}%`, transition: "width 0.2s" }} />
            </div>
          );
        })}

        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">How it works</p>
          <p>Each slider sets the relative importance of that dimension. Rankings update immediately without any API calls.</p>
        </div>
      </div>

      {/* Rankings table */}
      <div className="lg:col-span-3">
        <h3 className="font-semibold text-sm mb-3">Live Rankings ({ranked.length} candidates)</h3>
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {ranked.map((applicant) => {
            const origRank = originalRanked[applicant.id] ?? applicant.newRank;
            const delta = origRank - applicant.newRank; // positive = moved up
            return (
              <Card key={applicant.id} className="shadow-soft border-border">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground">
                      {applicant.newRank}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{applicant.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{applicant.position}</p>
                    </div>

                    {/* Delta indicator */}
                    <div className="flex-shrink-0 flex items-center gap-1">
                      {delta > 0 ? (
                        <span className="flex items-center gap-0.5 text-xs text-green-500 font-medium">
                          <TrendingUp className="h-3.5 w-3.5" />+{delta}
                        </span>
                      ) : delta < 0 ? (
                        <span className="flex items-center gap-0.5 text-xs text-destructive font-medium">
                          <TrendingDown className="h-3.5 w-3.5" />{delta}
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground font-medium">
                          <Minus className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    {/* Score */}
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-lg font-bold ${getScoreColor(applicant.simulatedScore)}`}>
                        {applicant.simulatedScore}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {ranked.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No applicants to rank yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
