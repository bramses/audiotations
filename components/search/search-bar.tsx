"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getSearchThreshold } from "@/components/settings/mic-settings";

type SearchResult = {
  id: string;
  transcript: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  createdAt: string;
  score?: number;
};

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Debounced FTS search as you type
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&mode=fts`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Semantic search on Enter
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        setLoading(true);
        try {
          const threshold = getSearchThreshold();
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(query)}&mode=hybrid&threshold=${threshold}`
          );
          if (res.ok) {
            const data = await res.json();
            setResults(data);
            setIsOpen(true);
          }
        } finally {
          setLoading(false);
        }
      }
    },
    [query]
  );

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search your notes... (Enter for semantic search)"
          className="w-full px-4 py-3 pl-10 rounded-lg"
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
            color: "var(--foreground)",
          }}
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "var(--foreground-muted)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div
              className="animate-spin rounded-full h-5 w-5 border-b-2"
              style={{ borderColor: "var(--accent-gold)" }}
            />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
          style={{
            background: "var(--card)",
            border: "1px solid var(--card-border)",
          }}
        >
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/book/${result.bookId}?highlight=${result.id}`}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 border-b last:border-b-0 transition-colors"
              style={{ borderColor: "var(--card-border)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--background-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <p
                className="text-sm line-clamp-2"
                style={{ color: "var(--foreground)" }}
              >
                {result.transcript}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--foreground-muted)" }}
              >
                {result.bookTitle} by {result.bookAuthor}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}
    </div>
  );
}
