"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

// FaceDetector API types
interface FaceDetectorOptions {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface DetectedFace {
  boundingBox: BoundingBox;
}

interface FaceDetector {
  detect(image: HTMLVideoElement): Promise<DetectedFace[]>;
}

// Minimal typings for the subset of face-api.js we use
interface FaceApiBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceApiDetection {
  box: FaceApiBox;
}

interface FaceApiTinyFaceDetectorNet {
  loadFromUri(path: string): Promise<void>;
}

interface FaceApiNets {
  tinyFaceDetector: FaceApiTinyFaceDetectorNet;
}

interface FaceApi {
  nets: FaceApiNets;
  TinyFaceDetectorOptions: new (opts: { inputSize?: number; scoreThreshold?: number }) => unknown;
  detectSingleFace(
    input: HTMLVideoElement,
    options: unknown
  ): Promise<FaceApiDetection | null>;
}

declare global {
  interface Window {
    FaceDetector?: {
      new(options?: FaceDetectorOptions): FaceDetector;
    };
  }
}

type Props = {
  onCapture: (file: File) => void;
  onError?: (message: string) => void;
  facingMode?: "user" | "environment";
};

export default function LivenessCapture({
  onCapture,
  onError,
  facingMode = "user",
}: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const overlayRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const detectorRef = React.useRef<FaceDetector | null>(null);
  const faceapiRef = React.useRef<FaceApi | null>(null);
  const useFaceApiRef = React.useRef<boolean>(false);
  const phaseRef = React.useRef<"idle" | "left" | "right" | "center" | "captured">("idle");

  const [ready, setReady] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [supported, setSupported] = React.useState<boolean>(false);
  const [phase, setPhase] = React.useState<
    "idle" | "left" | "right" | "center" | "captured"
  >("idle");

  // Keep phaseRef in sync with phase state
  React.useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState({
    left: false,
    right: false,
    center: false,
  });
  const [msg, setMsg] = React.useState<string>("");
  const [videoReady, setVideoReady] = React.useState(false);
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const countdownTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const capturedBlobRef = React.useRef<Blob | null>(null);

  // Debug log removed: console.log(videoReady);

  React.useEffect(() => {
    const has = typeof window.FaceDetector !== "undefined";
    setSupported(has);
  }, []);

  const startCamera = async () => {
    try {
      setMsg("");
      setVideoReady(false);
      setLoading(true);
      
      // Check if mediaDevices API is available (requires HTTPS on mobile)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access requires HTTPS. Please ensure you're using a secure connection.");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element not available");
      }

      video.srcObject = stream;
      // Ensure properties and attributes for widest autoplay compatibility
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.setAttribute("autoplay", "true");


      // Wait for video to actually start playing and have dimensions
      await new Promise<void>((resolve, reject) => {
        const readyCheck = () => {
          if (video.videoWidth && video.videoHeight) {
            cleanup();
            resolve();
          }
        };

        const onLoaded = () => {
          readyCheck();
        };

        const onCanPlay = () => {
          readyCheck();
        };

        const timer = setTimeout(() => {
          console.warn("[LivenessCapture] Video ready timeout - dimensions:", video.videoWidth, video.videoHeight);
          cleanup();
          if (video.videoWidth && video.videoHeight) {
            resolve();
          } else {
            reject(new Error("Video dimensions not available after timeout"));
          }
        }, 3000);

        const cleanup = () => {
          clearTimeout(timer);
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("canplay", onCanPlay);
        };

        if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
          resolve();
        } else {
          video.addEventListener("loadedmetadata", onLoaded);
          video.addEventListener("canplay", onCanPlay);

          // Try to play the video
          video.play().then(() => {
            readyCheck();
          }).catch((playError) => {
            console.error("[LivenessCapture] Video play() failed:", playError);
            // Don't reject - some browsers auto-play despite the error
          });
        }
      });

      setVideoReady(true);
      setReady(true);
      setLoading(false);

      if (supported && window.FaceDetector) {
        try {
          detectorRef.current = new window.FaceDetector({
            fastMode: true,
            maxDetectedFaces: 1,
          });
          setPhase("left");
          loop();
        } catch (err) {
          console.warn("[LivenessCapture] FaceDetector init failed:", err);
          detectorRef.current = null;
          // Try face-api.js fallback
          try {
            const mod = await import("face-api.js");
            const faceapi = mod.default ?? mod;
            faceapiRef.current = faceapi;
            await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
            useFaceApiRef.current = true;
            setPhase("left");
            loop();
          } catch (e) {
            console.warn("[LivenessCapture] face-api.js fallback failed:", e);
            setPhase("center");
          }
        }
      } else {
        // No native FaceDetector, try face-api.js

        const mod = await import("face-api.js");
        const faceapi = mod.default ?? mod;
        faceapiRef.current = faceapi;
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        useFaceApiRef.current = true;
        setPhase("left");
        loop();
      }
    } catch (error) {
      console.error("[LivenessCapture] startCamera error:", error);
      const message = error instanceof Error ? error.message : "Camera error";
      if (onError) onError(message);
      setMsg("Unable to access camera: " + message);
      setLoading(false);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    // Clear video srcObject to avoid stale stream on retake
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setReady(false);
    setVideoReady(false);
    setCountdown(null);
  };

