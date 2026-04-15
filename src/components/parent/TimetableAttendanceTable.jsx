import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, Fingerprint, Monitor, Info, Calendar } from 'lucide-react';
import AttendanceStatusBadge from './AttendanceStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

export default function TimetableAttendanceTable({ timeline = [], isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-6 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Calendar className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-heading">No Schedule Found</h3>
          <p className="text-sm text-text-secondary max-w-[280px]"> There are no timetable periods assigned to your child for this date.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Table Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-muted/20 border-b border-border">
        <div className="col-span-1 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Period</div>
        <div className="col-span-2 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Schedule</div>
        <div className="col-span-3 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Subject & Teacher</div>
        <div className="col-span-2 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Method</div>
        <div className="col-span-2 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Attendance</div>
        <div className="col-span-2 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] text-right">Records</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {timeline.map((period, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="md:grid md:grid-cols-12 md:items-center gap-4 px-6 py-5 hover:bg-muted/10 transition-colors group"
          >
            {/* Period Column */}
            <div className="col-span-1 mb-2 md:mb-0">
              <div className="w-9 h-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black text-sm border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                {period.periodNumber || (index + 1)}
              </div>
            </div>

            {/* Schedule Column */}
            <div className="col-span-2 flex items-center gap-2 mb-3 md:mb-0">
              <div className="p-2 rounded-lg border border-border bg-background group-hover:border-primary/20 transition-colors">
                <Clock className="w-3.5 h-3.5 text-text-secondary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-black text-heading font-mono">{period.startTime || '--:--'}</p>
                <p className="text-[10px] text-text-secondary font-medium uppercase">{period.endTime || '--:--'}</p>
              </div>
            </div>

            {/* Subject/Teacher Column */}
            <div className="col-span-3 flex flex-col space-y-1 mb-4 md:mb-0">
               <p className="text-sm font-black text-heading flex items-center gap-2">
                 {period.subject?.name || 'Unassigned Period'}
               </p>
               <div className="flex items-center gap-1.5 text-[11px] text-text-secondary font-medium">
                 <User className="w-3 h-3 text-primary/60" />
                 {period.teacher?.fullName || 'TBD'}
               </div>
            </div>

            {/* Recognition Method Column */}
            <div className="col-span-2 flex items-center gap-2 mb-4 md:mb-0">
              {period.attendance?.method === 'Facial Recognition' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100/50">
                  <Fingerprint className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Face AI</span>
                </div>
              ) : period.attendance?.method === 'System' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                  <Monitor className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">System</span>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground opacity-50 px-2 italic">Scheduled</span>
              )}
            </div>

            {/* Status Column */}
            <div className="col-span-2 mb-4 md:mb-0">
              <AttendanceStatusBadge status={period.attendance?.status || 'NOT_MARKED'} />
            </div>

            {/* Info/Action Column */}
            <div className="col-span-2 flex items-center justify-end">
               <button className="flex items-center gap-2 text-[10px] font-black text-text-secondary uppercase tracking-[0.1em] hover:text-primary transition-colors bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                 <Info className="w-3.5 h-3.5" /> Details
               </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
