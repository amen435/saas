import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  CheckCircle,
  Clock,
  X,
  Loader2,
  Send,
  Save,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/shared/LoadingStates";
import api from "@/services/api";
import { aiService } from "@/services/aiService";
import { toast } from "sonner";

const tabs = ["All", "Pending", "Submitted", "Graded", "Overdue"];

const statusConfig = {
  pending: { label: "TO DO", class: "bg-warning/10 text-warning", icon: Clock },
  submitted: { label: "SUBMITTED", class: "bg-info/10 text-info", icon: FileText },
  graded: { label: "GRADED", class: "bg-success/10 text-success", icon: CheckCircle },
  overdue: { label: "OVERDUE", class: "bg-destructive/10 text-destructive", icon: FileText },
};

function deriveCardStatus(h) {
  const sub = h.submission;
  if (sub?.status === "SUBMITTED") return "submitted";
  const dueDate = h.dueDate ? new Date(h.dueDate) : new Date(h.createdAt);
  if (dueDate < new Date()) return "overdue";
  return "pending";
}

function mapHomeworkToDisplay(h) {
  const dueDate = h.dueDate ? new Date(h.dueDate) : new Date(h.createdAt);
  const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
  const titleParts = [h.topic, h.subject].filter(Boolean);
  const status = deriveCardStatus(h);
  const qCount = Array.isArray(h.generatedQuestions) ? h.generatedQuestions.length : 0;
  return {
    homeworkId: h.homeworkId,
    title: titleParts.length ? titleParts.join(" · ") : (h.topic || "Homework"),
    subject: h.subject,
    status,
    due: dueDate.toISOString().slice(0, 10),
    daysLeft,
    qCount,
  };
}