  const reset = React.useCallback(() => {
    setPhase("idle");
    setProgress({ left: false, right: false, center: false });
    setPreview((prev) => {
      // Revoke old preview URL to avoid memory leaks
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setMsg("");
    setCountdown(null);
    capturedBlobRef.current = null; // Clear any pre-captured frame
    stopCamera();
  }, []);

  const drawOverlay = (faceBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    overlay.width = w;
    overlay.height = h;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(59,130,246,0.9)";
    ctx.lineWidth = 3;
    const cx = w / 2;
    const targetW = Math.min(440, Math.round(w * 0.34));
    const targetH = Math.min(560, Math.round(h * 0.44));
    const targetX = cx - targetW / 2;
    const targetY = h * 0.22;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(targetX, targetY, targetW, targetH);
    ctx.setLineDash([]);
    if (faceBox) {
      ctx.strokeStyle = "rgba(16,185,129,0.9)";
      ctx.strokeRect(faceBox.x, faceBox.y, faceBox.width, faceBox.height);
    }
  };

  // Pre-capture a frame immediately (called when entering center phase while video is known to be working)
  const preCaptureFrame = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        resolve(null);
        return;
      }
      
      const track = streamRef.current?.getVideoTracks?.()[0];
      const settings = track?.getSettings?.() || {};
      const w = (video.videoWidth || (settings as { width?: number }).width || video.clientWidth || 1280) as number;
      const h = (video.videoHeight || (settings as { height?: number }).height || Math.round((w * 9) / 16)) as number;
      
      if (w <= 0 || h <= 0) {
        resolve(null);
        return;
      }
      
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(null);
        return;
      }
      
      ctx.drawImage(video, 0, 0, w, h);
      
      // Verify not black
      try {
        const sampleData = ctx.getImageData(Math.floor(w / 4), Math.floor(h / 4), Math.floor(w / 2), Math.floor(h / 2));
        const data = sampleData.data;
        let nonBlackPixels = 0;
        for (let i = 0; i < data.length; i += 16) {
          if (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10) {
            nonBlackPixels++;
          }
        }
        const totalSampled = Math.floor(data.length / 16);
        const nonBlackRatio = nonBlackPixels / totalSampled;
        if (nonBlackRatio < 0.1) {
          // Frame is too dark, skip it
          resolve(null);
          return;
        }
      } catch (err) {
        console.warn('[LivenessCapture] Could not validate pre-capture:', err);
      }
      
