import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, GraduationCap, CalendarCheck, Bell, Mail, MessageSquare, Bot, Shield, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const Section = ({ icon: Icon, title, desc, children }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon className="w-4.5 h-4.5" /></div>
      <div><h3 className="text-sm font-bold text-heading">{title}</h3><p className="text-[11px] text-muted-foreground">{desc}</p></div>
    </div>
    <div className="space-y-4">{children}</div>
  </motion.div>
);

const SettingRow = ({ label, desc, children }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div><p className="text-sm font-medium text-heading">{label}</p>{desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}</div>
    {children}
  </div>
);

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    gradingScale: "percentage", passGrade: "50", maxGPA: "4.0",
    lateThreshold: "15", absentAfter: "3", autoNotifyParent: true,
    reminderHomework: true, reminderFees: true, reminderExams: true, reminderDaysBefore: "2",
    emailProvider: "smtp", smtpHost: "", smtpPort: "587",
    smsProvider: "twilio", smsApiKey: "",
    aiEnabled: true, aiMaxPerSchool: "1000", aiModel: "gemini-2.5-flash",
    twoFactorRequired: false, sessionTimeout: "30", ipWhitelist: false, auditLog: true,
  });

  const update = (key, val) => setSettings({ ...settings, [key]: val });
  const handleSave = () => toast.success("Settings saved successfully.");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure platform-wide defaults and integrations.</p>
        </div>
        <Button onClick={handleSave} className="gradient-primary text-primary-foreground gap-2"><Save className="w-4 h-4" /> SAVE ALL</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section icon={GraduationCap} title="Grading System" desc="Default grading scale for all schools">
          <SettingRow label="Grading Scale">
            <Select value={settings.gradingScale} onValueChange={(v) => update("gradingScale", v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="letter">Letter Grade</SelectItem><SelectItem value="gpa">GPA</SelectItem></SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Pass Grade" desc="Minimum passing score"><Input value={settings.passGrade} onChange={(e) => update("passGrade", e.target.value)} className="w-24 text-center" /></SettingRow>
          <SettingRow label="Max GPA"><Input value={settings.maxGPA} onChange={(e) => update("maxGPA", e.target.value)} className="w-24 text-center" /></SettingRow>
        </Section>

        <Section icon={CalendarCheck} title="Attendance Rules" desc="Default attendance policies">
          <SettingRow label="Late Threshold" desc="Minutes after class starts"><Input value={settings.lateThreshold} onChange={(e) => update("lateThreshold", e.target.value)} className="w-24 text-center" /></SettingRow>
          <SettingRow label="Auto-notify Parent" desc="When student is absent"><Switch checked={settings.autoNotifyParent} onCheckedChange={(v) => update("autoNotifyParent", v)} /></SettingRow>
          <SettingRow label="Mark absent after" desc="Consecutive absences"><Input value={settings.absentAfter} onChange={(e) => update("absentAfter", e.target.value)} className="w-24 text-center" /></SettingRow>
        </Section>

        <Section icon={Bell} title="Reminders" desc="Automated notification schedules">
          <SettingRow label="Homework Reminders"><Switch checked={settings.reminderHomework} onCheckedChange={(v) => update("reminderHomework", v)} /></SettingRow>
          <SettingRow label="Fee Payment Reminders"><Switch checked={settings.reminderFees} onCheckedChange={(v) => update("reminderFees", v)} /></SettingRow>
          <SettingRow label="Exam Reminders"><Switch checked={settings.reminderExams} onCheckedChange={(v) => update("reminderExams", v)} /></SettingRow>
          <SettingRow label="Days Before Deadline"><Input value={settings.reminderDaysBefore} onChange={(e) => update("reminderDaysBefore", e.target.value)} className="w-24 text-center" /></SettingRow>
        </Section>

        <Section icon={Mail} title="Email Integration" desc="SMTP configuration for system emails">
          <SettingRow label="Email Provider">
            <Select value={settings.emailProvider} onValueChange={(v) => update("emailProvider", v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="smtp">SMTP</SelectItem><SelectItem value="sendgrid">SendGrid</SelectItem><SelectItem value="ses">AWS SES</SelectItem></SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="SMTP Host"><Input value={settings.smtpHost} onChange={(e) => update("smtpHost", e.target.value)} placeholder="smtp.example.com" className="w-48" /></SettingRow>
          <SettingRow label="SMTP Port"><Input value={settings.smtpPort} onChange={(e) => update("smtpPort", e.target.value)} className="w-24 text-center" /></SettingRow>
        </Section>

        <Section icon={MessageSquare} title="SMS Integration" desc="SMS gateway configuration">
          <SettingRow label="SMS Provider">
            <Select value={settings.smsProvider} onValueChange={(v) => update("smsProvider", v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="twilio">Twilio</SelectItem><SelectItem value="africastalking">Africa's Talking</SelectItem><SelectItem value="nexmo">Nexmo</SelectItem></SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="API Key"><Input type="password" value={settings.smsApiKey} onChange={(e) => update("smsApiKey", e.target.value)} placeholder="••••••••" className="w-48" /></SettingRow>
        </Section>

        <Section icon={Bot} title="AI Configuration" desc="Control AI usage across the platform">
          <SettingRow label="AI Features Enabled"><Switch checked={settings.aiEnabled} onCheckedChange={(v) => update("aiEnabled", v)} /></SettingRow>
          <SettingRow label="Max Requests / School / Month"><Input value={settings.aiMaxPerSchool} onChange={(e) => update("aiMaxPerSchool", e.target.value)} className="w-28 text-center" /></SettingRow>
          <SettingRow label="Default Model">
            <Select value={settings.aiModel} onValueChange={(v) => update("aiModel", v)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem><SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem><SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem></SelectContent>
            </Select>
          </SettingRow>
        </Section>

        <Section icon={Shield} title="Security" desc="Platform security settings">
          <SettingRow label="Require 2FA" desc="For admin accounts"><Switch checked={settings.twoFactorRequired} onCheckedChange={(v) => update("twoFactorRequired", v)} /></SettingRow>
          <SettingRow label="Session Timeout" desc="Minutes of inactivity"><Input value={settings.sessionTimeout} onChange={(e) => update("sessionTimeout", e.target.value)} className="w-24 text-center" /></SettingRow>
          <SettingRow label="IP Whitelisting"><Switch checked={settings.ipWhitelist} onCheckedChange={(v) => update("ipWhitelist", v)} /></SettingRow>
          <SettingRow label="Audit Logging"><Switch checked={settings.auditLog} onCheckedChange={(v) => update("auditLog", v)} /></SettingRow>
        </Section>
      </div>
    </div>
  );
}
