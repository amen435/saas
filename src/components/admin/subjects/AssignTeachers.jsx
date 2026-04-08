import { motion } from "framer-motion";
import { X, Save } from "lucide-react";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

export default function AssignTeachers({ subject, teacherPool, selection, onToggle, onSave, onClose, saving = false }) {
  if (!subject) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div {...anim} className="bg-card rounded-xl border border-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-foreground text-lg">Assign Teachers</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select teachers to assign to <strong className="text-foreground">{subject.name}</strong>:
          </p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {teacherPool.map(t => {
              const isSelected = selection.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => onToggle(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                    isSelected ? "bg-primary/10 border border-primary/30" : "bg-muted/30 border border-transparent hover:border-border"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <span className="text-foreground">{t.name}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={onSave} disabled={saving} className="flex-1 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity">
              <Save className="w-4 h-4 inline mr-1.5" /> {saving ? "Saving…" : `Save (${selection.length})`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
