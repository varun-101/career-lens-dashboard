import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface Applicant {
    id: string;
    name: string;
    ai_score: number | null;
    status: string | null;
    skills: string[];
    created_at: string;
}

interface AnalyticsChartsProps {
    applicants: Applicant[];
}

const COLORS = {
    excellent: "hsl(var(--success))",
    good: "hsl(var(--primary))",
    average: "hsl(var(--warning))",
    poor: "hsl(var(--destructive))",
    pending: "hsl(var(--muted-foreground))",
};

export const AnalyticsCharts = ({ applicants }: AnalyticsChartsProps) => {
    // Score Distribution Data
    const scoreDistribution = [
        { range: "0-20", count: applicants.filter(a => (a.ai_score || 0) < 20).length },
        { range: "20-40", count: applicants.filter(a => (a.ai_score || 0) >= 20 && (a.ai_score || 0) < 40).length },
        { range: "40-60", count: applicants.filter(a => (a.ai_score || 0) >= 40 && (a.ai_score || 0) < 60).length },
        { range: "60-80", count: applicants.filter(a => (a.ai_score || 0) >= 60 && (a.ai_score || 0) < 80).length },
        { range: "80-100", count: applicants.filter(a => (a.ai_score || 0) >= 80).length },
    ];

    // Status Breakdown Data
    const statusData = [
        { name: "Excellent", value: applicants.filter(a => a.status === "excellent").length, color: COLORS.excellent },
        { name: "Good", value: applicants.filter(a => a.status === "good").length, color: COLORS.good },
        { name: "Average", value: applicants.filter(a => a.status === "average").length, color: COLORS.average },
        { name: "Poor", value: applicants.filter(a => a.status === "poor").length, color: COLORS.poor },
        { name: "Pending", value: applicants.filter(a => a.status === "pending" || !a.status).length, color: COLORS.pending },
    ].filter(item => item.value > 0);

    // Applications Over Time (last 30 days)
    const getLast30Days = () => {
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push({
                date: date.toISOString().split('T')[0],
                displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count: 0,
            });
        }
        return days;
    };

    const applicationsOverTime = getLast30Days().map(day => {
        const count = applicants.filter(a => {
            const appDate = new Date(a.created_at).toISOString().split('T')[0];
            return appDate === day.date;
        }).length;
        return { ...day, count };
    });

    // Top Skills
    const skillsMap = new Map<string, number>();
    applicants.forEach(applicant => {
        (applicant.skills || []).forEach(skill => {
            skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
        });
    });

    const topSkills = Array.from(skillsMap.entries())
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    if (applicants.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>No data available for analytics. Add applicants to see insights.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Score Distribution */}
            <Card className="shadow-soft border-border">
                <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                    <CardDescription>Distribution of AI scores across all applicants</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={scoreDistribution}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="range" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '6px'
                                }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card className="shadow-soft border-border">
                <CardHeader>
                    <CardTitle>Status Breakdown</CardTitle>
                    <CardDescription>Candidate status distribution</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '6px'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Applications Over Time */}
            <Card className="shadow-soft border-border md:col-span-2">
                <CardHeader>
                    <CardTitle>Applications Over Time</CardTitle>
                    <CardDescription>Number of applications received in the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={applicationsOverTime}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="displayDate"
                                className="text-xs"
                                interval="preserveStartEnd"
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis className="text-xs" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '6px'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                name="Applications"
                                dot={{ fill: 'hsl(var(--primary))' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Top Skills */}
            {topSkills.length > 0 && (
                <Card className="shadow-soft border-border md:col-span-2">
                    <CardHeader>
                        <CardTitle>Most In-Demand Skills</CardTitle>
                        <CardDescription>Top 10 skills across all applicants</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topSkills} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis type="number" className="text-xs" />
                                <YAxis dataKey="skill" type="category" width={120} className="text-xs" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '6px'
                                    }}
                                />
                                <Bar dataKey="count" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
