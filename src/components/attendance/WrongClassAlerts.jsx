import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ShieldAlert, MapPin, Clock, Info } from "lucide-react";

const ALERT_CONFIG = {
  WRONG_CLASS: {
    label: "Wrong Class",
    icon: AlertTriangleIcon,
    className:
      "bg-warning/10 text-warning border border-warning/20",
  },
  UNAUTHORIZED_TEACHER: {
    label: "Unauthorized",
    icon: ShieldAlert,
    className:
      "bg-destructive/10 text-destructive border border-destructive/20",
  },
  UNKNOWN_PERSON: {
    label: "Unknown",
    icon: AlertTriangleIcon,
    className:
      "bg-muted text-muted-foreground border border-border",
  },
};

export default function WrongClassAlerts({ alerts = [], isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-destructive/20 shadow-card flex flex-col h-full max-h-[500px]">
        <div className="p-4 border-b border-border bg-destructive/5 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <h3 className="font-semibold text-heading">Security & Location Alerts</h3>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-muted/30 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-destructive/20 shadow-card flex flex-col h-full max-h-[500px]">
      <div className="p-4 border-b border-border bg-destructive/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <h3 className="font-semibold text-heading">Security Alerts</h3>
        </div>
        <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
          {alerts.length} New
        </span>
      </div>

      <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {alerts.length > 0 ? (
            alerts.map((alert, idx) => {
              const config = ALERT_CONFIG[alert.type] || ALERT_CONFIG.UNKNOWN_PERSON;
              const TypeIcon = config.icon;

              return (
                <motion.div
                  key={alert.id || idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="p-4 rounded-xl border border-border bg-background hover:bg-muted/30 transition-colors shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-heading text-sm">{alert.name || "Unknown person"}</h4>
                    <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${config.className}`}>
                      <TypeIcon className="w-3 h-3" /> {config.label}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-text-secondary mt-3">
                    <div className="flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 opacity-70" />
                      <span className="font-medium">Message:</span>
                      <span className="text-heading">{alert.message || alert.expectedClass || "None"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 opacity-70 text-destructive" />
                      <span className="font-medium">Detected In:</span>
                      <span className="text-destructive font-medium">{alert.detectedClassroom || alert.class?.className || "Unknown class"}</span>
                    </div>
                    {alert.expectedClass ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 opacity-70" />
                        <span className="font-medium">Expected:</span>
                        <span className="text-heading">{alert.expectedClass}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 text-[11px] mt-2 opacity-80 border-t border-border pt-1.5">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full min-h-[200px]"
            >
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                <CheckCircleIcon className="w-6 h-6 text-success" />
              </div>
              <p className="text-sm font-semibold text-heading">All Clear</p>
              <p className="text-xs mt-1">No security or wrong classroom alerts at the moment.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AlertTriangleIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CheckCircleIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}
