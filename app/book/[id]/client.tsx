"use client";

import { useState, useCallback, Suspense } from "react";
import { AudioRecorder } from "@/components/annotations/audio-recorder";
import { AnnotationList } from "@/components/annotations/annotation-list";

type BookPageClientProps = {
  bookId: string;
};

export function BookPageClient({ bookId }: BookPageClientProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [textNote, setTextNote] = useState("");
  const [isSavingText, setIsSavingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  const handleRecordingComplete = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleAddTextNote = useCallback(async () => {
    if (!textNote.trim()) {
      setTextError("Please enter a note.");
      return;
    }

    setIsSavingText(true);
    setTextError(null);
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          transcript: textNote.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add note");
      }

      setTextNote("");
      handleRecordingComplete();
    } catch (error) {
      console.error("Failed to add text note:", error);
      setTextError(
        error instanceof Error ? error.message : "Failed to add note"
      );
    } finally {
      setIsSavingText(false);
    }
  }, [bookId, handleRecordingComplete, textNote]);

  return (
    <div className="space-y-8">
      <section
        className="rounded-xl p-8"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        <h2
          className="text-lg font-semibold text-center mb-6"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-playfair), Georgia, serif",
          }}
        >
          Record a Note
        </h2>
        <AudioRecorder
          bookId={bookId}
          onRecordingComplete={handleRecordingComplete}
        />
        <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--card-border)" }}>
          <h3
            className="text-sm font-semibold mb-3"
            style={{
              color: "var(--foreground)",
              fontFamily: "var(--font-playfair), Georgia, serif",
            }}
          >
            Add a Text Note
          </h3>
          <div className="space-y-3">
            <textarea
              value={textNote}
              onChange={(e) => setTextNote(e.target.value)}
              className="w-full p-3 rounded-lg resize-none"
              style={{
                background: "var(--background)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
              }}
              rows={4}
              placeholder="Type your note..."
            />
            {textError && (
              <p className="text-xs" style={{ color: "var(--accent-burgundy)" }}>
                {textError}
              </p>
            )}
            <button
              onClick={handleAddTextNote}
              disabled={isSavingText}
              className="px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: "var(--accent-gold)",
                color: "var(--card)",
              }}
            >
              {isSavingText ? "Adding..." : "Add to Notes"}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2
          className="text-lg font-semibold mb-4"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-playfair), Georgia, serif",
          }}
        >
          Your Notes
        </h2>
        <Suspense fallback={
          <div className="flex justify-center py-8">
            <div
              className="animate-spin rounded-full h-6 w-6 border-b-2"
              style={{ borderColor: "var(--accent-gold)" }}
            />
          </div>
        }>
          <AnnotationList bookId={bookId} refreshTrigger={refreshTrigger} />
        </Suspense>
      </section>
    </div>
  );
}
