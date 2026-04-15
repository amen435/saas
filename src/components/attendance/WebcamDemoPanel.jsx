import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ScanFace, Play, Square, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import { attendanceService } from "@/services/attendanceService";
import { motion, AnimatePresence } from "framer-motion";

export default function WebcamDemoPanel({
  onRecognitionSuccess,
  selectedDeviceId,
  selectedClassName,
  expectedRole = "ALL",
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      toast.success("Camera started");
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !stream) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageUrl = canvas.toDataURL("image/jpeg");
    setCapturedImage(imageUrl);
    setResult(null);
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setResult(null);
  };

  const recognizeAttendance = async () => {
    if (!capturedImage) {
      toast.error("Please capture an image first.");
      return;
    }

    if (!selectedDeviceId) {
      toast.error("Select a class with a registered device first.");
      return;
    }

    setIsRecognizing(true);
    try {
      const recognitionData = await attendanceService.simulateFacialRecognition({
        imageBase64: capturedImage,
        deviceId: selectedDeviceId,
        timestamp: new Date().toISOString(),
      });

      setResult({
        mode: "success",
        name: recognitionData?.person?.name,
        role: recognitionData?.person?.role,
        className: recognitionData?.person?.class,
        status: recognitionData?.attendance?.status,
        time: recognitionData?.attendance?.timestamp,
        timetableId: recognitionData?.attendance?.timetableId,
        photo: capturedImage,
      });
      toast.success(`Recognized: ${recognitionData?.person?.name || "Person"}`);
      onRecognitionSuccess?.(recognitionData);
    } catch (error) {
      const alertData = error?.data?.alert || null;
      const detailsPerson = error?.data?.person || null;

      setResult({
        mode: "error",
        name: detailsPerson?.name || alertData?.name || "Unknown person",
        role: detailsPerson?.role || (expectedRole !== "ALL" ? expectedRole : "UNKNOWN"),
        className: detailsPerson?.class || selectedClassName || "Unknown class",
        status:
          alertData?.type === "WRONG_CLASS"
            ? "WRONG_CLASS"
            : alertData?.type === "UNAUTHORIZED_TEACHER"
              ? "UNAUTHORIZED"
              : "UNKNOWN",
        time: alertData?.timestamp || new Date().toISOString(),
        message: error.message,
        photo: capturedImage,
      });

      toast.error(error.message || "Recognition failed.");
      onRecognitionSuccess?.({ success: false, alert: alertData, person: detailsPerson });
    } finally {
      setIsRecognizing(false);
    }
  };

  const roleNote = useMemo(() => {
    if (expectedRole === "TEACHER") {
      return "Teacher recognition should use one clear face in frame.";
    }
    if (expectedRole === "STUDENT") {
      return "Student recognition works best when each learner is scanned individually.";
    }
    return "Recognition works best with one clear front-facing face per scan.";
  }, [expectedRole]);

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-heading flex items-center gap-2">
            <ScanFace className="w-5 h-5 text-primary" />
            Webcam Recognition
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            {selectedClassName ? `Current class device: ${selectedClassName}` : "Select a class/device to begin"}
          </p>
        </div>
        <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md bg-primary/10 text-primary border border-primary/20">
          Live API
        </span>
      </div>

      <div className="mb-4 p-3 rounded-xl bg-muted/30 border border-border text-xs text-text-secondary">
        {roleNote}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-video bg-muted rounded-xl overflow-hidden border border-border flex items-center justify-center">
            {capturedImage ? (
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${stream ? "block" : "hidden"}`}
                />
                {!stream && (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                    <Camera className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm font-medium">Camera is off</p>
                    <p className="text-xs">Click Start Camera to begin</p>
                  </div>
                )}
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!stream && !capturedImage ? (
              <button
                onClick={startCamera}
                className="col-span-2 flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Play className="w-4 h-4" /> Start Camera
              </button>
            ) : stream && !capturedImage ? (
              <>
                <button
                  onClick={stopCamera}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-secondary/10 text-secondary rounded-lg text-sm font-medium hover:bg-secondary/20 transition-colors"
                >
                  <Square className="w-4 h-4" /> Stop
                </button>
                <button
                  onClick={captureImage}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Camera className="w-4 h-4" /> Capture
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={resetCapture}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  <Camera className="w-4 h-4" /> Retake
                </button>
                <button
                  onClick={recognizeAttendance}
                  disabled={isRecognizing || !selectedDeviceId}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
                >
                  {isRecognizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanFace className="w-4 h-4" />}
                  {isRecognizing ? "Processing..." : "Recognize"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col bg-muted/40 rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card">
            <h4 className="text-sm font-semibold text-heading">Recognition Result</h4>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-2 border-primary/20 overflow-hidden bg-background shrink-0">
                      <img src={result.photo} alt={result.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-heading leading-tight">{result.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-text-secondary bg-background px-2 py-0.5 rounded border border-border">
                          {result.role || "UNKNOWN"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 bg-background p-4 rounded-xl border border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Class</span>
                      <span className="font-medium text-right text-heading">{result.className || "N/A"}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-border">
                      <span className="text-text-secondary">State</span>
                      <div>
                        {result.status === "PRESENT" && (
                          <span className="flex items-center gap-1 text-success font-semibold px-2 py-0.5 rounded bg-success/10">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Present
                          </span>
                        )}
                        {result.status === "LATE" && (
                          <span className="flex items-center gap-1 text-warning font-semibold px-2 py-0.5 rounded bg-warning/10">
                            <AlertTriangle className="w-3.5 h-3.5" /> Late
                          </span>
                        )}
                        {result.status === "WRONG_CLASS" && (
                          <span className="flex items-center gap-1 text-warning font-semibold px-2 py-0.5 rounded bg-warning/10">
                            <AlertTriangle className="w-3.5 h-3.5" /> Wrong Class
                          </span>
                        )}
                        {result.status === "UNAUTHORIZED" && (
                          <span className="flex items-center gap-1 text-destructive font-semibold px-2 py-0.5 rounded bg-destructive/10">
                            <XCircle className="w-3.5 h-3.5" /> Unauthorized
                          </span>
                        )}
                        {result.status === "UNKNOWN" && (
                          <span className="flex items-center gap-1 text-destructive font-semibold px-2 py-0.5 rounded bg-destructive/10">
                            <XCircle className="w-3.5 h-3.5" /> Unknown
                          </span>
                        )}
                      </div>
                    </div>
                    {result.message ? (
                      <div className="text-xs text-text-secondary pt-2 border-t border-border">
                        {result.message}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center h-full text-muted-foreground"
                >
                  <ScanFace className="w-12 h-12 mb-3 text-border" />
                  <p className="text-sm font-medium">Waiting for Image</p>
                  <p className="text-xs mt-1 max-w-[220px]">Capture one face and run real attendance recognition.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
