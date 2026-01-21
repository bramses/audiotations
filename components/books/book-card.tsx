"use client";

import Link from "next/link";
import Image from "next/image";

type Book = {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  archived: boolean;
  _count?: { annotations: number };
};

type BookCardProps = {
  book: Book;
  onArchiveToggle: (id: string, archived: boolean) => void;
};

export function BookCard({ book, onArchiveToggle }: BookCardProps) {
  return (
    <div
      className="rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        boxShadow: "0 2px 8px rgba(44, 24, 16, 0.08)",
      }}
    >
      <Link href={`/book/${book.id}`} className="block">
        <div
          className="aspect-[2/3] relative"
          style={{ background: "var(--background-secondary)" }}
        >
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              fill
              className="object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--brown-300) 0%, var(--brown-400) 100%)",
              }}
            >
              <span
                className="text-5xl font-serif"
                style={{
                  color: "var(--card)",
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                {book.title.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3
            className="font-medium truncate mb-1"
            style={{
              color: "var(--foreground)",
              fontFamily: "var(--font-playfair), Georgia, serif",
            }}
          >
            {book.title}
          </h3>
          <p
            className="text-sm truncate"
            style={{ color: "var(--foreground-muted)" }}
          >
            {book.author}
          </p>
          {book._count && (
            <p
              className="text-xs mt-2"
              style={{ color: "var(--accent-gold)" }}
            >
              {book._count.annotations} note{book._count.annotations !== 1 && "s"}
            </p>
          )}
        </div>
      </Link>
      <div
        className="px-4 pb-4 pt-0 border-t"
        style={{ borderColor: "var(--card-border)" }}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            onArchiveToggle(book.id, !book.archived);
          }}
          className="text-xs hover:opacity-70 transition-opacity mt-3"
          style={{ color: "var(--foreground-muted)" }}
        >
          {book.archived ? "Restore" : "Archive"}
        </button>
      </div>
    </div>
  );
}