function AnswerInputs({ q, index, value, disabled, onChange }) {
  const num = String(q?.questionNumber ?? index + 1);
  const options = Array.isArray(q?.options) ? q.options : [];

  if (options.length > 0) {
    return (
      <div className="space-y-2">
        {options.map((o) => {
          const label = o?.label ?? "";
          const text = o?.text ?? "";
          return (
            <label
              key={`${num}-${label}`}
              className={`flex items-start gap-2 text-sm cursor-pointer rounded-lg border border-border p-2 ${
                disabled ? "opacity-70 cursor-not-allowed" : "hover:bg-muted/40"
              }`}
            >
              <input
                type="radio"
                className="mt-1"
                name={`question-${num}`}
                checked={value === label}
                disabled={disabled}
                onChange={() => onChange(num, label)}
              />
              <span>
                <span className="font-medium text-heading">{label}.</span> {text}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <textarea
      value={value || ""}
      disabled={disabled}
      onChange={(e) => onChange(num, e.target.value)}
      rows={4}
      placeholder="Your answer"
      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 resize-none"
    />
  );
}

export default function StudentHomework() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profileRes, isLoading: profileLoading } = useQuery({
    queryKey: ["studentProfile", "me", "homework"],
    enabled: !!user,
    queryFn: async () => {
      const res = await api.get("/students/me");
      return res;
    },
  });

  const profile = profileRes?.data?.data ?? profileRes?.data ?? profileRes;
  const classId = profile?.classId ?? profile?.class?.classId ?? user?.classId ?? null;

  const { data: homeworkRaw = [], isLoading: hwLoading, error } = useQuery({
    queryKey: ["classHomework", classId],
    queryFn: async () => {
      const response = await api.get(`/ai/homework/class/${classId}`);
      const body = response.data?.data ?? response.data;
      const data = Array.isArray(body) ? body : [];
      return data;
    },
    enabled: !!classId,
  });

  const isLoading = profileLoading || (!!classId && hwLoading);

  const assignments = useMemo(
    () => homeworkRaw.map(mapHomeworkToDisplay),
    [homeworkRaw]
  );

  const subjects = [
    "All Subjects",
    ...new Set(
      homeworkRaw.map((h) => h.subjectName || h.subject?.subjectName || h.subject).filter(Boolean)
    ),
  ];

  const [activeTab, setActiveTab] = useState("All");
  const [subject, setSubject] = useState("All Subjects");
  const [selectedRaw, setSelectedRaw] = useState(null);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const questions = Array.isArray(selectedRaw?.generatedQuestions)
    ? selectedRaw.generatedQuestions
    : [];

  useEffect(() => {
    if (!selectedRaw) {
      setAnswers({});
      return;
    }
    const sub = selectedRaw.submission;
    const base =
      sub?.answers && typeof sub.answers === "object" && !Array.isArray(sub.answers)
        ? { ...sub.answers }
        : {};
    const qlist = Array.isArray(selectedRaw.generatedQuestions)
      ? selectedRaw.generatedQuestions
      : [];
    qlist.forEach((q, i) => {
      const num = String(q?.questionNumber ?? i + 1);
      const v = base[num];
      if (v === undefined || v === null) base[num] = "";
    });
    setAnswers(base);
  }, [selectedRaw]);

  const setAnswerField = useCallback((num, val) => {
    setAnswers((prev) => ({ ...prev, [num]: val }));
  }, []);

  const isSubmitted = selectedRaw?.submission?.status === "SUBMITTED";

  const openAssignment = (homeworkId) => {
    const raw = homeworkRaw.find((r) => r.homeworkId === homeworkId) || null;
    setSelectedRaw(raw);
  };

  const persistSubmission = async (status) => {
    if (!selectedRaw) return;
    setSaving(status === "DRAFT");
    setSubmitting(status === "SUBMITTED");
    try {
      const saved = await aiService.saveHomeworkSubmission({
        homeworkId: selectedRaw.homeworkId,
        answers,
        status,
      });
      setSelectedRaw((prev) =>
        prev && prev.homeworkId === saved?.homeworkId
          ? {
              ...prev,
              submission: {
                status: saved.status,
                submittedAt: saved.submittedAt,
                answers: saved.answers,
              },
            }
          : prev
      );
      await queryClient.invalidateQueries({ queryKey: ["classHomework", classId] });
      if (status === "SUBMITTED") toast.success("Homework submitted.");
      if (status === "DRAFT") toast.success("Progress saved.");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || e?.message || "Could not save homework.");
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      const raw = homeworkRaw.find((r) => r.homeworkId === a.homeworkId);
      const sub = raw?.submission;
      const tab = activeTab;
      let tabMatch = true;
      if (tab === "Pending") {
        tabMatch = sub?.status !== "SUBMITTED";
      } else if (tab === "Submitted") {
        tabMatch = sub?.status === "SUBMITTED";
      } else if (tab === "Graded") {
        tabMatch = false;
      } else if (tab === "Overdue") {
        tabMatch = a.status === "overdue" && sub?.status !== "SUBMITTED";
      }
      const subj =
        raw?.subjectName || raw?.subject?.subjectName || raw?.subject || a.subject;
      const subMatch = subject === "All Subjects" || subj === subject;
      return tabMatch && subMatch;
    });
  }, [assignments, homeworkRaw, activeTab, subject]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Homework Hub</h1>
          <p className="text-sm text-text-secondary">Loading homework...</p>
        </div>
        <PageSkeleton hasStats={false} hasSearch tableRows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load homework.
      </div>
    );
  }

  if (!classId && !profileLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Homework Hub</h1>
          <p className="text-sm text-text-secondary">
            You are not assigned to a class yet, so homework cannot be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Homework Hub</h1>
        <p className="text-sm text-text-secondary">
          Complete questions below. Teacher notes and prompts are not shown here.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex bg-muted rounded-lg p-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                activeTab === t
                  ? "gradient-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-border bg-card text-heading outline-none"
        >
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((a, i) => {
          const cfg = statusConfig[a.status] || statusConfig.pending;
          const Icon = cfg.icon;
          return (
            <motion.button
              type="button"
              key={a.homeworkId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => openAssignment(a.homeworkId)}
              className="text-left bg-card rounded-xl border border-border p-5 hover:shadow-card-hover transition-shadow cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.class}`}>
                  {cfg.label}
                </span>
              </div>
              <h3 className="font-semibold text-heading text-sm">{a.title}</h3>
              <p className="text-[11px] text-text-secondary mt-0.5">{a.subject}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {a.qCount} question{a.qCount === 1 ? "" : "s"}
              </p>
              <div className="flex items-center justify-between mt-4">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {a.daysLeft > 0
                    ? `${a.daysLeft} days left`
                    : a.daysLeft === 0
                      ? "Due today"
                      : "Past due"}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No assignments found.</p>
        </div>
      )}

      <AnimatePresence>
        {selectedRaw && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setSelectedRaw(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-card z-10">
                <div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (statusConfig[
                        selectedRaw.submission?.status === "SUBMITTED"
                          ? "submitted"
                          : deriveCardStatus(selectedRaw)
                      ] || statusConfig.pending
                      ).class
                    }`}
                  >
                    {
                      (
                        statusConfig[
                          selectedRaw.submission?.status === "SUBMITTED"
                            ? "submitted"
                            : deriveCardStatus(selectedRaw)
                        ] || statusConfig.pending
                      ).label
                    }
                  </span>
                  <h2 className="text-lg font-bold text-heading mt-2">
                    {selectedRaw.topic}
                  </h2>
                  <p className="text-xs text-text-secondary mt-1">
                    {typeof selectedRaw.subject === "string"
                      ? selectedRaw.subject
                      : selectedRaw.subjectName ||
                        selectedRaw.subject?.subjectName ||
                        "—"}
                  </p>
                  {isSubmitted && selectedRaw.submission?.submittedAt && (
                    <p className="text-[11px] text-success mt-2">
                      Submitted{" "}
                      {new Date(selectedRaw.submission.submittedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRaw(null)}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No questions on this assignment.</p>
                ) : (
                  questions.map((q, idx) => {
                    const num = String(q?.questionNumber ?? idx + 1);
                    return (
                      <div
                        key={`${selectedRaw.homeworkId}-${num}`}
                        className="rounded-xl border border-border p-4 space-y-3 bg-muted/10"
                      >
                        <p className="text-sm font-medium text-heading">
                          {num}. {q?.question || "Question"}
                        </p>
                        <AnswerInputs
                          q={q}
                          index={idx}
                          value={answers[num]}
                          disabled={isSubmitted}
                          onChange={setAnswerField}
                        />
                      </div>
                    );
                  })
                )}

                {!isSubmitted && questions.length > 0 && (
                  <div className="flex flex-wrap gap-3 justify-end pt-2">
                    <button
                      type="button"
                      disabled={saving || submitting}
                      onClick={() => persistSubmission("DRAFT")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save progress
                    </button>
                    <button
                      type="button"
                      disabled={saving || submitting}
                      onClick={() => persistSubmission("SUBMITTED")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Submit homework
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
