import { motion } from "framer-motion";

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

export default function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <motion.div {...anim} className="bg-card rounded-xl border border-border p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-foreground mb-2">Delete Subject?</h3>
        <p className="text-sm text-muted-foreground mb-4">This action cannot be undone. All teacher assignments for this subject will be removed.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity">
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
