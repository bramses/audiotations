"use client";

import { useState, useCallback, Suspense } from "react";
import { AudioRecorder } from "@/components/annotations/audio-recorder";
import { AnnotationList } from "@/components/annotations/annotation-list";

type BookPageClientProps = {
  bookId: string;
};

export function BookPageClient({ bookId }: BookPageClientProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRecordingComplete = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

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
