"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, Loader2, Sparkles, AlertCircle } from "lucide-react";
import TranscriptTextArea from "./TranscriptTextArea";
import RecordingBar from "./RecordingBar";
import TaskReviewModal from "./TaskReviewModal";
import { ReviewTask } from "./EditableTaskCard";
import { toast } from "sonner";

interface AIQuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
  date: Date;
}

export default function AIQuickCaptureModal({ open, onClose, date }: AIQuickCaptureModalProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [extractedTasks, setExtractedTasks] = useState<ReviewTask[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Audio References
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  
  const cancelRequestRef = useRef(false);

  // --- THE BULLETPROOF MOBILE SCROLL LOCK ---
  useEffect(() => {
    if (open) {
      setText("");
      setErrorMsg(null);
      setIsRecording(false);
      setIsTranscribing(false);
      setExtractedTasks([]);
      setShowReview(false);
      setIsExtracting(false);

      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      cleanupMedia();
      
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "auto";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      cleanupMedia();
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "auto";
    };
  }, [open]);

  // Audio Recording Cleanup
  const cleanupMedia = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close();
    }
    setStream(null);
    setAudioContext(null);
    setAnalyserNode(null);
    setMediaRecorder(null);
  };

  // Start Recording Logic
  const startRecording = async () => {
    setErrorMsg(null);
    cancelRequestRef.current = false;

    try {
      // Request mic permission
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize Web Audio API pipeline for Waveform Visualizer
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; // Small size is optimal for simple waveform canvas
      
      const source = ctx.createMediaStreamSource(audioStream);
      source.connect(analyser);

      // Initialize MediaRecorder
      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4" };
      }

      const recorder = new MediaRecorder(audioStream, options);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(chunks, { type: mimeType });

        if (cancelRequestRef.current) {
          // Recording was discarded
          cancelRequestRef.current = false;
          return;
        }

        // Upload and transcribe
        await handleTranscribe(audioBlob, mimeType);
      };

      // Set references and start
      setStream(audioStream);
      setAudioContext(ctx);
      setAnalyserNode(analyser);
      setMediaRecorder(recorder);
      
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Microphone permission denied. Please allow microphone access in your settings.");
      } else {
        setErrorMsg("Could not start microphone recording. Make sure a microphone is connected.");
      }
    }
  };

  // Stop & Transcribe Recording (Checkmark tapped)
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      cancelRequestRef.current = false;
      mediaRecorder.stop();
    }
    cleanupMedia();
    setIsRecording(false);
  };

  // Cancel & Discard Recording (Cross tapped)
  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      cancelRequestRef.current = true;
      mediaRecorder.stop();
    }
    cleanupMedia();
    setIsRecording(false);
  };

  // Transcription Upload Handler
  const handleTranscribe = async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setErrorMsg(null);

    try {
      const mimeBase = mimeType.split(";")[0];
      const extension = mimeBase.split("/")[1] || "webm";
      const file = new File([audioBlob], `recording.${extension}`, { type: mimeType });

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to transcribe audio.");
      }

      const data = await res.json();
      const transcribedText = data.text?.trim() || "";

      if (transcribedText) {
        setText((prev) => {
          const currentText = prev.trim();
          const separator = currentText ? "\n" : "";
          return `${currentText}${separator}${transcribedText}`;
        });
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setErrorMsg(err.message || "Something went wrong while processing your audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Call Gemini extraction API to convert natural speech/text to JSON tasks
  const handleGenerateTasks = async () => {
    if (!text.trim()) return;
    setIsExtracting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/task/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to extract tasks");
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Couldn't understand your request. Please edit your text and try again.");
      }

      const parsed: ReviewTask[] = data.map((t: any, idx: number) => ({
        id: `ext_${Date.now()}_${idx}`,
        title: t.title || "Untitled Task",
        time: t.time || null,
        category: "No Category",
      }));

      setExtractedTasks(parsed);
      setShowReview(true);
    } catch (err: any) {
      console.error("AI extraction error:", err);
      setErrorMsg(err.message || "Failed to process text with AI. Please try again.");
      toast.error(err.message || "Failed to parse tasks. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => {
              if (!isRecording && !isTranscribing) onClose();
            }}
            className="fixed inset-0 bg-black/40 z-[9990] max-w-md mx-auto w-full"
          />

          {/* Fullscreen bottom sheet/modal */}
          <motion.div
            key="modal"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.95 }}
            className="fixed inset-x-0 bottom-0 top-12 mx-auto max-w-md w-full bg-white rounded-t-[32px] shadow-[0_-12px_40px_rgba(91,33,182,0.15)] flex flex-col z-[9995] font-manrope overflow-hidden"
          >
            {/* Top drag handle indicator */}
            <div className="w-10 h-1 bg-purple-100 rounded-full mx-auto mt-3 mb-5 shrink-0" />

            {/* Content body */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col">
              {/* Header */}
              <div className="mb-6 shrink-0">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Sparkles className="w-5 h-5 fill-purple-100 animate-pulse" />
                  <span className="text-[11px] font-extrabold uppercase tracking-widest">
                    AI Task Capture
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#3b0764] leading-tight">
                  Quick Capture
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Type or speak everything you need to do today.
                </p>
              </div>

              {/* Text Area (Source of Truth) */}
              <div className="h-[220px] flex flex-col mb-6 overflow-hidden shrink-0">
                <TranscriptTextArea
                  value={text}
                  onChange={setText}
                  disabled={isTranscribing || isExtracting}
                />
              </div>

              {/* Recording section */}
              <div className="h-20 flex items-center justify-center shrink-0 mb-4">
                {isTranscribing || isExtracting ? (
                  <div className="flex flex-col items-center gap-2 text-purple-600">
                    <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
                    <span className="text-xs font-semibold animate-pulse">
                      {isTranscribing ? "Transcribing audio..." : "AI generating tasks..."}
                    </span>
                  </div>
                ) : isRecording ? (
                  <RecordingBar
                    analyser={analyserNode}
                    isRecording={isRecording}
                    onCancel={cancelRecording}
                    onDone={stopRecording}
                  />
                ) : (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={startRecording}
                    className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-purple-100 hover:bg-purple-200/70 text-purple-700 font-semibold border-none cursor-pointer shadow-sm shadow-purple-500/5 select-none transition-colors duration-200"
                  >
                    <Mic className="w-5 h-5 text-purple-600 animate-pulse" />
                    Start Recording
                  </motion.button>
                )}
              </div>

              {/* Error messages */}
              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-red-700 text-xs shrink-0 mb-4 leading-normal">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions Footer */}
            <div className="border-t border-slate-100 bg-slate-50/75 p-5 px-6 flex items-center justify-between gap-4 shrink-0 pb-[calc(env(safe-area-inset-bottom,24px)+20px)]">
              <button
                type="button"
                onClick={onClose}
                disabled={isTranscribing || isExtracting}
                className="flex-1 py-3.5 px-4 text-center rounded-2xl text-slate-600 hover:text-slate-800 font-semibold text-sm bg-slate-200/60 hover:bg-slate-200 transition-all border-none cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleGenerateTasks}
                disabled={isTranscribing || isExtracting || !text.trim()}
                className={`flex-1 py-3.5 px-4 text-center rounded-2xl font-bold text-sm border-none transition-all shadow-sm flex items-center justify-center gap-2 ${
                  text.trim() && !isTranscribing && !isExtracting
                    ? "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200/50 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Generating...
                  </>
                ) : (
                  "Generate Tasks"
                )}
              </button>
            </div>
          </motion.div>

          <TaskReviewModal
            open={showReview}
            initialTasks={extractedTasks}
            onClose={() => setShowReview(false)}
            onSuccess={() => {
              setShowReview(false);
              onClose(); // close the capture screen too
            }}
            date={date}
          />
        </>
      )}
    </AnimatePresence>
  );
}
