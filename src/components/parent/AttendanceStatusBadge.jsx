import React from 'react';
import { CheckCircle2, XCircle, Clock, MinusCircle } from 'lucide-react';

const CONFIG = {
  PRESENT: {
    label: 'Present',
    color: 'text-success bg-success/10 border-success/20',
    icon: CheckCircle2,
  },
  ABSENT: {
    label: 'Absent',
    color: 'text-destructive bg-destructive/10 border-destructive/20',
    icon: XCircle,
  },
  LATE: {
    label: 'Late',
    color: 'text-warning bg-warning/10 border-warning/20',
    icon: Clock,
  },
  NOT_MARKED: {
    label: 'Not Marked',
    color: 'text-muted-foreground bg-muted/10 border-border',
    icon: MinusCircle,
  },
};

export default function AttendanceStatusBadge({ status }) {
  const normalizedStatus = (status || 'NOT_MARKED').toUpperCase();
  const config = CONFIG[normalizedStatus] || CONFIG.NOT_MARKED;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${config.color} transition-all duration-300`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </div>
  );
}
