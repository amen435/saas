import { motion } from "framer-motion";
import { X, Save } from "lucide-react";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

export default function SubjectForm({ mode, form, setForm, onSave, onClose, saving = false }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div {...anim} className="bg-card rounded-xl border border-border p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-foreground text-lg">
            {mode === "add" ? "Create Subject" : "Edit Subject"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Subject Name *</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Mathematics"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary mt-1 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Subject Code *</label>
            <input
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. MATH101"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary mt-1 transition-colors font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of the subject..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary mt-1 resize-none transition-colors"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!form.name.trim() || !form.code.trim() || saving}
              className="flex-1 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              <Save className="w-4 h-4 inline mr-1.5" /> {saving ? "Saving…" : mode === "add" ? "Save" : "Update"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
