"use client";

import { useRef, useState, useEffect } from "react";

type Annotation = {
  id: string;
  transcript: string;
  audioUrl: string | null;
  createdAt: string;
};

type AnnotationCardProps = {
  annotation: Annotation;
  onDelete?: (id: string) => void;
  isHighlighted?: boolean;
};

const SPEEDS = [1, 1.5, 2, 3] as const;

export function AnnotationCard({ annotation, onDelete, isHighlighted }: AnnotationCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState<number>(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [highlight, setHighlight] = useState(isHighlighted);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  const date = new Date(annotation.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const cycleSpeed = () => {
    const currentIndex = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
    const nextIndex = (currentIndex + 1) % SPEEDS.length;
    const newSpeed = SPEEDS[nextIndex];
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(annotation.id);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div
        ref={cardRef}
        id={`annotation-${annotation.id}`}
        className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border p-4 transition-all duration-500 ${
          highlight
            ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50"
            : "border-gray-200 dark:border-gray-800"
        }`}
      >
        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{annotation.transcript}</p>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</span>
            <div className="flex items-center gap-2 flex-wrap">
              {annotation.audioUrl && (
                <>
                  <button
                    onClick={cycleSpeed}
                    className="px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded transition-colors"
                  >
                    {speed}x
                  </button>
                  <audio
                    ref={audioRef}
                    src={annotation.audioUrl}
                    controls
                    className="h-10 max-w-[200px] sm:max-w-none"
                    preload="none"
                  />
                </>
              )}
              {onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
            aria-hidden
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Note?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will permanently delete this note and its audio recording.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
