import { useRef, useState, useEffect } from "react";
import { Camera, Square, RefreshCcw, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function WebcamCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Ensure video plays when stream is set
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play().catch(err => {
          console.error("Error playing video:", err);
        });
      };
    }
  }, [stream]);

  const getDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !activeDeviceId) {
        setActiveDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Could not enumerate devices:", err);
    }
  };

  const startCamera = async (deviceId = activeDeviceId) => {
    setIsInitializing(true);
    setError(null);
    stopCamera();
    
    try {
      const constraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } 
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      await getDevices();
    } catch (err) {
      console.error("Error accessing camera:", err);
      let msg = "Camera access denied. Please allow permissions in your browser.";
      if (err.name === "NotReadableError") msg = "Camera is already in use by another application.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
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
    
    // Capture at video native resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    
    // Most user cameras are mirrored for preview. 
    // We'll capture as-is (non-mirrored) for record if ideal, 
    // but usually UX expects exactly what they see. 
    // Let's mirror the capture if facing user to match preview.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCapture(imageUrl);
    stopCamera();
  };

  const switchCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDeviceId = devices[nextIndex].deviceId;
    
    setActiveDeviceId(nextDeviceId);
    startCamera(nextDeviceId);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-border flex flex-col items-center justify-center shadow-inner">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror" // mirror class if available or style directly
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : error ? (
          <div className="flex flex-col items-center text-destructive p-4 text-center">
            <AlertCircle className="w-10 h-10 mb-3 opacity-80" />
            <p className="text-sm font-medium">{error}</p>
            <button 
              onClick={() => startCamera()} 
              className="mt-4 text-xs underline font-semibold text-primary"
            >
              Try Again
            </button>
          </div>
        ) : isInitializing ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary" />
            <p className="text-sm font-medium">Initializing camera...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/30 w-full h-full">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-sm font-semibold text-heading">Camera Access Required</p>
            <p className="text-xs max-w-[220px] mt-2 leading-relaxed">
              Enable your camera to enroll face data for professional AI attendance monitoring.
            </p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {!stream ? (
          <button
            type="button"
            onClick={() => startCamera()}
            disabled={isInitializing}
            className="col-span-full flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Camera className="w-4 h-4" /> 
            {isInitializing ? "Starting..." : "Active System Camera"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={captureImage}
              className="col-span-full sm:col-span-1 lg:col-span-2 flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-sm active:scale-95"
            >
              <Camera className="w-4 h-4" /> Capture Official Photo
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-muted text-heading rounded-lg text-sm font-semibold hover:bg-muted/80 transition-all active:scale-95 border border-border"
            >
              <Square className="w-4 h-4" /> Stop
            </button>
            {devices.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                className="col-span-full flex items-center justify-center gap-2 py-2 px-4 bg-secondary/10 text-secondary rounded-lg text-xs font-semibold hover:bg-secondary/20 transition-all"
              >
                <RefreshCcw className="w-3.5 h-3.5" /> Switch Device Camera
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
