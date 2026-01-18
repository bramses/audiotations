"use client";

import { useRef, useState } from "react";

type Annotation = {
  id: string;
  transcript: string;
  audioUrl: string | null;
  createdAt: string;
};

type AnnotationCardProps = {
  annotation: Annotation;
  onDelete?: (id: string) => void;
};

const SPEEDS = [1, 1.5, 2, 3] as const;

export function AnnotationCard({ annotation, onDelete }: AnnotationCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState<number>(1);

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

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
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
                onClick={() => onDelete(annotation.id)}
                className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
