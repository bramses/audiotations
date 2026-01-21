"use client";

import { useState, useEffect } from "react";
import { BookCard } from "./book-card";
import { AddBookModal } from "./add-book-modal";

type Book = {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  archived: boolean;
  _count?: { annotations: number };
};

export function BookList() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch("/api/books");
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const addBook = async (book: {
    title: string;
    author: string;
    coverUrl?: string;
  }) => {
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book),
    });
    if (res.ok) {
      const newBook = await res.json();
      setBooks((prev) => [{ ...newBook, _count: { annotations: 0 } }, ...prev]);
    }
  };

  const toggleArchive = async (id: string, archived: boolean) => {
    const res = await fetch(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    if (res.ok) {
      setBooks((prev) =>
        prev.map((book) => (book.id === id ? { ...book, archived } : book))
      );
    }
  };

  const currentlyReading = books.filter((b) => !b.archived);
  const archivedBooks = books.filter((b) => b.archived);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: "var(--accent-gold)" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Currently Reading Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xl font-semibold"
            style={{
              color: "var(--foreground)",
              fontFamily: "var(--font-playfair), Georgia, serif",
            }}
          >
            Currently Reading
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-90"
            style={{
              background: "var(--accent-gold)",
              color: "var(--card)",
            }}
          >
            + Add Book
          </button>
        </div>
        {currentlyReading.length === 0 ? (
          <p
            className="py-8 text-center"
            style={{ color: "var(--foreground-muted)" }}
          >
            No books yet. Add one to get started!
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {currentlyReading.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onArchiveToggle={toggleArchive}
              />
            ))}
          </div>
        )}
      </section>

      {/* Archived Section */}
      {archivedBooks.length > 0 && (
        <section>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 mb-4 transition-opacity hover:opacity-70"
            style={{ color: "var(--foreground-muted)" }}
          >
            <span
              className={`transform transition-transform ${showArchived ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            <h2
              className="text-lg font-medium"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              Archived ({archivedBooks.length})
            </h2>
          </button>
          {showArchived && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {archivedBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onArchiveToggle={toggleArchive}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <AddBookModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addBook}
      />
    </div>
  );
}
