import { motion } from "framer-motion";
import { Users, UserCheck, UserX, GraduationCap, TrendingUp } from "lucide-react";

export default function AttendanceSummaryCards({ data, isLoading }) {
  const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  const cards = [
    {
      label: "Total Students",
      value: data?.totalStudents || 0,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Students Present",
      value: data?.studentsPresent || 0,
      icon: UserCheck,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Students Absent",
      value: data?.studentsAbsent || 0,
      icon: UserX,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Teachers Present",
      value: data?.teachersPresent || 0,
      icon: GraduationCap,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      label: "Attendance Rate",
      value: `${data?.overallRate !== undefined ? data.overallRate : 0}%`,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-muted mb-3"></div>
            <div className="h-6 w-16 bg-muted rounded mb-2"></div>
            <div className="h-3 w-24 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((s, i) => (
        <motion.div
          key={s.label}
          {...anim}
          transition={{ delay: i * 0.04 }}
          className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow"
        >
          <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
            <s.icon className={`w-5 h-5 ${s.color}`} />
          </div>
          <p className="text-2xl font-bold text-heading">{s.value}</p>
          <p className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
