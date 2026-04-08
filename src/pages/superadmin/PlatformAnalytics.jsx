import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, MapPinned, School, TrendingUp } from "lucide-react";
import { aiService } from "@/services/aiService";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
];

function unwrapData(response) {
  return response?.data?.data || response?.data || response || {};
}

const Card = ({ children }) => (
  <div className="bg-card rounded-xl border border-border p-5">{children}</div>
);

export default function PlatformAnalytics() {
  const { data: analyticsRes } = useQuery({
    queryKey: ["platformAnalytics"],
    queryFn: () => aiService.getPlatformOverview(),
  });

  const data = unwrapData(analyticsRes);
  const monthlyGrowth = Array.isArray(data?.monthlyGrowth) ? data.monthlyGrowth : [];
  const monthlyPerformance = Array.isArray(data?.monthlyPerformance) ? data.monthlyPerformance : [];
  const schoolsByCity = Array.isArray(data?.schoolsByCity) ? data.schoolsByCity : [];
  const featureUsage = Array.isArray(data?.featureUsage) ? data.featureUsage : [];
  const gradeDistribution = Array.isArray(data?.gradeDistribution) ? data.gradeDistribution : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Platform Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Attendance, grades, feature usage, and school-level platform trends</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <h3 className="text-sm font-semibold text-heading mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Growth Over Time
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="schools" stroke={COLORS[0]} fill="hsl(var(--primary) / 0.12)" name="Schools" />
                <Area type="monotone" dataKey="students" stroke={COLORS[1]} fill="hsl(var(--info) / 0.12)" name="Students" />
                <Area type="monotone" dataKey="teachers" stroke={COLORS[2]} fill="hsl(var(--success) / 0.12)" name="Teachers" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <Card>
            <h3 className="text-sm font-semibold text-heading mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Performance Trends
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="averageGrade" stroke={COLORS[0]} strokeWidth={2.5} name="Average Grade" />
                <Line type="monotone" dataKey="attendanceRate" stroke={COLORS[2]} strokeWidth={2.5} name="Attendance Rate" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card>
            <h3 className="text-sm font-semibold text-heading mb-4 flex items-center gap-2">
              <MapPinned className="w-4 h-4 text-primary" />
              Schools by City
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={schoolsByCity} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3}>
                  {schoolsByCity.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card>
            <h3 className="text-sm font-semibold text-heading mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Grade Distribution
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <Card>
            <h3 className="text-sm font-semibold text-heading mb-4 flex items-center gap-2">
              <School className="w-4 h-4 text-primary" />
              Feature Usage
            </h3>
            <div className="space-y-3">
              {featureUsage.map((item) => (
                <div key={item.feature}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{item.feature}</span>
                    <span className="text-xs font-semibold text-heading">{item.usage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${item.usage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