      if (canvas.toBlob) {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
      } else {
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
          const arr = dataUrl.split(",");
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          resolve(new Blob([u8arr], { type: "image/jpeg" }));
        } catch {
          resolve(null);
        }
      }
    });
  };

  // Finalize capture - use pre-captured frame
  const finalizeCapture = async () => {
    const blob = capturedBlobRef.current;
    if (!blob) {
      console.error('[LivenessCapture] No pre-captured frame available');
      if (onError) onError('Capture failed. Please try again.');
      reset();
      return;
    }
    
    const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
    setPreview(URL.createObjectURL(blob));
    onCapture(file);
    setPhase("captured");
    capturedBlobRef.current = null;
    stopCamera();
  };

  // Legacy capture function (fallback, tries to capture now)
  const capture = async () => {
    // If we have a pre-captured frame, use it
    if (capturedBlobRef.current) {
      await finalizeCapture();
      return;
    }
    
    // Otherwise try to capture now (fallback)
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    const blob = await preCaptureFrame();
    if (!blob) {
      if (onError) onError('Captured image was blank. Please ensure good lighting and try again.');
      reset();
      return;
    }
    
    const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
    setPreview(URL.createObjectURL(blob));
    onCapture(file);
    setPhase("captured");
    stopCamera();
  };

  const loop = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const detector = detectorRef.current;
    const tick = async () => {
      try {
        // Use phaseRef to get current phase value
        const currentPhase = phaseRef.current;

        let faceBox:
          | { x: number; y: number; width: number; height: number }
          | undefined;
        if (detector && video.readyState >= 2) {
          const faces = await detector.detect(video);
          if (faces && faces[0] && faces[0].boundingBox) {
            const b = faces[0].boundingBox as DOMRectReadOnly;
            faceBox = { x: b.x, y: b.y, width: b.width, height: b.height };
            const cx = (b.x + b.width / 2) / (video.videoWidth || 1);
            // When facingMode is 'user', video is mirrored, so thresholds are inverted
            // Made more lenient: 0.55 instead of 0.62, 0.45 instead of 0.38
            const leftThreshold = facingMode === 'user' ? cx > 0.50 : cx < 0.42;
            const rightThreshold = facingMode === 'user' ? cx < 0.42 : cx > 0.50;

            if (currentPhase === "left" && leftThreshold) {
              setProgress((p) => ({ ...p, left: true }));
              setPhase("right");
              phaseRef.current = "right";
            } else if (currentPhase === "right" && rightThreshold) {
              setProgress((p) => ({ ...p, right: true }));
              setPhase("center");
              phaseRef.current = "center";
              // Start countdown - capture happens continuously during center phase
              setCountdown(5);
              let count = 5;
              countdownTimerRef.current = setInterval(() => {
                count--;
                if (count > 0) {
                  setCountdown(count);
                } else {
                  if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                  countdownTimerRef.current = null;
                  setCountdown(null);
                  setProgress((p) => ({ ...p, center: true }));
                  finalizeCapture();
                }
              }, 1000);
            } else if (currentPhase === "center") {
              // Continuously update captured frame during countdown while face is centered
              const isCentered = cx > 0.4 && cx < 0.6;
              if (isCentered) {
                preCaptureFrame().then((blob) => {
                  if (blob) {
                    capturedBlobRef.current = blob;
                  }
                });
              }
            }
          }
        } else if (useFaceApiRef.current && faceapiRef.current && video.readyState >= 2) {
          const faceapi = faceapiRef.current;
          const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 256,
            scoreThreshold: 0.5,
          });
          const detection = await faceapi.detectSingleFace(video, options);
          if (detection && detection.box) {
            const b = detection.box;
            faceBox = { x: b.x, y: b.y, width: b.width, height: b.height };
            const cx = (b.x + b.width / 2) / (video.videoWidth || 1);
            // When facingMode is 'user', video is mirrored, so thresholds are inverted
            // Made more lenient: 0.50 instead of 0.62, 0.42 instead of 0.38
            const leftThreshold = facingMode === 'user' ? cx > 0.50 : cx < 0.42;
            const rightThreshold = facingMode === 'user' ? cx < 0.42 : cx > 0.50;

            if (currentPhase === "left" && leftThreshold) {
              setProgress((p) => ({ ...p, left: true }));
              setPhase("right");
              phaseRef.current = "right";
            } else if (currentPhase === "right" && rightThreshold) {
              setProgress((p) => ({ ...p, right: true }));
              setPhase("center");
              phaseRef.current = "center";
              // Start countdown - capture happens continuously during center phase
              setCountdown(5);
              let count = 5;
              countdownTimerRef.current = setInterval(() => {
                count--;
                if (count > 0) {
                  setCountdown(count);
                } else {
                  if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                  countdownTimerRef.current = null;
                  setCountdown(null);
                  setProgress((p) => ({ ...p, center: true }));
                  finalizeCapture();
                }
              }, 1000);
            } else if (currentPhase === "center") {
              // Continuously update captured frame during countdown while face is centered
              const isCentered = cx > 0.4 && cx < 0.6;
              if (isCentered) {
                preCaptureFrame().then((blob) => {
                  if (blob) {
                    capturedBlobRef.current = blob;
                  }
                });
              }
            }
          }
        }
        drawOverlay(faceBox);
      } catch {
        // Ignore detection errors
      }
      // Only continue loop if stream is active and we haven't captured yet
      if (streamRef.current && streamRef.current.active && phaseRef.current !== "captured") {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle visibility change - abort countdown and reset if page becomes hidden
  // This prevents capturing a black frame when the app goes to background on mobile
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && ready && phase !== "captured") {
        console.warn('[LivenessCapture] Page hidden during capture, resetting');
        // Clear any active countdown
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setCountdown(null);
        // Reset to allow user to restart
        reset();
        setMsg("Camera was interrupted. Please try again.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [ready, phase, reset]);

  React.useEffect(() => {
    if (phase === "left") setMsg("Turn your head to the left");
    else if (phase === "right") setMsg("Turn your head to the right");
    else if (phase === "center") {
      if (countdown !== null) {
        setMsg(`Get ready... ${countdown}`);
      } else {
        setMsg("Center your face and hold steady");
      }
    }
    else if (phase === "captured") setMsg("Photo captured");
    else setMsg("");
  }, [phase, countdown]);

  return (
    <div className="w-full">
      {/* Always render video elements so refs are available */}
      <div className="relative w-full rounded-md overflow-hidden bg-black aspect-[3/4] sm:aspect-video" style={{ display: ready ? 'block' : 'none' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        {/* Large countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-9xl font-bold text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
              {countdown}
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white text-sm">
            <span
              className={progress.left ? "text-green-400" : "text-white/80"}
            >
              Left
            </span>
            <span className="opacity-60">•</span>
            <span
              className={progress.right ? "text-green-400" : "text-white/80"}
            >
              Right
            </span>
            <span className="opacity-60">•</span>
            <span
              className={progress.center ? "text-green-400" : "text-white/80"}
            >
              Center
            </span>
          </div>
          <div className="text-white/90 text-sm">{msg}</div>
        </div>
      </div>

      {!ready && !preview && (
        <div className="flex flex-col items-center gap-3">
          <Button onClick={startCamera} type="button" className="w-full" disabled={loading}>
            {loading ? "Starting Camera..." : "Start Camera"}
          </Button>
          {msg && (
            <div className="text-xs text-red-600 text-center">
              {msg}
            </div>
          )}
        </div>
      )}

      {!supported && ready && (
        <div className="flex items-center justify-between mt-2">
          <Button type="button" onClick={capture} variant="secondary" size="sm" disabled={!ready} aria-disabled={!ready}>
            Capture
          </Button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {preview && (
        <div className="mt-3">
          <div className="relative w-full aspect-[3/4] sm:aspect-video">
            <Image src={preview} alt="Selfie preview" fill className="rounded-md object-cover" />
          </div>
          <div className="flex gap-2 mt-2">
            <Button type="button" variant="outline" onClick={reset} className="flex-1">
              Retake
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
