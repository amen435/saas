import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Search, AlertTriangle, LogIn, Activity, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LogTable = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-border">
          {headers.map((h) => <th key={h} className="px-4 py-3 text-[11px] font-semibold text-muted-foreground tracking-wider text-left">{h}</th>)}
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  </div>
);

export default function LogsMonitoring() {
  const [searchQuery, setSearchQuery] = useState("");
  const [logType, setLogType] = useState("all");
  const loginLogs = [];
  const errorLogs = [];
  const activityLogs = [];
  const suspiciousAlerts = [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Logs & Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Track login activity, errors, and suspicious behavior across the platform. Connect a logs API when available.</p>
        </div>
      </div>

      {/* Alert Banner */}
      {suspiciousAlerts.some((a) => !a.resolved) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Security Alert</p>
            <p className="text-xs text-destructive/80">{suspiciousAlerts.filter((a) => !a.resolved).length} unresolved suspicious activity alert(s) detected.</p>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="bg-card rounded-xl border border-border p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search logs..." className="pl-10" />
        </div>
        <Select value={logType} onValueChange={setLogType}>
          <SelectTrigger className="w-40"><Filter className="w-3.5 h-3.5 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Logs</SelectItem><SelectItem value="error">Errors Only</SelectItem><SelectItem value="warning">Warnings</SelectItem></SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="logins" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="logins" className="gap-1.5 text-xs"><LogIn className="w-3.5 h-3.5" />Logins</TabsTrigger>
          <TabsTrigger value="errors" className="gap-1.5 text-xs"><AlertTriangle className="w-3.5 h-3.5" />Errors</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs"><Activity className="w-3.5 h-3.5" />Activity</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs"><Shield className="w-3.5 h-3.5" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="logins">
          <div className="bg-card rounded-xl border border-border">
            {loginLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No login logs. Connect a logs API when available.</div>
            ) : (
            <LogTable headers={["User", "Role", "School", "IP Address", "Time", "Status"]}
              rows={loginLogs.filter((l) => (l.user || "").toLowerCase().includes(searchQuery.toLowerCase()) || (l.ip || "").includes(searchQuery)).map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium text-heading">{l.user}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.role}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.school}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{l.ip}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.time}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-bold ${l.status === "success" ? "text-success" : "text-destructive"}`}>{l.status.toUpperCase()}</span></td>
                </tr>
              ))}
            />
            )}
          </div>
        </TabsContent>

        <TabsContent value="errors">
          <div className="bg-card rounded-xl border border-border">
            {errorLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No error logs. Connect a logs API when available.</div>
            ) : (
            <LogTable headers={["Level", "Message", "Source", "School", "Time"]}
              rows={errorLogs.filter((l) => logType === "all" || l.level === logType).map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.level === "error" ? "bg-destructive/10 text-destructive" : l.level === "warning" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}>
                      {l.level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-heading max-w-xs truncate">{l.message}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{l.source}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.school}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.time}</td>
                </tr>
              ))}
            />
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="bg-card rounded-xl border border-border">
            {activityLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No activity logs. Connect a logs API when available.</div>
            ) : (
            <LogTable headers={["Action", "User", "Details", "Time"]}
              rows={activityLogs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium text-heading">{l.action}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.user}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{l.details}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.time}</td>
                </tr>
              ))}
            />
            )}
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-3">
            {suspiciousAlerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground rounded-xl border border-border bg-card">No security alerts. Connect a logs API when available.</div>
            ) : (
            suspiciousAlerts.map((a, i) => (
              <motion.div key={a.id ?? i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`bg-card rounded-xl border p-5 flex items-start gap-4 ${a.resolved ? "border-border" : "border-destructive/30"}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.severity === "high" ? "bg-destructive/10 text-destructive" : a.severity === "medium" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-heading">{a.type}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.severity === "high" ? "bg-destructive/10 text-destructive" : a.severity === "medium" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}>
                      {(a.severity ?? "").toUpperCase()}
                    </span>
                    {a.resolved && <span className="text-[10px] font-semibold text-success">✓ RESOLVED</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">📅 {a.time}</p>
                </div>
                {!a.resolved && <Button size="sm" variant="outline" className="text-xs">Resolve</Button>}
              </motion.div>
            ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
