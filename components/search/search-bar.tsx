"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

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
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(query)}&mode=hybrid`
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
          className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 max-h-96 overflow-y-auto z-50">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/book/${result.bookId}?highlight=${result.id}`}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
            >
              <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                {result.transcript}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
