import { useState } from "react";
import { ScanFace, Info, Image as ImageIcon, CheckCircle, XCircle, ArrowRightCircle } from "lucide-react";
import WebcamCapture from "./WebcamCapture";
import ImageUploader from "./ImageUploader";
import { motion, AnimatePresence } from "framer-motion";

export default function FacePreviewCard({ faceImage, onFaceImageChange }) {
  const [mode, setMode] = useState("webcam"); // webcam | upload

  const handleClear = () => {
    onFaceImageChange(null);
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-card flex flex-col overflow-hidden sticky top-6">
      <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
            <ScanFace className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-heading text-lg leading-none">Face Enrollment</h3>
            <p className="text-[10px] text-text-secondary mt-1.5 uppercase font-bold tracking-wider">Required for AI Attendance</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center">
          {faceImage ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20 text-success text-[10px] font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300">
              <CheckCircle className="w-3.5 h-3.5" /> Ready
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              <XCircle className="w-3.5 h-3.5" /> Pending
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col gap-5">
        <div className="bg-primary/5 border border-primary/10 text-primary-700 dark:text-primary-400 p-3.5 rounded-xl flex gap-3 items-start text-xs leading-relaxed">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Please provide a clear, front-facing photo. This image will be used to calibrate the automated <strong>ESP32-CAM</strong> facial recognition hardware.
          </p>
        </div>

        <div className="w-full min-h-[220px] flex flex-col">
          <AnimatePresence mode="wait">
            {faceImage ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex flex-col gap-4"
              >
                <div className="relative aspect-video rounded-xl border-2 border-primary/20 overflow-hidden bg-black/5 ring-4 ring-primary/5 shadow-lg">
                  <img src={faceImage} alt="Face Preview" className="w-full h-full object-contain" />
                  <div className="absolute top-3 right-3">
                     <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-success text-success-foreground text-[10px] font-bold shadow-sm">
                       <CheckCircle className="w-3 h-3" /> VERIFIED
                     </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-full py-3 rounded-lg bg-muted text-heading text-sm font-semibold hover:bg-muted/80 transition-all active:scale-[0.98] border border-border"
                  >
                    Discard & Retake Photo
                  </button>
                  <p className="text-[10px] text-center text-text-secondary flex items-center justify-center gap-1 mt-1">
                    <Info className="w-3 h-3" /> Photo successfully encoded for AI processing.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="capture"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4"
              >
                {/* Mode Switcher */}
                <div className="flex p-1 bg-muted rounded-xl w-full border border-border shadow-inner">
                  <button
                    type="button"
                    onClick={() => setMode("webcam")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                      mode === "webcam" ? "bg-background text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-heading"
                    }`}
                  >
                    <ScanFace className="w-3.5 h-3.5" /> Use System Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("upload")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                      mode === "upload" ? "bg-background text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-heading"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Upload Photo
                  </button>
                </div>

                <div className="mt-2 text-center text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] flex items-center justify-center gap-2">
                  <div className="h-px bg-border flex-1"></div>
                  {mode === "webcam" ? "Awaiting Capture" : "Awaiting File Selection"}
                  <div className="h-px bg-border flex-1"></div>
                </div>

                <div className="bg-muted/10 rounded-xl">
                  {mode === "webcam" ? (
                    <WebcamCapture onCapture={onFaceImageChange} />
                  ) : (
                    <ImageUploader onImageSelected={onFaceImageChange} />
                  )}
                </div>
                
                <div className="p-3 rounded-lg border border-warning/20 bg-warning/5 text-[11px] text-warning-700 leading-normal flex gap-2">
                   <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                   <p>Face enrollment is essential for high-fidelity security and automatic attendance matching.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
