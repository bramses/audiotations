"use client";

import { useState } from "react";

type AddBookModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (book: { title: string; author: string; coverUrl?: string }) => void;
};

export function AddBookModal({ isOpen, onClose, onAdd }: AddBookModalProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    setLoading(true);
    try {
      await onAdd({
        title: title.trim(),
        author: author.trim(),
        coverUrl: coverUrl.trim() || undefined,
      });
      setTitle("");
      setAuthor("");
      setCoverUrl("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(26, 15, 8, 0.6)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative rounded-lg shadow-xl w-full max-w-md p-6"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        <h2
          className="text-xl font-semibold mb-4"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-playfair), Georgia, serif",
          }}
        >
          Add Book
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--foreground-muted)" }}
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: "var(--background)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
              }}
              placeholder="Enter book title"
              required
            />
          </div>
          <div>
            <label
              htmlFor="author"
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--foreground-muted)" }}
            >
              Author
            </label>
            <input
              type="text"
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: "var(--background)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
              }}
              placeholder="Enter author name"
              required
            />
          </div>
          <div>
            <label
              htmlFor="coverUrl"
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--foreground-muted)" }}
            >
              Cover URL (optional)
            </label>
            <input
              type="url"
              id="coverUrl"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: "var(--background)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
              }}
              placeholder="https://..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
              style={{
                border: "1px solid var(--card-border)",
                color: "var(--foreground-muted)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !author.trim()}
              className="flex-1 px-4 py-2 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--accent-gold)",
                color: "var(--card)",
              }}
            >
              {loading ? "Adding..." : "Add Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
