import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Loader2, 
  History,
  Info 
} from "lucide-react";
import api from "@/services/api";
import { attendanceService } from "@/services/attendanceService";
import ChildSelector from "@/components/parent/ChildSelector";
import ChildSummaryCard from "@/components/parent/ChildSummaryCard";
import TimetableAttendanceTable from "@/components/parent/TimetableAttendanceTable";
import AttendanceAlertsPanel from "@/components/parent/AttendanceAlertsPanel";

// Standard ISO date formatting
const toISODate = (d) => d.toISOString().slice(0, 10);

export default function ParentAttendancePage() {
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // 1. Fetch Children for the Parent
  const {
    data: children,
    isLoading: childrenLoading,
    error: childrenError,
  } = useQuery({
    queryKey: ["parentChildren"],
    queryFn: async () => {
      const res = await api.get("/parents/me/children");
      const list = res?.data ?? [];
      if (!selectedChildId && list.length > 0) {
        setSelectedChildId(list[0].id);
      }
      return list;
    },
  });

  // 2. Fetch Daily Timeline View (Timetable + Attendance)
  const {
    data: timelineData,
    isLoading: timelineLoading,
    isFetching: timelineFetching,
    error: timelineError,
  } = useQuery({
    queryKey: ["parentAttendanceTimeline", selectedChildId, toISODate(selectedDate)],
    queryFn: () => attendanceService.getParentTimeline({ 
      studentId: selectedChildId, 
      date: toISODate(selectedDate) 
    }),
    enabled: !!selectedChildId,
    keepPreviousData: true,
  });

  // Date Navigation Handlers
  const handlePrevDay = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNextDay = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const handleToday = () => setSelectedDate(new Date());

  const formattedDate = useMemo(() => {
    return selectedDate.toLocaleDateString("en-US", { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }, [selectedDate]);

  if (childrenError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-destructive font-bold uppercase tracking-widest text-xs">Auth/Fetch Error</p>
        <p className="text-heading font-black">Failed to retrieve child account links.</p>
      </div>
    );
  }

  if (!childrenLoading && (!children || children.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
        <p className="text-primary font-bold uppercase tracking-widest text-xs">Parent Dashboard</p>
        <p className="text-heading font-black">No linked students found for this parent account.</p>
        <p className="text-sm text-text-secondary max-w-md">
          Ask the school admin or homeroom teacher to link a student record before checking attendance.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 px-4 md:px-6">
      
      {/* 1. Header & Child Selector */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-heading tracking-tight flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-primary" /> Learning Timeline
            </h1>
            <p className="text-[11px] text-text-secondary font-black uppercase tracking-[0.2em] opacity-60">
              Daily Attendance & Period Performance
            </p>
          </div>
          
          <div className="flex-1 max-w-lg">
             {childrenLoading ? (
               <div className="h-16 w-full animate-pulse bg-muted/40 rounded-2xl" />
             ) : (
               <ChildSelector 
                 children={children} 
                 selectedChild={selectedChildId} 
                 onSelect={setSelectedChildId} 
               />
             )}
          </div>
        </div>
      </div>

      {/* 2. Top Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
           <ChildSummaryCard 
             student={timelineData?.student} 
             statistics={timelineData?.statistics}
           />
        </div>

        {/* Navigation & Calendar Mini-Widget */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
           <div className="flex items-center justify-between mb-2">
             <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Date Navigation</h4>
             {timelineFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
           </div>
           
           <div className="flex items-center justify-between gap-2">
             <button 
               onClick={handlePrevDay}
               className="p-2.5 rounded-xl bg-muted border border-border hover:bg-primary hover:text-white transition-all active:scale-95"
             >
               <ChevronLeft className="w-5 h-5" />
             </button>
             
             <div className="text-center flex-1">
                <p className="text-xs font-black text-heading font-mono uppercase tracking-tighter">
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <button 
                  onClick={handleToday}
                  className="text-[9px] font-black text-primary uppercase tracking-widest mt-0.5 hover:underline"
                >
                  Return Today
                </button>
             </div>

             <button 
               onClick={handleNextDay}
               className="p-2.5 rounded-xl bg-muted border border-border hover:bg-primary hover:text-white transition-all active:scale-95"
             >
               <ChevronRight className="w-5 h-5" />
             </button>
           </div>

           <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-[10px] font-bold text-text-secondary">
             <CalendarIcon className="w-3.5 h-3.5 opacity-50" />
             {formattedDate}
           </div>

           {/* Fancy background icon */}
           <History className="absolute -bottom-4 -right-4 w-20 h-20 text-muted opacity-[0.03] group-hover:scale-110 transition-transform" />
        </div>
      </div>

      {/* 3. Main Data Section (Timeline & Alerts) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Daily Timetable Timeline (8/12) */}
        <div className="xl:col-span-8 space-y-6">
           <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-heading tracking-tight">Today's Academic Flow</h3>
                <p className="text-xs text-text-secondary">Attendance status synchronized with real-time timetable</p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100/50 flex items-center gap-2 text-indigo-600">
                <Info className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Help</span>
              </div>
           </div>

           <TimetableAttendanceTable 
              timeline={timelineData?.timeline || []} 
              isLoading={timelineLoading} 
           />
           {timelineError ? (
             <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
               {timelineError.message || "Failed to load attendance timeline."}
             </div>
           ) : null}
        </div>

        {/* Alerts & Anomalies Panel (4/12) */}
        <div className="xl:col-span-4 lg:sticky lg:top-8">
           <AttendanceAlertsPanel alerts={timelineData?.alerts || []} />
           
           {/* Marketing/Support Card placeholder beneath alerts */}
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             transition={{ delay: 0.5 }}
             className="mt-6 p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-3"
           >
             <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Live Attendance Feed</p>
             <h4 className="text-sm font-black text-heading leading-snug">This dashboard is now driven by timetable, attendance, and alert records from the live backend.</h4>
             <p className="text-xs text-text-secondary leading-relaxed">
               If a period looks missing or incorrect, the child may have missed recognition or a teacher may need to verify the class attendance manually.
             </p>
           </motion.div>
        </div>
      </div>
    </div>
  );
}
