"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";

type Annotation = {
  id: string;
  transcript: string;
  audioUrl: string | null;
  imageUrl: string | null;
  pageNumber: string | null;
  location: string | null;
  createdAt: string;
};

type AnnotationCardProps = {
  annotation: Annotation;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, transcript: string) => void;
  isHighlighted?: boolean;
};

const SPEEDS = [1, 1.5, 2, 3] as const;

// Simple markdown renderer for links and italics
function renderMarkdown(text: string): React.ReactNode {
  // Split by markdown patterns while preserving them
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for markdown link: [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    // Check for italics: *text*
    const italicMatch = remaining.match(/\*([^*]+)\*/);

    // Find which comes first
    const linkIndex = linkMatch ? remaining.indexOf(linkMatch[0]) : -1;
    const italicIndex = italicMatch ? remaining.indexOf(italicMatch[0]) : -1;

    let firstMatch: { type: "link" | "italic"; match: RegExpMatchArray; index: number } | null = null;

    if (linkIndex !== -1 && (italicIndex === -1 || linkIndex < italicIndex)) {
      firstMatch = { type: "link", match: linkMatch!, index: linkIndex };
    } else if (italicIndex !== -1) {
      firstMatch = { type: "italic", match: italicMatch!, index: italicIndex };
    }

    if (!firstMatch) {
      // No more markdown, add remaining text
      parts.push(remaining);
      break;
    }

    // Add text before the match
    if (firstMatch.index > 0) {
      parts.push(remaining.slice(0, firstMatch.index));
    }

    // Add the formatted element
    if (firstMatch.type === "link") {
      const [, linkText, url] = firstMatch.match;
      parts.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {linkText}
        </a>
      );
    } else {
      const [, italicText] = firstMatch.match;
      parts.push(<em key={key++}>{italicText}</em>);
    }

    // Continue with remaining text
    remaining = remaining.slice(firstMatch.index + firstMatch.match[0].length);
  }

  return parts;
}

export function AnnotationCard({ annotation, onDelete, onUpdate, isHighlighted }: AnnotationCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [speed, setSpeed] = useState<number>(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [highlight, setHighlight] = useState(isHighlighted);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(annotation.transcript);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

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

  const handleSave = useCallback(async () => {
    if (!editedTranscript.trim() || editedTranscript === annotation.transcript) {
      setIsEditing(false);
      setEditedTranscript(annotation.transcript);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/annotations/${annotation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: editedTranscript }),
      });

      if (res.ok) {
        if (onUpdate) {
          onUpdate(annotation.id, editedTranscript);
        }
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [annotation.id, annotation.transcript, editedTranscript, onUpdate]);

  const handleCancel = () => {
    setEditedTranscript(annotation.transcript);
    setIsEditing(false);
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
        {/* Image display */}
        {annotation.imageUrl && (
          <div className="mb-3">
            <a href={annotation.imageUrl} target="_blank" rel="noopener noreferrer">
              <Image
                src={annotation.imageUrl}
                alt="Annotation image"
                width={400}
                height={300}
                className="rounded-lg max-h-64 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
              />
            </a>
          </div>
        )}

        {/* Transcript with edit mode */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supports *italics* and [links](url)
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {renderMarkdown(annotation.transcript)}
          </p>
        )}

        {/* Metadata */}
        {(annotation.pageNumber || annotation.location) && (
          <div className="mt-3 flex items-center gap-3 text-xs">
            {annotation.pageNumber && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Page {annotation.pageNumber}
              </span>
            )}
            {annotation.location && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Location {annotation.location}
              </span>
            )}
          </div>
        )}

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
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && !isEditing && (
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
              This will permanently delete this note and its recording.
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
