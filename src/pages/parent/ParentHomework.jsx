import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, X } from "lucide-react";
import ChildSelector from "@/components/parent/ChildSelector";
import api from "@/services/api";

const tabs = ["All", "Pending", "Submitted", "Graded"];
const statusMap = {
  pending: { label: "Not submitted", cls: "bg-warning/10 text-warning" },
  in_progress: { label: "In progress", cls: "bg-info/10 text-info" },
  submitted: { label: "Submitted", cls: "bg-primary/10 text-primary" },
  graded: { label: "Graded", cls: "bg-success/10 text-success" },
};
const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function mapRow(h) {
  const assignedAt = h.createdAt ? new Date(h.createdAt) : new Date();
  const sub = h.submission;
  const status =
    sub?.status === "SUBMITTED" ? "submitted" : sub?.status === "DRAFT" ? "in_progress" : "pending";
  return {
    id: h.homeworkId,
    subject: h.subject || "General",
    title: h.topic,
    teacher: h.teacher?.user?.fullName || "Teacher",
    due: assignedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status,
    questions: h.generatedQuestions || [],
    submission: sub,
  };
}

function QuestionReadOnly({ q, index, answer }) {
  const num = String(q?.questionNumber ?? index + 1);
  const options = Array.isArray(q?.options) ? q.options : [];
  return (
    <div className="rounded-lg border border-border p-3 mb-3 bg-muted/10">
      <p className="text-xs font-semibold text-heading mb-2">
        {num}. {q?.question || "—"}
      </p>
      {options.length > 0 ? (
        <ul className="text-[11px] text-text-secondary space-y-1">
          {options.map((o) => (
            <li key={`${num}-${o?.label}`}>
              <span className="font-medium text-heading">{o?.label}.</span> {o?.text}
            </li>
          ))}
        </ul>
      ) : null}
      {answer !== undefined && answer !== "" && (
        <p className="text-xs text-heading mt-2">
          <span className="text-text-secondary">Child&apos;s answer: </span>
          {String(answer)}
        </p>
      )}
    </div>
  );
}

export default function ParentHomework() {
  const [selectedChild, setSelectedChild] = useState(null);
  const [tab, setTab] = useState("All");
  const [detail, setDetail] = useState(null);

  const { data: childrenRaw, isLoading: childrenLoading } = useQuery({
    queryKey: ["parentChildren", "homework"],
    queryFn: async () => {
      const res = await api.get("/parents/me/children");
      const list = res?.data?.data ?? res?.data ?? [];
      return Array.isArray(list) ? list : [];
    },
  });

  useEffect(() => {
    if (selectedChild == null && Array.isArray(childrenRaw) && childrenRaw.length > 0) {
      setSelectedChild(childrenRaw[0].id);
    }
  }, [childrenRaw, selectedChild]);

  const selected = Array.isArray(childrenRaw) ? childrenRaw.find((c) => c.id === selectedChild) : null;
  const classId = selected?.classId ?? null;

  const { data: homeworkRaw = [], isLoading: hwLoading } = useQuery({
    queryKey: ["parentClassHomework", classId, selectedChild],
    enabled: !!classId && selectedChild != null,
    queryFn: async () => {
      const response = await api.get(`/ai/homework/class/${classId}`, {
        params: { forStudentId: selectedChild },
      });
      const body = response.data?.data ?? response.data;
      return Array.isArray(body) ? body : [];
    },
  });

  const items = useMemo(
    () => (Array.isArray(homeworkRaw) ? homeworkRaw.map(mapRow) : []),
    [homeworkRaw]
  );

  const filtered = useMemo(() => {
    if (tab === "All") return items;
    if (tab === "Pending") return items.filter((i) => i.status === "pending" || i.status === "in_progress");
    if (tab === "Submitted") return items.filter((i) => i.status === "submitted");
    if (tab === "Graded") return [];
    return items;
  }, [items, tab]);

  const counts = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((i) => i.status === "pending" || i.status === "in_progress").length,
      submitted: items.filter((i) => i.status === "submitted").length,
      graded: 0,
    }),
    [items]
  );

  if (childrenLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-heading">Homework</h1>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChildSelector children={childrenRaw ?? []} selectedChild={selectedChild} onSelect={setSelectedChild} />
      <h1 className="text-2xl font-bold text-heading">Homework</h1>

      {!classId ? (
        <p className="text-sm text-muted-foreground">Select a child with a class to view published homework.</p>
      ) : null}

      {hwLoading && classId ? <p className="text-sm text-muted-foreground">Loading homework…</p> : null}

      <div className="flex gap-3 text-xs flex-wrap">
        <span className="px-3 py-1.5 rounded-full bg-muted text-heading font-medium">📋 Total: {counts.total}</span>
        <span className="px-3 py-1.5 rounded-full bg-warning/10 text-warning font-medium">
          ⏳ To do: {counts.pending}
        </span>
        <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
          ✓ Submitted: {counts.submitted}
        </span>
        <span className="px-3 py-1.5 rounded-full bg-success/10 text-success font-medium">
          ⭐ Graded: {counts.graded}
        </span>
      </div>

      <div className="flex bg-muted rounded-xl p-1 gap-1">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
              tab === t ? "gradient-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Graded" && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" />
          Grades for AI homework are not recorded here yet.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((h, i) => {
          const st = statusMap[h.status];
          return (
            <motion.div
              key={h.id}
              {...anim}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-xl border border-border p-4 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-heading">{h.subject}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
              </div>
              <p className="text-xs text-body mb-1">{h.title}</p>
              <p className="text-[10px] text-text-secondary">Teacher: {h.teacher}</p>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Assigned: {h.due}
              </p>
              <button
                type="button"
                onClick={() => setDetail(h)}
                className="text-[11px] text-primary font-medium mt-3 hover:underline"
              >
                View assignment
              </button>
            </motion.div>
          );
        })}
      </div>

      {classId && !hwLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nothing to show in this tab.</p>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl border border-border p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-heading">{detail.subject}</h3>
              <button type="button" onClick={() => setDetail(null)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-body mb-2">{detail.title}</p>
            <p className="text-xs text-text-secondary mb-1">Teacher: {detail.teacher}</p>
            <p className="text-xs text-text-secondary mb-4">Assigned: {detail.due}</p>
            <div className={`inline-flex text-xs font-medium px-3 py-1 rounded-full mb-4 ${statusMap[detail.status].cls}`}>
              {statusMap[detail.status].label}
            </div>

            <h4 className="text-xs font-semibold text-heading mb-2">Questions (same as student sees)</h4>
            <p className="text-[10px] text-muted-foreground mb-3">
              Teacher-only notes and AI prompts are hidden on this view.
            </p>
            {Array.isArray(detail.questions) && detail.questions.length > 0 ? (
              detail.questions.map((q, idx) => {
                const num = String(q?.questionNumber ?? idx + 1);
                const ans =
                  detail.submission?.answers && typeof detail.submission.answers === "object"
                    ? detail.submission.answers[num]
                    : undefined;
                return (
                  <QuestionReadOnly key={num} q={q} index={idx} answer={ans} />
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">No questions listed.</p>
            )}

            <p className="text-[10px] text-muted-foreground italic mt-4">
              View-only. Your child submits answers from the student portal.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
