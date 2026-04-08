import { motion } from "framer-motion";

export default function ChildSelector({ children = [], selectedChild, onSelect }) {
  const list = Array.isArray(children) ? children : [];
  if (list.length === 1) {
    const c = list[0];
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary bg-primary/5">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">{c.avatar ?? (c.name || "").charAt(0)}</div>
        <div>
          <p className="text-sm font-semibold text-heading">{c.name}</p>
          <p className="text-[11px] text-text-secondary">Grade {c.grade}-{c.section}</p>
        </div>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="px-4 py-3 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
        No children linked. Data loads from API when available.
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {list.map((c, i) => (
        <motion.button
          key={c.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(c.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all flex-shrink-0 ${
            selectedChild === c.id ? "border-primary bg-primary/5 scale-[1.02]" : "border-border bg-card hover:border-primary/30"
          }`}
        >
          <div className={`rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm ${selectedChild === c.id ? "w-11 h-11" : "w-10 h-10"}`}>
            {c.avatar ?? (c.name || "").charAt(0)}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-heading">{c.name}</p>
            <p className="text-[11px] text-text-secondary">Grade {c.grade}-{c.section}</p>
          </div>
          {selectedChild === c.id && <div className="w-2 h-2 rounded-full bg-success ml-1" />}
        </motion.button>
      ))}
    </div>
  );
}
