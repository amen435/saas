import React from 'react';
import { motion } from 'framer-motion';
import { User, BookOpen, TrendingUp, CircleCheck } from 'lucide-react';

export default function ChildSummaryCard({ student, statistics }) {
  const percentage = statistics?.overallAttendance || 0;
  const hasPeriodsToday = Number(statistics?.totalToday || 0) > 0;
  const todayStatusLabel = hasPeriodsToday
    ? `${statistics?.presentToday || 0} of ${statistics?.totalToday || 0} periods recorded today`
    : "No timetable periods recorded for this day";
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Decorative background gradient */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
        {/* Profile Avatar & Name */}
        <div className="flex items-center gap-5 flex-1">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground shadow-lg">
              <User className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-success border-4 border-card flex items-center justify-center shadow-sm">
              <CircleCheck className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-xl font-black text-heading tracking-tight">
              {student?.fullName || 'Child Name'}
            </h2>
            <div className="flex items-center justify-center md:justify-start gap-4">
              <span className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                {student?.class?.className || 'Class Not Assigned'}
              </span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[10px] font-black text-success uppercase tracking-widest hidden sm:inline">
                Live API Data
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">{todayStatusLabel}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-8 w-full md:w-auto shrink-0 justify-around md:justify-start">
          <div className="text-center md:text-left space-y-1">
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-60">Today's Ratio</p>
            <p className="text-xl font-black text-heading">{statistics?.presentToday || 0} <span className="text-xs text-text-secondary font-medium">/ {statistics?.totalToday || 0} periods</span></p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center md:text-right space-y-1">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Overall Attendance</p>
              <div className="flex items-center justify-center md:justify-end gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-2xl font-black text-heading font-mono">{percentage}%</span>
              </div>
            </div>
            
            {/* Visual Progress Mini-Circle */}
            <div className="relative w-12 h-12 hidden sm:flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-muted/30"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={126}
                  strokeDashoffset={126 - (126 * percentage) / 100}
                  className="text-primary transition-all duration-1000 ease-out"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
