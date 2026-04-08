// src/pages/Login.jsx

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  Loader2,
  AlertCircle,
  School,
  Hash,
  Building,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

const schoolBg = "/ph.jpg";
const logoUrl = "/logo.png";

const roleRoutes = {
  SUPER_ADMIN: "/superadmin",
  SCHOOL_ADMIN: "/admin",
  TEACHER: "/teacher",
  HOMEROOM_TEACHER: "/homeroom",
  STUDENT: "/student",
  PARENT: "/parent",
};

const passwordRules = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "One number (0-9)", test: (p) => /[0-9]/.test(p) },
  { id: "symbol", label: "One symbol (!@#$%...)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [userId, setUserId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState("en");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");

  const passedRules = passwordRules.filter((r) => r.test(password));
  const strength = passedRules.length;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "text-destructive", "text-warning", "text-info", "text-success"][strength];
  const strengthBarColor = ["", "bg-destructive", "bg-warning", "bg-info", "bg-success"][strength];
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!userId.trim() || !schoolId.trim() || !password) {
      setError("User ID, School ID, and password are required.");
      return;
    }

    if (password && passedRules.length < 4) {
      setPasswordError("Password must meet all requirements below.");
      setShowRules(true);
      return;
    }

    setPasswordError("");
    setLoading(true);

    try {
      const result = await login(userId.trim(), password, schoolId.trim());

      if (result.success) {
        // Navigation is handled inside AuthContext.login based on roles
        toast.success(result.message || "Logged in successfully.");
      } else {
        const msg = result.message || result.error || "Login failed. Please check your credentials.";
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
      // Network/server errors are already surfaced by the global API interceptor via react-hot-toast
    } finally {
      setLoading(false);
    }
  };

 return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${schoolBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ position: "relative", zIndex: 10 }}
        className="w-full max-w-md"
      >
          {/* Logo */}
        <div className="text-center mb-8"/>
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg flex items-center justify-center bg-black">
              <img
                src={logoUrl}
                alt="School Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        {/* Card */}
        <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-xl border border-border p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-heading">System Portal</h2>
            <p className="text-xs text-text-secondary uppercase tracking-widest mt-1">Institutional Authentication</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User ID */}
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">User ID</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="e.g. STU-001"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            {/* School ID */}
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                School ID
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="e.g. ET-102934"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setShowRules(true); setPasswordError(""); }}
                  onFocus={() => setShowRules(true)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm ${passwordError ? "border-destructive" : "border-border"}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthBarColor : "bg-muted"}`} />
                    ))}
                  </div>
                  <p className={`text-[10px] font-semibold ${strengthColor}`}>{strengthLabel}</p>
                </div>
              )}

              {/* Requirements */}
              {showRules && (
                <div className="mt-2 space-y-1">
                  {passwordRules.map((rule) => {
                    const passed = rule.test(password);
                    return (
                      <div key={rule.id} className="flex items-center gap-1.5">
                        {passed
                          ? <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                          : <XCircle className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                        <span className={`text-[10px] ${passed ? "text-success" : "text-muted-foreground"}`}>{rule.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {passwordError && <p className="text-[10px] text-destructive mt-1">{passwordError}</p>}
            </div>

            {/* Backend errors */}
            {error && (
              <div className="flex items-start gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/30 rounded-lg p-2">
                <AlertCircle className="w-4 h-4 mt-[2px]" />
                <p>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground py-3 rounded-lg font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Identify User <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Language Toggle */}
          <div className="flex items-center justify-center mt-6 bg-muted rounded-lg p-1">
            <button
              onClick={() => setLang("en")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${lang === "en" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              ENGLISH
            </button>
            <button
              onClick={() => setLang("am")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${lang === "am" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              አማርኛ
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4 cursor-pointer hover:text-primary transition-colors">
            FORGOT PASSWORD?
          </p>
        </div>
      </motion.div>
    </div>
  );
}
