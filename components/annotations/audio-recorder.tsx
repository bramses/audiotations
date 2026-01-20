"use client";

import { useState, useRef, useCallback } from "react";
import { getPreferredMicId } from "@/components/settings/mic-settings";

type AudioRecorderProps = {
  bookId: string;
  onRecordingComplete: () => void;
};

export function AudioRecorder({
  bookId,
  onRecordingComplete,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const processAudio = useCallback(
    async (audioBlob: Blob, fileName: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, fileName);
        formData.append("bookId", bookId);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to process recording");
        }

        onRecordingComplete();
      } catch (err) {
        console.error("Error processing recording:", err);
        setError(
          err instanceof Error ? err.message : "Failed to process recording"
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [bookId, onRecordingComplete]
  );

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Get preferred microphone
      const preferredMicId = getPreferredMicId();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: preferredMicId ? { deviceId: { exact: preferredMicId } } : true,
      });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob, "recording.webm");
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Could not access microphone. Please check permissions.");
    }
  }, [processAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Remove the onstop handler so it doesn't process the audio
      mediaRecorderRef.current.onstop = null;
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current.stop();
      chunksRef.current = [];
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so same file can be selected again
      e.target.value = "";

      await processAudio(file, file.name);
    },
    [processAudio]
  );

  const compressImage = useCallback(async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Max dimensions (keeps aspect ratio)
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        let { width, height } = img;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          "image/jpeg",
          0.85 // Quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so same file can be selected again
      e.target.value = "";

      setIsProcessing(true);
      setError(null);

      try {
        // Compress large images
        let imageToUpload: Blob = file;
        if (file.size > 1024 * 1024) { // If larger than 1MB
          imageToUpload = await compressImage(file);
        }

        const formData = new FormData();
        formData.append("image", imageToUpload, file.name.replace(/\.[^.]+$/, ".jpg"));
        formData.append("bookId", bookId);

        const res = await fetch("/api/transcribe-image", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Request too large or server error" }));
          throw new Error(data.error || "Failed to process image");
        }

        onRecordingComplete();
      } catch (err) {
        console.error("Error processing image:", err);
        setError(
          err instanceof Error ? err.message : "Failed to process image"
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [bookId, onRecordingComplete, compressImage]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        {isRecording ? (
          <>
            {/* Cancel button */}
            <button
              onClick={cancelRecording}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Stop/Save button */}
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full flex items-center justify-center transition-all bg-red-500 hover:bg-red-600 animate-pulse"
            >
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          </>
        ) : (
          <>
            {/* Record button */}
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className={`
                w-20 h-20 rounded-full flex items-center justify-center transition-all
                bg-blue-600 hover:bg-blue-700
                ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              ) : (
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              )}
            </button>

            {/* Audio Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-all
                bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
              `}
              title="Upload audio"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </button>

            {/* Image Upload button */}
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={isProcessing}
              className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-all
                bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
              `}
              title="Upload image"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg,.aac"
          onChange={handleFileUpload}
          className="hidden"
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.heic"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        {isProcessing
          ? "Processing..."
          : isRecording
            ? "Recording... Stop to save, X to cancel"
            : "Record, upload audio, or upload image"}
      </p>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-3 py-2 rounded">
          {error}
        </p>
      )}
    </div>
  );
}
