import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, X, Calendar, Users, FileText, Clock, Bell, Sparkles, AlertTriangle,
  Upload, ToggleLeft, ToggleRight, RefreshCw, Edit3, Save, Send, Eye, Trash2, Loader2,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { aiService } from "@/services/aiService";
import api from "@/services/api";

function formatQuestionsForTextarea(questions = []) {
  if (!Array.isArray(questions) || questions.length === 0) return "";
  return questions
    .map((q, index) => {
      const questionNumber = q?.questionNumber ?? index + 1;
      const header = `${questionNumber}. ${q?.question || ""}`.trim();
      const options = Array.isArray(q?.options)
        ? q.options
            .map((o) => `${o?.label || ""}. ${o?.text || ""}`.trim())
            .filter(Boolean)
            .join("\n")
        : "";
      return [header, options].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

/**
 * Parse human-readable blocks (inverse of formatQuestionsForTextarea).
 * Separate questions with a blank line. Each block: "1. Question text" then lines "A. Option" / "A) Option".
 */
function parseQuestionsFromTextarea(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const questions = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (!lines.length) continue;

    const headerMatch = lines[0].match(/^(\d+)\.\s*(.*)$/);
    let questionNumber;
    let questionText;

    if (headerMatch) {
      questionNumber = parseInt(headerMatch[1], 10);
      questionText = (headerMatch[2] || "").trim();
    } else {
      questionNumber = questions.length + 1;
      questionText = lines[0];
    }

    const options = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const om = line.match(/^([A-Za-z])[\.\)]\s*(.*)$/);
      if (om) {
        options.push({
          label: om[1].toUpperCase(),
          text: (om[2] || "").trim(),
        });
      }
    }

    const q = {
      questionNumber,
      question: questionText,
    };
    if (options.length > 0) q.options = options;
    questions.push(q);
  }

  return questions;
}

function parseQuestionsForSave(input) {
  const t = String(input || "").trim();
  if (!t) return [];
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* use natural-language parser */
    }
  }
  return parseQuestionsFromTextarea(t);
}

const emptyForm = {
  title: "", description: "", classId: null, dueDate: "",
  attachment: null, attachmentName: "",
  aiEnabled: false, aiTopic: "", aiDifficulty: "Medium", aiType: "Mixed", aiCount: 5, aiInstructions: "",
  aiGeneratedQuestions: "",
  allowLate: true, autoReminder: true, reminderTiming: "1 day before",
};

