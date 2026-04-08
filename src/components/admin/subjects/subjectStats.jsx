import { BookOpen, Users, Filter, UserMinus } from "lucide-react";

const stats = [
  { label: "Total Subjects", key: "total", icon: BookOpen },
  { label: "Assigned Teachers", key: "teachers", icon: Users },
  { label: "Active Classes", key: "classes", icon: Filter },
  { label: "Unassigned", key: "unassigned", icon: UserMinus },
];

export default function SubjectStats({ subjects }) {
  const values = {
    total: subjects.length,
    teachers: new Set(subjects.flatMap(s => s.teachers?.map(t => t.id) || [])).size,
    classes: new Set(subjects.flatMap(s => s.classes || [])).size,
    unassigned: subjects.filter(s => !s.teachers?.length).length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-card rounded-xl border border-border p-4">
          <s.icon className="w-4 h-4 text-primary mb-2" />
          <p className="text-xl font-bold text-heading">{values[s.key]}</p>
          <p className="text-[10px] text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
