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
      <section className="bg-gray-100 dark:bg-gray-800 rounded-xl p-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-6">
          Record a Note
        </h2>
        <AudioRecorder
          bookId={bookId}
          onRecordingComplete={handleRecordingComplete}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Notes</h2>
        <Suspense fallback={
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100" />
          </div>
        }>
          <AnnotationList bookId={bookId} refreshTrigger={refreshTrigger} />
        </Suspense>
      </section>
    </div>
  );
}
