import { motion } from "framer-motion";
import { BookOpen, X, UserMinus } from "lucide-react";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

export default function SubjectView({ subject, isAdmin, onRemoveTeacher, onClose }) {
  if (!subject) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div {...anim} className="bg-card rounded-xl border border-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-foreground text-lg">Subject Details</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{subject.name}</h2>
              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-mono">{subject.code}</span>
            </div>
          </div>

          {subject.description && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Description</p>
              <p className="text-sm text-foreground">{subject.description}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-2">Assigned Teachers ({subject.teachers?.length || 0})</p>
            {subject.teachers?.length > 0 ? (
              <div className="space-y-1.5">
                {subject.teachers.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {t.name.charAt(0)}
                      </div>
                      <span className="text-sm text-foreground">{t.name}</span>
                    </div>
                    {isAdmin && (
                      <button onClick={() => onRemoveTeacher(subject.id, t.id)} className="text-destructive hover:opacity-70 transition-opacity" title="Remove">
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No teachers assigned yet.</p>
            )}
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-2">Classes Using This Subject ({subject.classes?.length || 0})</p>
            {subject.classes?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {subject.classes.map(c => (
                  <span key={c} className="px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-medium">{c}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No classes assigned yet.</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
