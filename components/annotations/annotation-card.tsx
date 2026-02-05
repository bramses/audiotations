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

type Footnote = {
  quote: string;
  issue: string;
  searchQuery: string;
};

const SPEEDS = [1, 1.5, 2, 3] as const;

// Simple markdown renderer for links and italics
function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const italicMatch = remaining.match(/\*([^*]+)\*/);

    const linkIndex = linkMatch ? remaining.indexOf(linkMatch[0]) : -1;
    const italicIndex = italicMatch ? remaining.indexOf(italicMatch[0]) : -1;

    let firstMatch: { type: "link" | "italic"; match: RegExpMatchArray; index: number } | null = null;

    if (linkIndex !== -1 && (italicIndex === -1 || linkIndex < italicIndex)) {
      firstMatch = { type: "link", match: linkMatch!, index: linkIndex };
    } else if (italicIndex !== -1) {
      firstMatch = { type: "italic", match: italicMatch!, index: italicIndex };
    }

    if (!firstMatch) {
      parts.push(remaining);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(remaining.slice(0, firstMatch.index));
    }

    if (firstMatch.type === "link") {
      const [, linkText, url] = firstMatch.match;
      parts.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: "var(--accent-burgundy)" }}
        >
          {linkText}
        </a>
      );
    } else {
      const [, italicText] = firstMatch.match;
      parts.push(<em key={key++}>{italicText}</em>);
    }

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
  const [footnotes, setFootnotes] = useState<Footnote[] | null>(null);
  const [isGeneratingFootnotes, setIsGeneratingFootnotes] = useState(false);
  const [footnoteError, setFootnoteError] = useState<string | null>(null);

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

  const handleGenerateFootnotes = useCallback(async () => {
    setIsGeneratingFootnotes(true);
    setFootnoteError(null);
    try {
      const res = await fetch(`/api/annotations/${annotation.id}/footnotes`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate footnotes");
      }

      const data = await res.json();
      setFootnotes(Array.isArray(data.footnotes) ? data.footnotes : []);
    } catch (error) {
      console.error("Footnote generation failed:", error);
      setFootnoteError(
        error instanceof Error ? error.message : "Failed to generate footnotes"
      );
    } finally {
      setIsGeneratingFootnotes(false);
    }
  }, [annotation.id]);

  return (
    <>
      <div
        ref={cardRef}
        id={`annotation-${annotation.id}`}
        className="rounded-lg p-5 transition-all duration-500"
        style={{
          background: "var(--card)",
          border: highlight ? "2px solid var(--accent-gold)" : "1px solid var(--card-border)",
          boxShadow: highlight
            ? "0 0 20px rgba(184, 134, 11, 0.3)"
            : "0 2px 8px rgba(44, 24, 16, 0.06)",
        }}
      >
        {/* Image display */}
        {annotation.imageUrl && (
          <div className="mb-4">
            <a href={annotation.imageUrl} target="_blank" rel="noopener noreferrer">
              <Image
                src={annotation.imageUrl}
                alt="Annotation image"
                width={400}
                height={300}
                className="rounded-lg max-h-64 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                style={{ border: "1px solid var(--card-border)" }}
              />
            </a>
          </div>
        )}

        {/* Transcript with edit mode */}
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              className="w-full p-3 rounded-lg resize-none"
              style={{
                background: "var(--background)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
              }}
              rows={4}
            />
            <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
              Supports *italics* and [links](url)
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "var(--accent-gold)",
                  color: "var(--card)",
                }}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-90"
                style={{
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground-muted)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className="whitespace-pre-wrap leading-relaxed"
            style={{ color: "var(--foreground)" }}
          >
            {renderMarkdown(annotation.transcript)}
          </p>
        )}

        <div
          className="mt-4 rounded-lg p-4"
          style={{
            background: "var(--background)",
            border: "1px solid var(--card-border)",
          }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3
              className="text-sm font-semibold"
              style={{
                color: "var(--foreground)",
                fontFamily: "var(--font-playfair), Georgia, serif",
              }}
            >
              AI Footnotes
            </h3>
            <button
              onClick={handleGenerateFootnotes}
              disabled={isGeneratingFootnotes}
              className="px-3 py-1.5 text-sm rounded transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: "var(--accent-gold)",
                color: "var(--card)",
              }}
            >
              {isGeneratingFootnotes ? "Generating..." : "Add AI Footnotes"}
            </button>
          </div>

          {footnoteError && (
            <p className="text-xs mt-2" style={{ color: "var(--accent-burgundy)" }}>
              {footnoteError}
            </p>
          )}

          {footnotes && (
            <div className="mt-3">
              {footnotes.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                  No possible inaccuracies found.
                </p>
              ) : (
                <ol className="list-decimal ml-4 space-y-2 text-sm">
                  {footnotes.map((footnote, index) => {
                    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
                      footnote.searchQuery
                    )}`;
                    return (
                      <li key={`${footnote.quote}-${index}`}>
                        <p style={{ color: "var(--foreground)" }}>
                          <em>&ldquo;{footnote.quote}&rdquo;</em> — {footnote.issue}{" "}
                          <a
                            href={searchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            style={{ color: "var(--accent-burgundy)" }}
                          >
                            Google it
                          </a>
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>

        {/* Metadata badges */}
        {(annotation.pageNumber || annotation.location) && (
          <div className="mt-4 flex items-center gap-3 text-xs">
            {annotation.pageNumber && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded"
                style={{
                  background: "var(--brown-100)",
                  color: "var(--brown-600)",
                  border: "1px solid var(--brown-200)",
                }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Page {annotation.pageNumber}
              </span>
            )}
            {annotation.location && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded"
                style={{
                  background: "var(--brown-100)",
                  color: "var(--brown-600)",
                  border: "1px solid var(--brown-200)",
                }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Location {annotation.location}
              </span>
            )}
          </div>
        )}

        <div
          className="mt-4 pt-4 border-t"
          style={{ borderColor: "var(--card-border)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs" style={{ color: "var(--foreground-muted)" }}>
              {formattedDate}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {annotation.audioUrl && (
                <>
                  <button
                    onClick={cycleSpeed}
                    className="px-3 py-1.5 text-sm font-medium rounded transition-colors"
                    style={{
                      background: "var(--brown-100)",
                      color: "var(--brown-600)",
                    }}
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
                  className="px-3 py-1.5 text-sm rounded transition-opacity hover:opacity-70"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  Edit
                </button>
              )}
              {onDelete && !isEditing && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 text-sm rounded transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent-burgundy)" }}
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
            className="absolute inset-0"
            style={{ background: "rgba(26, 15, 8, 0.6)" }}
            onClick={() => setShowDeleteConfirm(false)}
            aria-hidden
          />
          <div
            className="relative rounded-lg shadow-xl w-full max-w-sm p-6"
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
            }}
          >
            <h3
              className="text-lg font-semibold mb-2"
              style={{
                color: "var(--foreground)",
                fontFamily: "var(--font-playfair), Georgia, serif",
              }}
            >
              Delete Note?
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--foreground-muted)" }}>
              This will permanently delete this note and its recording.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
                style={{
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground-muted)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
                style={{
                  background: "var(--accent-burgundy)",
                  color: "var(--card)",
                }}
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
