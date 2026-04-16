import { Badge } from "@/components/ui/badge";
import { GraduationCap, Briefcase, Code2, AlertTriangle, Calendar } from "lucide-react";

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
    light: "bg-blue-500/5 border-blue-500/20",
    badge: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    label: "Education",
  },
  job: {
    icon: Briefcase,
    color: "bg-primary",
    light: "bg-primary/5 border-primary/20",
    badge: "bg-primary/10 text-primary border-primary/30",
    label: "Work",
  },
  project: {
    icon: Code2,
    color: "bg-purple-500",
    light: "bg-purple-500/5 border-purple-500/20",
    badge: "bg-purple-500/10 text-purple-700 border-purple-500/30",
    label: "Project",
  },
};

/** Parse "YYYY-MM" or "YYYY" into a Date object */
function parseDate(s: string): Date {
  if (!s || s.toLowerCase().includes("present")) return new Date();
  const parts = s.split("-");
  return new Date(Number(parts[0]), parts[1] ? Number(parts[1]) - 1 : 0);
}

/** Format "YYYY-MM" to readable "Jan 2022" */
function formatDate(s: string): string {
  if (!s) return "?";
  if (s.toLowerCase().includes("present")) return "Present";
  const parts = s.split("-");
  const year = parts[0];
  const month = parts[1]
    ? new Date(0, Number(parts[1]) - 1).toLocaleString("default", { month: "short" })
    : "";
  return month ? `${month} ${year}` : year;
}

/** Diff in months between two dates */
function diffInMonths(d1: Date, d2: Date) {
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

/** Detect true gaps by merging overlapping intervals */
function detectTrueGaps(entries: TimelineEntry[]): { start: Date; end: Date; months: number }[] {
  if (entries.length < 2) return [];

  // Create intervals
  const intervals = entries.map((e) => ({
    start: parseDate(e.start),
    end: parseDate(e.end),
  })).sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge intervals
  const merged: { start: Date; end: Date }[] = [{ ...intervals[0] }];
  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const lastMerged = merged[merged.length - 1];

    if (current.start <= lastMerged.end) {
      if (current.end > lastMerged.end) {
        lastMerged.end = current.end;
      }
    } else {
      merged.push({ ...current });
    }
  }

  // Find gaps > 3 months
  const gaps: { start: Date; end: Date; months: number }[] = [];
  for (let i = 0; i < merged.length - 1; i++) {
    const months = diffInMonths(merged[i].end, merged[i + 1].start);
    if (months > 3) {
      gaps.push({ start: merged[i].end, end: merged[i + 1].start, months });
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

  // Sort overall entries by start date
  const sorted = [...timeline].sort(
    (a, b) => parseDate(a.start).getTime() - parseDate(b.start).getTime()
  );

  const gaps = detectTrueGaps(sorted);
  
  // Calculate total timespan for the mini-gantt bars
  const minDate = parseDate(sorted[0].start);
  const maxDate = new Date(Math.max(...sorted.map(e => parseDate(e.end).getTime())));
  const totalDurationMs = maxDate.getTime() - minDate.getTime();

  // Group by Start Year
  const groupedByYear = sorted.reduce((acc, entry) => {
    const startYear = parseDate(entry.start).getFullYear().toString();
    if (!acc[startYear]) acc[startYear] = [];
    acc[startYear].push(entry);
    return acc;
  }, {} as Record<string, TimelineEntry[]>);

  // Sort years oldest first so it reads downward chronologically.
  const years = Object.keys(groupedByYear).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="space-y-6">
      {/* Legend & Gap Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div className="flex flex-wrap gap-4 text-sm">
          {(["education", "job", "project"] as const).map((type) => {
            const cfg = TYPE_CONFIG[type];
            return (
              <div key={type} className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                <span className={`inline-block w-3 h-3 rounded-full ${cfg.color} shadow-sm`} />
                <span>{cfg.label}</span>
              </div>
            );
          })}
        </div>
        {gaps.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-500/20 shadow-sm">
            <AlertTriangle className="h-3.5 w-3.5" />
            {gaps.length} Actionable Gap{gaps.length > 1 ? "s" : ""} Detected
          </div>
        )}
      </div>

      {/* Timeline Layout */}
      <div className="relative isolate mt-6">
        {/* Main continuous vertical line */}
        <div className="absolute left-[1.875rem] top-2 bottom-0 w-[2px] bg-border -z-10" />

        {years.map((year) => {
          const entries = groupedByYear[year];
          
          return (
            <div key={year} className="mb-8 relative flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
              {/* Year Marker */}
              <div className="sticky top-4 flex-shrink-0 w-16 flex justify-center z-10">
                <div className="bg-background border-[3px] border-border rounded-full flex items-center justify-center py-1 w-full shadow-sm text-sm font-black text-foreground">
                  {year}
                </div>
              </div>

              {/* Year Group Entries */}
              <div className="flex-1 w-full pl-16 sm:pl-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
                  {entries.map((entry, index) => {
                    const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.project;
                    const Icon = cfg.icon;
                    
                    // Gantt calculations
                    const eStart = parseDate(entry.start).getTime();
                    const eEnd = parseDate(entry.end).getTime();
                    const leftPct = totalDurationMs > 0 ? ((eStart - minDate.getTime()) / totalDurationMs) * 100 : 0;
                    const widthPct = totalDurationMs > 0 ? Math.max(((eEnd - eStart) / totalDurationMs) * 100, 2) : 100;

                    return (
                      <div key={index} className={`relative flex flex-col p-4 rounded-xl border ${cfg.light} bg-card hover:shadow-md transition-shadow group overflow-hidden`}>
                        {/* Mini-Gantt Duration Bar (Visual Background) */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-muted/50">
                           <div 
                              className={`h-full ${cfg.color} opacity-80`}
                              style={{ marginLeft: `${leftPct}%`, width: `${widthPct}%` }}
                           />
                        </div>

                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${cfg.color} text-white shadow-sm shrink-0`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                               <h4 className="font-bold text-base text-foreground leading-tight">{entry.title}</h4>
                               <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-medium">
                                 <Calendar className="h-3 w-3" />
                                 {formatDate(entry.start)} &mdash; {formatDate(entry.end)}
                               </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className={`${cfg.badge} shrink-0`}>
                            {cfg.label}
                          </Badge>
                        </div>
                        
                        {entry.description && (
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                            {entry.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Show Gaps explicitly */}
      {gaps.length > 0 && (
        <div className="mt-8 border-t pt-6 space-y-3">
          <h4 className="text-sm font-bold flex items-center gap-2 text-amber-600">
             <AlertTriangle className="h-4 w-4" />
             Timeline Gaps Found
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
             {gaps.map((gap, i) => (
               <div key={i} className="flex justify-between items-center bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg text-sm text-amber-700 font-medium">
                 <span>
                    {gap.start.toLocaleString("default", { month: "short", year: "numeric" })} &mdash; {gap.end.toLocaleString("default", { month: "short", year: "numeric" })}
                 </span>
                 <Badge variant="outline" className="border-amber-500/30 text-amber-600 font-bold bg-white">{gap.months} months</Badge>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};