function mapApiHomeworkToCard(h, classById) {
  const cls = h.classId != null ? classById.get(h.classId) : null;
  const dueDate =
    h.dueDate ||
    (h.createdAt ? new Date(h.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const submittedCount = Array.isArray(h.submissions) ? h.submissions.length : 0;
  return {
    id: h.homeworkId,
    title: h.topic,
    subject: h.subjectName || h.subject?.subjectName || cls?.subjectTaught || "General",
    classId: h.classId,
    className: h.class?.className || cls?.className || "—",
    dueDate,
    submissions: submittedCount,
    total: cls?._count?.students ?? 0,
    status: h.isPublished ? "active" : "draft",
    isPublished: h.isPublished,
  };
}

export default function TeacherHomework() {
  const [classes, setClasses] = useState([]);
  const [homeworkRaw, setHomeworkRaw] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClass, setSelectedClass] = useState("all");
  const [form, setForm] = useState({ ...emptyForm });
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [previewDraftId, setPreviewDraftId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    topic: "",
    instructions: "",
    questionsText: "",
    isPublished: true,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [subsId, setSubsId] = useState(null);
  const [subsRows, setSubsRows] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [showReminder, setShowReminder] = useState(null);
  const [reminderForm, setReminderForm] = useState({ day: "", subject: "" });

  const classById = useMemo(() => {
    const map = new Map();
    classes.forEach((c) => map.set(c.classId, c));
    return map;
  }, [classes]);

  const fetchHomework = useCallback(async () => {
    try {
      const response = await api.get("/ai/homework");
      // eslint-disable-next-line no-console
      console.log("homework response:", response.data);
      const body = response.data?.data ?? response.data;
      const data = Array.isArray(body) ? body : [];
      // eslint-disable-next-line no-console
      console.log("mapped homework (raw rows):", data);
      setHomeworkRaw(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("fetch homework failed:", e);
      toast.error(e?.response?.data?.error || e.message || "Failed to load homework.");
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get("/teacher/my-classes");
        // eslint-disable-next-line no-console
        console.log("GET /teacher/my-classes (homework):", res);
        const list = res?.data?.data ?? res?.data;
        const arr = Array.isArray(list) ? list : [];
        setClasses(arr);
        if (!form.classId && arr.length > 0) {
          setForm((f) => ({ ...f, classId: arr[0].classId }));
        }
      } catch (e) {
        toast.error(e.message || "Failed to load classes.");
      }
    };
    run();
    fetchHomework();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchHomework]);

  const homework = useMemo(
    () => homeworkRaw.map((h) => mapApiHomeworkToCard(h, classById)),
    [homeworkRaw, classById]
  );

  const today = new Date().toISOString().split("T")[0];
  const finalList =
    selectedClass === "all"
      ? homework
      : homework.filter((h) => String(h.classId) === String(selectedClass));

  const activeCount = finalList.filter((h) => h.status === "active").length;
  const draftCount = finalList.filter((h) => h.status === "draft").length;
  const dueTodayCount = finalList.filter((h) => h.status === "active" && h.dueDate === today).length;
  const totalSubs = finalList.reduce((a, h) => a + h.submissions, 0);
  const totalStudents = finalList.reduce((a, h) => a + h.total, 0);
  const submissionRate = totalStudents > 0 ? Math.round((totalSubs / totalStudents) * 100) : 0;

  const handleCreate = async () => {
    const topic = (form.title || form.aiTopic || "").trim();
    if (!topic) {
      toast.error("Please enter a title or AI topic");
      return;
    }
    if (!form.classId) {
      toast.error("Please select a class");
      return;
    }
    const cls = classById.get(form.classId);
    const subject = cls?.subjectTaught || "General";
    const gradeLevel = cls?.gradeLevel || 8;
    const difficultyMap = {
      Easy: "EASY",
      Medium: "MEDIUM",
      Hard: "HARD",
      Advanced: "ADVANCED",
    };
    const instructionParts = [
      form.description,
      form.dueDate ? `Due date: ${form.dueDate}` : null,
      form.aiInstructions,
    ].filter(Boolean);
    const instructions = instructionParts.length ? instructionParts.join("\n\n") : null;

    setSaveLoading(true);
    try {
      let hwId = previewDraftId;
      if (hwId) {
        if (instructions) {
          await aiService.updateHomework(hwId, { instructions });
        }
      } else {
        const created = await aiService.generateHomework({
          subject,
          topic,
          gradeLevel,
          difficulty: difficultyMap[form.aiDifficulty] || "MEDIUM",
          numberOfQuestions: form.aiCount || 5,
          classId: form.classId,
          instructions,
        });
        // eslint-disable-next-line no-console
        console.log("homework response (after generate):", created);
        hwId = created?.homeworkId;
      }
      if (!hwId) throw new Error("Homework was not created");
      await aiService.publishHomework(hwId);
      setPreviewDraftId(null);
      await fetchHomework();
      setForm({ ...emptyForm });
      setShowCreate(false);
      toast.success("Homework published to the class.");
    } catch (error) {
      console.error("Save homework error:", error);
      toast.error(error?.response?.data?.error || error?.message || "Failed to save homework.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    const topic = (form.aiTopic || form.title || "").trim();
    if (!topic) {
      toast.error("Please enter a topic or title for AI generation");
      return;
    }
    if (!form.classId) {
      toast.error("Please select a class first");
      return;
    }
    setAiLoading(true);
    try {
      const cls = classById.get(form.classId);
      const subject = cls?.subjectTaught || "General";
      const gradeLevel = cls?.gradeLevel || 8;
      const difficultyMap = {
        Easy: "EASY",
        Medium: "MEDIUM",
        Hard: "HARD",
        Advanced: "ADVANCED",
      };

      const created = await aiService.generateHomework({
        subject,
        topic,
        gradeLevel,
        difficulty: difficultyMap[form.aiDifficulty] || "MEDIUM",
        numberOfQuestions: form.aiCount || 5,
        classId: form.classId,
        instructions: form.aiInstructions || null,
      });

      // eslint-disable-next-line no-console
      console.log("homework response:", created);
      setPreviewDraftId(created?.homeworkId ?? null);

      const questions = created?.generatedQuestions || [];
      setForm((f) => ({ ...f, aiGeneratedQuestions: formatQuestionsForTextarea(questions) }));
      toast.success(`${Array.isArray(questions) ? questions.length : form.aiCount} questions generated with AI!`);
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error(error?.response?.data?.error || error?.message || "Failed to generate questions");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!viewId) {
      setViewData(null);
      return;
    }
    let active = true;
    setViewLoading(true);
    aiService
      .getHomeworkById(viewId)
      .then((d) => {
        if (active) setViewData(d);
      })
      .catch((e) => {
        if (active) toast.error(e?.response?.data?.error || e.message || "Failed to load homework");
      })
      .finally(() => {
        if (active) setViewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [viewId]);

  const openEdit = async (id) => {
    setEditId(id);
    try {
      const d = await aiService.getHomeworkById(id);
      setEditForm({
        topic: d.topic || "",
        instructions: d.instructions || "",
        questionsText: formatQuestionsForTextarea(d.generatedQuestions || []),
        isPublished: !!d.isPublished,
      });
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Failed to load homework");
      setEditId(null);
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    let questions;
    try {
      questions = parseQuestionsForSave(editForm.questionsText);
    } catch {
      toast.error("Could not read questions. Check the format below.");
      return;
    }
    if (!questions.length && editForm.questionsText.trim()) {
      toast.error(
        "Could not parse questions. Use: \"1. Your question\" then optional \"A. Choice\" lines; separate questions with a blank line."
      );
      return;
    }
    setEditSaving(true);
    try {
      await aiService.updateHomework(editId, {
        topic: editForm.topic,
        instructions: editForm.instructions,
        generatedQuestions: questions,
        isPublished: editForm.isPublished,
      });
      toast.success("Homework updated.");
      setEditId(null);
      await fetchHomework();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Update failed");
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await aiService.deleteHomework(deleteId);
      toast.success("Homework deleted.");
      setDeleteId(null);
      await fetchHomework();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openSubs = async (id) => {
    setSubsId(id);
    setSubsLoading(true);
    try {
      const rows = await aiService.getHomeworkSubmissions(id);
      setSubsRows(rows);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Failed to load submissions");
      setSubsRows([]);
    } finally {
      setSubsLoading(false);
    }
  };

  const handleReminder = (h) => {
    setShowReminder(h);
    setReminderForm({ day: new Date(h.dueDate).toISOString().split("T")[0], subject: h.subject });
  };

  const handleSendReminder = () => {
    if (!reminderForm.day || !reminderForm.subject) {
      toast.error("Please fill in all fields");
      return;
    }
    const h = showReminder;
    toast.success(`Reminder sent to ${h.total - h.submissions} students`, {
      description: `${reminderForm.subject} — Due ${new Date(reminderForm.day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    });
    setShowReminder(null);
    setReminderForm({ day: "", subject: "" });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const valid = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!valid.includes(file.type)) {
        toast.error("Only PDF and DOCX files are allowed");
        return;
      }
      setForm(f => ({ ...f, attachment: file, attachmentName: file.name }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Homework Management</h1>
            <p className="text-sm text-text-secondary">Create, track, and manage homework assignments</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-heading font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.className} {c.subjectTaught ? `- ${c.subjectTaught}` : ""}
              </option>
            ))}
          </select>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Create Homework
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Published", value: activeCount, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
          { label: "Drafts", value: draftCount, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
          { label: "Due Today", value: dueTodayCount, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Submission Rate", value: `${submissionRate}%`, icon: Users, color: "text-success", bg: "bg-success/10" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-4">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-heading">{s.value}</p>
            <p className="text-[11px] text-text-secondary font-medium mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Create Form Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="bg-card rounded-xl border border-border p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-heading">Create New Homework</h3>
              <button onClick={() => { setShowCreate(false); setForm({ ...emptyForm }); setPreviewDraftId(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Basic Information */}
            <div>
              <h4 className="text-sm font-semibold text-heading mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Basic Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Class</label>
                  <select value={form.classId || ""} onChange={(e) => setForm({ ...form, classId: Number(e.target.value) || null })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {classes.map((c) => (
                      <option key={c.classId} value={c.classId}>
                        {c.className} {c.subjectTaught ? `- ${c.subjectTaught}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Subject</label>
                  <input value={classById.get(form.classId)?.subjectTaught || ""} readOnly
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-heading" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Homework Title *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Chapter 5 Practice Problems"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Detailed instructions for students..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Due Date *</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>

            {/* Attachment */}
            <div>
              <h4 className="text-sm font-semibold text-heading mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" /> Attachment
              </h4>
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                {form.attachmentName ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm text-heading font-medium">{form.attachmentName}</span>
                    <button onClick={() => setForm(f => ({ ...f, attachment: null, attachmentName: "" }))}
                      className="text-destructive hover:opacity-80"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-text-secondary">Upload PDF or DOCX</p>
                    <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* AI Section */}
            <div>
              <h4 className="text-sm font-semibold text-heading mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary" /> AI Question Generator
              </h4>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setForm(f => ({ ...f, aiEnabled: !f.aiEnabled }))}
                  className="text-primary">
                  {form.aiEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
                </button>
                <span className="text-sm text-heading font-medium">Generate Questions with AI</span>
              </div>
              <AnimatePresence>
                {form.aiEnabled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-text-secondary mb-1 block">Topic</label>
                        <input value={form.aiTopic} onChange={(e) => setForm({ ...form, aiTopic: e.target.value })}
                          placeholder="e.g., Quadratic Equations"
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-secondary mb-1 block">Difficulty</label>
                        <select value={form.aiDifficulty} onChange={(e) => setForm({ ...form, aiDifficulty: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30">
                          {["Easy", "Medium", "Hard"].map(d => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-secondary mb-1 block">Question Type</label>
                        <select value={form.aiType} onChange={(e) => setForm({ ...form, aiType: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30">
                          {["MCQ", "Short", "Long", "Mixed"].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-secondary mb-1 block">Number of Questions</label>
                        <input type="number" min={1} max={20} value={form.aiCount}
                          onChange={(e) => setForm({ ...form, aiCount: parseInt(e.target.value) || 5 })}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-text-secondary mb-1 block">Additional Instructions</label>
                        <textarea value={form.aiInstructions} onChange={(e) => setForm({ ...form, aiInstructions: e.target.value })}
                          placeholder="Any specific requirements..." rows={2}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                      </div>
                    </div>
                    <button onClick={handleAIGenerate} disabled={aiLoading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                      {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {aiLoading ? "Generating..." : "Generate Questions"}
                    </button>

                    {form.aiGeneratedQuestions && (
                      <div className="space-y-3">
                        <label className="text-xs font-medium text-text-secondary block">Generated Questions (editable)</label>
                        <textarea value={form.aiGeneratedQuestions}
                          onChange={(e) => setForm({ ...form, aiGeneratedQuestions: e.target.value })}
                          rows={10}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-heading font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                        <div className="flex gap-2">
                          <button onClick={handleAIGenerate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-xs font-medium text-heading hover:bg-muted/70">
                            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-xs font-medium text-heading hover:bg-muted/70">
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submission Settings */}
            <div>
              <h4 className="text-sm font-semibold text-heading mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> Submission Settings
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setForm(f => ({ ...f, allowLate: !f.allowLate }))}>
                    {form.allowLate ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <span className="text-xs text-heading font-medium">Allow Late Submission</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setForm(f => ({ ...f, autoReminder: !f.autoReminder }))}>
                    {form.autoReminder ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <span className="text-xs text-heading font-medium">Auto Reminder</span>
                </div>
                {form.autoReminder && (
                  <div>
                    <select value={form.reminderTiming} onChange={(e) => setForm({ ...form, reminderTiming: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-heading focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option>1 day before</option>
                      <option>Same day</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <button onClick={() => { setShowCreate(false); setForm({ ...emptyForm }); setPreviewDraftId(null); }}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-heading hover:bg-muted transition-colors">Cancel</button>
              <button type="button" disabled={saveLoading} onClick={handleCreate}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                <Save className="w-4 h-4" /> {saveLoading ? "Publishing…" : "Save & publish to class"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Homework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {finalList.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">No homework yet. Create and publish to see it here.</p>
        )}
        {finalList.map((h, i) => {
          const pct = h.total > 0 ? Math.round((h.submissions / h.total) * 100) : 0;
          const isDraft = h.status === "draft";
          const isOverdue = !isDraft && new Date(h.dueDate) < new Date() && h.status === "active";
          return (
            <motion.div key={h.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card rounded-xl border border-border p-5 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-heading text-sm">{h.title}</h4>
                  <p className="text-[11px] text-text-secondary mt-0.5">{h.subject} · {h.className}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  isDraft ? "bg-muted text-muted-foreground" : isOverdue ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                }`}>
                  {isDraft ? "Draft" : isOverdue ? "Overdue" : "Published"}
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due: {new Date(h.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Users className="w-3.5 h-3.5" />
                  <span>{h.submissions} / {h.total} submitted</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="h-1.5 rounded-full gradient-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setViewId(h.id)}
                  className="flex-1 min-w-[4.5rem] py-2 rounded-lg bg-muted text-xs font-medium text-heading hover:bg-muted/70 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(h.id)}
                  className="flex-1 min-w-[4.5rem] py-2 rounded-lg bg-muted text-xs font-medium text-heading hover:bg-muted/70 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => openSubs(h.id)}
                  className="flex-1 min-w-[4.5rem] py-2 rounded-lg bg-muted text-xs font-medium text-heading hover:bg-muted/70 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ListChecks className="w-3.5 h-3.5" /> Subs
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(h.id)}
                  className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {h.status === "active" && !isDraft && h.submissions < h.total && (
                  <button
                    type="button"
                    onClick={() => handleReminder(h)}
                    className="py-2 px-3 rounded-lg bg-warning/10 text-xs font-medium text-warning hover:bg-warning/20 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5" /> Remind
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* View homework */}
      {viewId && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setViewId(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading">Homework detail</h3>
              <button type="button" onClick={() => setViewId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {viewLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : viewData ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Topic</p>
                  <p className="font-semibold text-heading">{viewData.topic}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Teacher instructions & notes (not shown to students)</p>
                  <p className="text-body whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-xs">
                    {viewData.instructions || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Generated questions</p>
                  <div className="text-sm whitespace-pre-wrap rounded-lg bg-muted/40 p-3 max-h-64 overflow-auto leading-relaxed">
                    {formatQuestionsForTextarea(viewData.generatedQuestions) || "—"}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Published: {viewData.isPublished ? "Yes" : "Draft"} · ID {viewData.homeworkId}
                </p>
              </div>
            ) : null}
          </motion.div>
        </div>
      )}

      {/* Edit homework */}
      {editId && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !editSaving && setEditId(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-heading">Edit homework</h3>
              <button type="button" disabled={editSaving} onClick={() => setEditId(null)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Topic</label>
              <input
                value={editForm.topic}
                onChange={(e) => setEditForm((f) => ({ ...f, topic: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Instructions (teacher-only / AI context)</label>
              <textarea
                value={editForm.instructions}
                onChange={(e) => setEditForm((f) => ({ ...f, instructions: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Questions (plain English)</label>
              <p className="text-[10px] text-muted-foreground mb-1.5 leading-relaxed">
                Put one question per section, separated by a blank line. First line: numbered prompt (e.g. 1. What is…). Then
                optional choices: A. …, B. … (letter + period or closing paren). Skip choices for written answers. Advanced: paste a JSON array if the text starts with [.
              </p>
              <textarea
                value={editForm.questionsText}
                onChange={(e) => setEditForm((f) => ({ ...f, questionsText: e.target.value }))}
                rows={14}
                placeholder={`1. What is 2 + 2?\nA. 3\nB. 4\nC. 5\n\n2. Explain photosynthesis in your own words.`}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm whitespace-pre-wrap resize-y min-h-[200px]"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-heading">
              <input
                type="checkbox"
                checked={editForm.isPublished}
                onChange={(e) => setEditForm((f) => ({ ...f, isPublished: e.target.checked }))}
              />
              Published (visible to class)
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEditId(null)}
                className="px-4 py-2 rounded-xl border border-border text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={saveEdit}
                className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm inline-flex items-center gap-2"
              >
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId != null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !deleteLoading && setDeleteId(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-xl border border-border p-6 w-full max-w-md"
          >
            <h3 className="font-bold text-heading mb-2">Delete homework?</h3>
            <p className="text-sm text-text-secondary mb-4">This removes the assignment and all student submissions.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" disabled={deleteLoading} onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl border border-border text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm inline-flex items-center gap-2"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Submissions list */}
      {subsId != null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSubsId(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-heading">Submissions</h3>
              <button type="button" onClick={() => setSubsId(null)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            {subsLoading ? (
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            ) : subsRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <ul className="space-y-3">
                {subsRows.map((r) => (
                  <li key={r.submissionId} className="rounded-lg border border-border p-3 text-xs">
                    <p className="font-semibold text-heading">{r.studentName}</p>
                    <p className="text-text-secondary mt-0.5">
                      {r.status}
                      {r.submittedAt ? ` · ${new Date(r.submittedAt).toLocaleString()}` : ""}
                    </p>
                    <pre className="mt-2 text-[10px] bg-muted/40 p-2 rounded overflow-x-auto max-h-32">
                      {JSON.stringify(r.answers, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      )}

      {/* Reminder Modal */}
      <AnimatePresence>
        {showReminder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowReminder(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-heading flex items-center gap-2">
                  <Bell className="w-5 h-5 text-warning" /> Send Reminder
                </h3>
                <button onClick={() => setShowReminder(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                Alert <span className="font-semibold text-heading">{showReminder.total - showReminder.submissions} students</span> who haven't submitted "{showReminder.title}"
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Subject</label>
                  <input value={reminderForm.subject} onChange={(e) => setReminderForm({ ...reminderForm, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Due Date</label>
                  <input type="date" value={reminderForm.day} onChange={(e) => setReminderForm({ ...reminderForm, day: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-heading focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowReminder(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-heading hover:bg-muted transition-colors">Cancel</button>
                  <button onClick={handleSendReminder}
                    className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Send Alert
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Settings(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
