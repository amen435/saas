import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Info, ShieldCheck, ArrowRight } from 'lucide-react';

const ALERT_TYPES = {
  LATE: {
    color: 'text-warning bg-warning/10 border-warning/20',
    icon: Clock,
    title: 'Late Arrival Detected'
  },
  MISSING: {
    color: 'text-destructive bg-destructive/5 border-destructive/10',
    icon: AlertTriangle,
    title: 'Missing Attendance'
  },
  ANOMALY: {
    color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    icon: ShieldCheck,
    title: 'Security Alert'
  }
};

export default function AttendanceAlertsPanel({ alerts = [] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 h-full space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-heading uppercase tracking-widest flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" /> 
          Anomalies & Alerts
        </h3>
        {alerts.length > 0 && (
          <span className="w-5 h-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-black animate-pulse">
            {alerts.length}
          </span>
        )}
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-60"
            >
              <div className="p-3 rounded-2xl bg-muted/50 border border-border">
                <Info className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">No Anomalies Detected Today</p>
            </motion.div>
          ) : (
            alerts.map((alert, index) => {
              const config = ALERT_TYPES[alert.type] || ALERT_TYPES.MISSING;
              const Icon = config.icon;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 ${config.color}`}
                >
                  <div className="flex gap-3 relative z-10">
                    <div className="p-2 h-fit rounded-lg bg-card border border-border/50 shadow-sm">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase tracking-wider opacity-80">{config.title}</p>
                      <p className="text-xs font-bold text-heading leading-relaxed">{alert.message}</p>
                      <button className="flex items-center gap-1.5 pt-2 text-[10px] font-black text-primary uppercase tracking-widest group-hover:gap-2.5 transition-all">
                        View Detail <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Background Decoration */}
                  <div className="absolute top-0 right-0 p-1 opacity-5">
                    <Icon className="w-12 h-12" />
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
