"use client";

import { useState, useRef, useCallback } from "react";

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        {/* Record button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center transition-all
            ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-blue-600 hover:bg-blue-700"
            }
            ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {isProcessing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          ) : isRecording ? (
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
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

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing || isRecording}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center transition-all
            bg-gray-200 hover:bg-gray-300
            ${isProcessing || isRecording ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg,.aac"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      <p className="text-sm text-gray-600 text-center">
        {isProcessing
          ? "Processing..."
          : isRecording
            ? "Recording... Click to stop"
            : "Record or upload a voice memo"}
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}
    </div>
  );
}
