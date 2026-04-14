import { Badge } from "@/components/ui/badge";
import { GraduationCap, Briefcase, Code2, AlertTriangle } from "lucide-react";

interface TimelineEntry {
  type: "education" | "job" | "project";
  title: string;
  start: string;
  end: string;
  description: string;
}

interface ResumeTimelineChartProps {
  timeline: TimelineEntry[];
}

const TYPE_CONFIG = {
  education: {
    icon: GraduationCap,
    color: "bg-blue-500",
    light: "bg-blue-500/10 border-blue-500/30",
    badge: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    label: "Education",
  },
  job: {
    icon: Briefcase,
    color: "bg-primary",
    light: "bg-primary/10 border-primary/30",
    badge: "bg-primary/15 text-primary border-primary/30",
    label: "Work",
  },
  project: {
    icon: Code2,
    color: "bg-purple-500",
    light: "bg-purple-500/10 border-purple-500/30",
    badge: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    label: "Project",
  },
};

/** Parse "YYYY-MM" or "YYYY" into a Date for sorting/gap detection */
function parseDate(s: string): Date {
  if (!s || s.toLowerCase() === "present") return new Date();
  const parts = s.split("-");
  return new Date(Number(parts[0]), parts[1] ? Number(parts[1]) - 1 : 0);
}

/** Format "YYYY-MM" to human-readable "Jan 2022" */
function formatDate(s: string): string {
  if (!s) return "?";
  if (s.toLowerCase() === "present") return "Present";
  const parts = s.split("-");
  const year = parts[0];
  const month = parts[1]
    ? new Date(0, Number(parts[1]) - 1).toLocaleString("default", { month: "short" })
    : "";
  return month ? `${month} ${year}` : year;
}

/** Detect gaps between consecutive entries greater than 3 months */
function detectGaps(entries: TimelineEntry[]): { afterIndex: number; months: number }[] {
  const gaps: { afterIndex: number; months: number }[] = [];
  for (let i = 0; i < entries.length - 1; i++) {
    const endDate = parseDate(entries[i].end);
    const nextStart = parseDate(entries[i + 1].start);
    const diffMonths = (nextStart.getFullYear() - endDate.getFullYear()) * 12 +
      (nextStart.getMonth() - endDate.getMonth());
    if (diffMonths > 3) {
      gaps.push({ afterIndex: i, months: diffMonths });
    }
  }
  return gaps;
}

export const ResumeTimelineChart = ({ timeline }: ResumeTimelineChartProps) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
        <Code2 className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">
          No timeline data available. Re-analyse the resume to generate the timeline.
        </p>
      </div>
    );
  }

  // Sort chronologically by start date
  const sorted = [...timeline].sort(
    (a, b) => parseDate(a.start).getTime() - parseDate(b.start).getTime()
  );

  const gaps = detectGaps(sorted);

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {(["education", "job", "project"] as const).map((type) => {
          const cfg = TYPE_CONFIG[type];
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${cfg.color}`} />
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          <span className="text-muted-foreground">Gap detected</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />

        {sorted.map((entry, index) => {
          const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.project;
          const Icon = cfg.icon;
          const gap = gaps.find((g) => g.afterIndex === index - 1);

          return (
            <div key={index}>
              {/* Gap indicator */}
              {gap && (
                <div className="relative flex items-center gap-2 my-2 ml-2">
                  <div className="absolute -left-4 flex items-center justify-center w-4 h-4">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600">
                    <span>{gap.months} month gap</span>
                  </div>
                </div>
              )}

              {/* Entry */}
              <div className="relative mb-4">
                {/* Dot */}
                <div
                  className={`absolute -left-4 top-1.5 w-4 h-4 rounded-full ${cfg.color} flex items-center justify-center shadow-sm`}
                >
                  <Icon className="h-2.5 w-2.5 text-white" />
                </div>

                {/* Card */}
                <div className={`ml-2 p-3 rounded-lg border ${cfg.light} transition-all`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-sm text-foreground leading-tight">{entry.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(entry.start)} — {formatDate(entry.end)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs border ${cfg.badge} shrink-0`}>
                      {cfg.label}
                    </Badge>
                  </div>
                  {entry.description && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {entry.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {gaps.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {gaps.length} gap{gaps.length > 1 ? "s" : ""} detected in employment/education history. Follow up with the candidate.
          </span>
        </div>
      )}
    </div>
  );
};
