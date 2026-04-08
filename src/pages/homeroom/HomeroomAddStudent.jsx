import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddStudentForm from "@/components/shared/AddStudentForm";
import { useHomeroomClasses } from "@/hooks/useStudents";

export default function HomeroomAddStudent() {
  const navigate = useNavigate();
  const { data: homeroomClasses = [], isLoading } = useHomeroomClasses();
  const firstClass = homeroomClasses[0];
  const classId = firstClass?.classId ?? firstClass?.id;
  const fixedClassLabel = firstClass
    ? `Grade ${firstClass.gradeLevel ?? ""}-${firstClass.section ?? ""}`.replace(/^-|-$/g, "").trim() || firstClass.name
    : null;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!classId) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/homeroom")} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-heading">Add New Student</h1>
          </div>
        </div>
        <p className="text-muted-foreground">No homeroom class assigned. You need a homeroom class to add students.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/homeroom")} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-heading">Add New Student</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Enter student and parent/guardian details</p>
        </div>
      </div>

      <AddStudentForm
        classId={classId}
        fixedClass={fixedClassLabel}
        onSuccess={() => navigate("/homeroom")}
        onCancel={() => navigate("/homeroom")}
      />
    </div>
  );
}
