import { motion } from "framer-motion";
import { BookOpen, Eye, Edit2, Trash2, UserPlus } from "lucide-react";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

export default function SubjectTable({ subjects, isAdmin, onView, onEdit, onAssign, onDelete }) {
  if (subjects.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wider">Subject Name</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wider">Code</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wider hidden md:table-cell">Assigned Teachers</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(s => (
              <motion.tr key={s.id} {...anim} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{s.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-mono">{s.code}</span>
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  {s.teachers?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {s.teachers.slice(0, 3).map(t => (
                        <span key={t.id} className="px-2 py-0.5 rounded-full bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] text-[11px] font-medium">
                          {t.name.split(" ").pop()}
                        </span>
                      ))}
                      {s.teachers.length > 3 && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px]">+{s.teachers.length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">None assigned</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onView(s)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => onAssign(s)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))] transition-colors" title="Assign Teachers">
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(s.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
