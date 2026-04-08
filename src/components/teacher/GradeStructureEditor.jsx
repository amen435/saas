import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const WEIGHT_TOLERANCE = 0.01;

function toWeightNumber(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function formatWeight(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "0";
  // Keep 1 decimal max (weights are %).
  return String(Math.round(n * 10) / 10);
}

export default function GradeStructureEditor({
  initialComponents,
  saving,
  onCancel,
  onSave,
  defaultComponentType = "QUIZ",
}) {
  const [items, setItems] = useState([]);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const firstNameInputRef = useRef(null);

  useEffect(() => {
    setAttemptedSave(false);
    setItems(
      (initialComponents ?? []).map((c, idx) => ({
        localKey: c.id != null ? `existing-${c.id}` : `existing-${idx}`,
        id: c.id ?? null,
        name: c.component ?? c.componentName ?? "",
        weight: formatWeight(c.weight ?? 0),
        description: c.description ?? "",
        componentType: c.componentType ?? defaultComponentType,
      }))
    );
    // Focus first input after the panel mounts.
    requestAnimationFrame(() => {
      firstNameInputRef.current?.focus?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialComponents, defaultComponentType]);

  const total = useMemo(() => {
    return items.reduce((sum, i) => sum + (toWeightNumber(i.weight) || 0), 0);
  }, [items]);

  const roundedTotal = useMemo(() => Math.round(total * 10) / 10, [total]);
  const totalValid = useMemo(() => {
    // Backend enforces `newTotal > 100` strictly; align to 1 decimal precision.
    return roundedTotal === 100;
  }, [roundedTotal]);

  const rowValidity = useMemo(() => {
    return items.map((i) => {
      const nameOk = String(i.name || "").trim().length > 0;
      const weightNum = toWeightNumber(i.weight);
      const weightOk = Number.isFinite(weightNum) && weightNum >= 0 && weightNum <= 100;
      return { nameOk, weightOk, weightNum };
    });
  }, [items]);

  const canSave = useMemo(() => {
    const noRowErrors = rowValidity.every((r) => r.nameOk && r.weightOk);
    return noRowErrors && totalValid;
  }, [rowValidity, totalValid]);

  const handleSave = async () => {
    setAttemptedSave(true);
    // eslint-disable-next-line no-console
    console.log("GradeStructureEditor handleSave: canSave=", canSave, "saving=", saving);
    if (!canSave || saving) return;

    const next = items.map((i) => ({
      id: i.id ?? null,
      componentName: String(i.name || "").trim(),
      // Round to 1 decimal to match total precision expectations.
      weight: (() => {
        const w = toWeightNumber(i.weight);
        if (!Number.isFinite(w)) return w;
        return Math.round(w * 10) / 10;
      })(),
      componentType: i.componentType ?? defaultComponentType,
      description: String(i.description || "").trim() || null,
    }));

    await onSave(next);
  };

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        localKey: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        id: null,
        name: "",
        weight: "0",
        description: "",
        componentType: defaultComponentType,
      },
    ]);
    setAttemptedSave(false);
  };

  const removeRow = (localKey) => {
    setItems((prev) => prev.filter((i) => i.localKey !== localKey));
    setAttemptedSave(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className={`mt-3 rounded-xl border p-4 ${
        totalValid ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-heading">Edit Grade Components</p>
          <p className={`text-xs font-medium ${totalValid ? "text-success" : "text-destructive"}`}>
            Total = {Math.round(total * 10) / 10}%
          </p>
          {!totalValid && (
            <p className="text-xs text-destructive mt-1" title="Weights must total 100%">
              Total must equal 100%
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={addRow}
            disabled={saving}
            className="bg-background"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <AnimatePresence initial={false}>
          {items.length ? (
            items.map((item, idx) => {
              const validity = rowValidity[idx] ?? { nameOk: true, weightOk: true, weightNum: 0 };
              return (
                <motion.div
                  key={item.localKey}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="mb-2 bg-card/60 rounded-full border border-border px-3 py-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1">
                      <Input
                        ref={idx === 0 ? firstNameInputRef : null}
                        value={item.name}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((p) => (p.localKey === item.localKey ? { ...p, name: e.target.value } : p))
                          )
                        }
                        placeholder="Component name (e.g. Quiz 1)"
                        className={`rounded-full ${attemptedSave && !validity.nameOk ? "border-destructive" : ""}`}
                        disabled={saving}
                      />
                    </div>

                    <div className="sm:w-32 flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={item.weight}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((p) =>
                              p.localKey === item.localKey ? { ...p, weight: e.target.value } : p
                            )
                          )
                        }
                        className={`rounded-full ${attemptedSave && !validity.weightOk ? "border-destructive" : ""}`}
                        disabled={saving}
                      />
                      <span className="text-[11px] text-text-secondary">%</span>
                    </div>

                    <div className="sm:w-10 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(item.localKey)}
                        disabled={saving || items.length === 0}
                        className="rounded-full"
                        aria-label="Delete component"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground italic"
            >
              No components. Add one to start.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          className="gradient-primary text-primary-foreground"
          title={!totalValid ? "Weights must total 100%" : "Save changes"}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </motion.div>
  );
}

