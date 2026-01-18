"use client";

import { useState, useEffect, useCallback } from "react";
import { AnnotationCard } from "./annotation-card";

type Annotation = {
  id: string;
  transcript: string;
  audioUrl: string | null;
  createdAt: string;
};

type AnnotationListProps = {
  bookId: string;
  refreshTrigger?: number;
};

export function AnnotationList({ bookId, refreshTrigger }: AnnotationListProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnotations = useCallback(async () => {
    try {
      const res = await fetch(`/api/annotations?bookId=${bookId}`);
      if (res.ok) {
        const data = await res.json();
        setAnnotations(data);
      }
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations, refreshTrigger]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/annotations/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    );
  }

  if (annotations.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
        No notes yet. Record your first one!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {annotations.map((annotation) => (
        <AnnotationCard
          key={annotation.id}
          annotation={annotation}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
