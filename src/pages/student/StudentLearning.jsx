import { motion } from "framer-motion";
import { GraduationCap, Play, Clock, CheckCircle } from "lucide-react";

const courses = [
  { title: "Mathematics Grade 10", category: "SCIENCE", progress: 75 },
  { title: "Advanced Physics", category: "SCIENCE", progress: 42 },
  { title: "Ethiopian History", category: "SOCIAL", progress: 90 },
  { title: "English Grammar", category: "LANGUAGE", progress: 15 },
];

const recent = [
  { title: "Quadratic Equations Practice", subject: "MATHEMATICS", time: "15M LEFT", icon: CheckCircle },
  { title: "The Solomonic Dynasty", subject: "HISTORY", time: "1H CONTENT", icon: Play },
  { title: "Verb Tenses Summary", subject: "ENGLISH", time: "READ ONLY", icon: GraduationCap },
];

export default function StudentLearning() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Learning Portal</h1>
        <p className="text-sm text-text-secondary">Global curriculum repository and interactive lesson hub.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {courses.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl border border-border p-5">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Play className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{c.category}</span>
            <h3 className="font-semibold text-heading text-sm mt-2">{c.title}</h3>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-text-secondary">PROGRESS</span>
              <span className={`text-[11px] font-bold ${c.progress > 70 ? "text-success" : "text-primary"}`}>{c.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full mt-1">
              <div className="h-full rounded-full gradient-primary" style={{ width: `${c.progress}%` }} />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 text-xs font-medium border border-border rounded-lg text-heading hover:bg-muted transition-colors">DOCS</button>
              <button className="flex-1 py-2 text-xs font-medium gradient-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">RESUME</button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading flex items-center gap-2"><Clock className="w-4 h-4" /> Pick Up Where You Left Off</h3>
            <button className="text-xs font-medium text-primary">EXPAND LIBRARY</button>
          </div>
          <div className="space-y-3">
            {recent.map((r) => (
              <div key={r.title} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <r.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-heading">{r.title}</p>
                    <p className="text-[10px] text-text-secondary">{r.subject}</p>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">{r.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="gradient-primary rounded-xl p-6 text-primary-foreground">
          <h3 className="font-bold text-lg">Daily Study Tracker</h3>
          <p className="text-sm opacity-90 mt-1">Systematic progress: 18/24 modules achieved for Semester 2.</p>
          <div className="space-y-2 mt-4">
            <p className="text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success" /> Lab Report: Physics (Fri)</p>
            <p className="text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-info" /> Preparation: Math Quiz</p>
          </div>
          <button className="w-full mt-4 py-2.5 bg-sidebar text-primary-foreground rounded-lg text-xs font-bold tracking-wider hover:opacity-90">
            OPEN STUDY ANALYTICS
          </button>
        </div>
      </div>
    </div>
  );
}
