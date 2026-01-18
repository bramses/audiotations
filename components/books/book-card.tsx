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
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/book/${book.id}`} className="block">
        <div className="aspect-[2/3] bg-gray-100 dark:bg-gray-800 relative">
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
              <span className="text-4xl text-gray-400 dark:text-gray-500">
                {book.title.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">{book.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
          {book._count && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {book._count.annotations} note{book._count.annotations !== 1 && "s"}
            </p>
          )}
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button
          onClick={(e) => {
            e.preventDefault();
            onArchiveToggle(book.id, !book.archived);
          }}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {book.archived ? "Restore" : "Archive"}
        </button>
      </div>
    </div>
  );
}
