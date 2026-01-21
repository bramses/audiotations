"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

type FeedItem = {
  id: string;
  transcript: string;
  audioUrl: string | null;
  imageUrl: string | null;
  pageNumber: string | null;
  location: string | null;
  createdAt: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
};

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
          className="text-blue-600 dark:text-blue-400 hover:underline"
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

export function FeedList() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [seed, setSeed] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async (currentOffset: number, currentSeed: string | null) => {
    const isInitial = currentOffset === 0;
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        offset: currentOffset.toString(),
        limit: "10",
      });
      if (currentSeed) {
        params.set("seed", currentSeed);
      }

      const res = await fetch(`/api/feed?${params}`);
      if (res.ok) {
        const data = await res.json();

        if (isInitial) {
          setItems(data.items);
          setSeed(data.seed);
        } else {
          setItems((prev) => [...prev, ...data.items]);
        }

        setHasMore(data.hasMore);
        if (data.hasMore) {
          setOffset(data.nextOffset);
        }
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchItems(0, null);
  }, [fetchItems]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchItems(offset, seed);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, loadingMore, hasMore, offset, seed, fetchItems]);

  const refreshFeed = () => {
    setItems([]);
    setOffset(0);
    setSeed(null);
    setHasMore(true);
    fetchItems(0, null);
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400 py-12">
        No notes yet. Start recording some annotations!
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={refreshFeed}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Shuffle
        </button>
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
        >
          {/* Image */}
          {item.imageUrl && (
            <div className="mb-3">
              <a href={item.imageUrl} target="_blank" rel="noopener noreferrer">
                <Image
                  src={item.imageUrl}
                  alt="Annotation image"
                  width={400}
                  height={300}
                  className="rounded-lg max-h-64 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            </div>
          )}

          {/* Transcript */}
          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {renderMarkdown(item.transcript)}
          </p>

          {/* Metadata badges */}
          {(item.pageNumber || item.location) && (
            <div className="mt-3 flex items-center gap-3 text-xs">
              {item.pageNumber && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded">
                  Page {item.pageNumber}
                </span>
              )}
              {item.location && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded">
                  Location {item.location}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <Link
              href={`/book/${item.bookId}?highlight=${item.id}`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {item.bookTitle}
            </Link>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(item.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Audio player */}
          {item.audioUrl && (
            <div className="mt-3">
              <audio
                src={item.audioUrl}
                controls
                className="w-full h-10"
                preload="none"
              />
            </div>
          )}
        </div>
      ))}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4">
        {loadingMore && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100" />
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            You've reached the end
          </p>
        )}
      </div>
    </div>
  );
}
