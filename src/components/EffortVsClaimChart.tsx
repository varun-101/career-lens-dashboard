import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface ResumeAnalysis {
  skills?: string[];
  strengths?: string[];
  weaknesses?: string[];
  summary?: string;
}

interface EffortVsClaimChartProps {
  analysis: ResumeAnalysis;
}

/**
 * Computes an "evidence score" (0–100) for each skill by checking
 * how many strengths/summary sentences mention or relate to that skill.
 */
function computeEvidenceScore(skill: string, analysis: ResumeAnalysis): number {
  const skillLower = skill.toLowerCase();
  const haystack = [
    ...(analysis.strengths ?? []),
    analysis.summary ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const weaknessHaystack = (analysis.weaknesses ?? []).join(" ").toLowerCase();

  // Check for negative evidence (mentioned in weaknesses)
  const inWeaknesses = weaknessHaystack.includes(skillLower);

  // Partial keyword match in positive signals
  let score = 0;
  const words = skillLower.split(/[\s/+]+/);
  for (const word of words) {
    if (word.length < 3) continue;
    if (haystack.includes(word)) score += 35;
  }

  if (inWeaknesses) score = Math.max(0, score - 40);

  // Cap and normalize
  return Math.min(90, score);
}

const ZONE_COLORS = {
  high: "#22c55e",   // green-500
  medium: "#f59e0b", // amber-500
  low: "#ef4444",    // red-500
};

function getZoneColor(score: number) {
  if (score >= 55) return ZONE_COLORS.high;
  if (score >= 25) return ZONE_COLORS.medium;
  return ZONE_COLORS.low;
}

function getZoneLabel(score: number) {
  if (score >= 55) return "Well supported";
  if (score >= 25) return "Partially supported";
  return "Low evidence";
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { skill: string; evidenceScore: number } }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const score = data.evidenceScore;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-elevated text-sm max-w-xs">
      <p className="font-semibold text-foreground mb-1">{data.skill}</p>
      <p className="text-muted-foreground">Evidence level: <span className="font-bold" style={{ color: getZoneColor(score) }}>{score}%</span></p>
      <p className="text-xs mt-1" style={{ color: getZoneColor(score) }}>{getZoneLabel(score)}</p>
    </div>
  );
};

export const EffortVsClaimChart = ({ analysis }: EffortVsClaimChartProps) => {
  const skills = (analysis.skills ?? []).slice(0, 12);

  if (skills.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        No skills data available for this candidate.
      </div>
    );
  }

  const chartData = skills.map((skill) => ({
    skill: skill.length > 14 ? skill.slice(0, 13) + "…" : skill,
    fullSkill: skill,
    evidenceScore: computeEvidenceScore(skill, analysis),
  }));

  const riskyCount = chartData.filter((d) => d.evidenceScore < 25).length;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-500" />
          Well supported (55%+)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-500" />
          Partially supported (25–54%)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-500" />
          Low evidence (0–24%)
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 48 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="skill"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${v}%`}
            label={{ value: "Evidence Level", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={55} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.6} />
          <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
          <Bar dataKey="evidenceScore" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getZoneColor(entry.evidenceScore)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Risk callout */}
      {riskyCount > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm">
          <span className="text-destructive font-bold">⚠</span>
          <span className="text-destructive">
            <strong>{riskyCount} skill{riskyCount > 1 ? "s" : ""}</strong> claimed with little or no evidence in the resume.{" "}
            <span className="text-muted-foreground">High claim, low effort → Risky candidate</span>
          </span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        The evidence level is computed from resume analysis — strengths, summary, and weakness mentions.
        It does <em>not</em> replace a manual review.
      </p>
    </div>
  );
};
