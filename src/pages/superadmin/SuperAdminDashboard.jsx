import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, GraduationCap, School, TrendingUp, Users } from "lucide-react";
import { aiService } from "@/services/aiService";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function unwrapData(response) {
  return response?.data?.data || response?.data || response || {};
}

export default function SuperAdminDashboard() {
  const { data: platformOverviewRes } = useQuery({
    queryKey: ["superadminPlatformOverview"],
    queryFn: () => aiService.getPlatformOverview(),
  });

  const data = unwrapData(platformOverviewRes);
  const overview = data?.overview || {};
  const topSchools = Array.isArray(data?.topSchools) ? data.topSchools : [];
  const monthlyGrowth = Array.isArray(data?.monthlyGrowth) ? data.monthlyGrowth : [];

  const kpis = [
    { label: "Total Schools", value: overview.totalSchools ?? 0, icon: School, hint: `${overview.activeSchools ?? 0} active` },
    { label: "Students", value: overview.totalStudents ?? 0, icon: Users, hint: "Across all schools" },
    { label: "Teachers", value: overview.totalTeachers ?? 0, icon: GraduationCap, hint: "Across all schools" },
    { label: "Average Grade", value: overview.averagePerformance != null ? `${overview.averagePerformance}%` : "-", icon: TrendingUp, hint: "Platform-wide" },
    { label: "Attendance Rate", value: overview.attendanceRate != null ? `${overview.attendanceRate}%` : "-", icon: Activity, hint: "Last 30 days" },
    { label: "New Schools", value: overview.newSchoolsThisMonth ?? 0, icon: School, hint: "This month" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Real multi-school analytics from the backend</p>
        </div>
        <Link to="/superadmin/analytics" className="text-sm text-primary hover:underline">
          Open detailed analytics
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((item, index) => (
          <motion.div key={item.label} {...anim} transition={{ delay: index * 0.04 }} className="bg-card rounded-xl border border-border p-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-heading">{item.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{item.label}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{item.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div {...anim} transition={{ delay: 0.08 }} className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-heading mb-4">Platform Growth</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip />
              <Bar dataKey="schools" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="students" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="teachers" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div {...anim} transition={{ delay: 0.12 }} className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-heading mb-4">Top Schools</h3>
          <div className="space-y-3">
            {topSchools.length > 0 ? topSchools.map((school, index) => (
              <div key={school.schoolId} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-heading truncate">{school.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {school.city} | {school.students} students | {school.teachers} teachers
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-success">{school.averageGrade}%</p>
                  <p className="text-[10px] text-muted-foreground">Avg grade</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No school analytics available yet.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
