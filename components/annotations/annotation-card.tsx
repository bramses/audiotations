"use client";

type Annotation = {
  id: string;
  transcript: string;
  audioUrl: string | null;
  createdAt: string;
};

type AnnotationCardProps = {
  annotation: Annotation;
  onDelete?: (id: string) => void;
};

export function AnnotationCard({ annotation, onDelete }: AnnotationCardProps) {
  const date = new Date(annotation.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-gray-900 whitespace-pre-wrap">{annotation.transcript}</p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">{formattedDate}</span>
        <div className="flex items-center gap-2">
          {annotation.audioUrl && (
            <audio
              src={annotation.audioUrl}
              controls
              className="h-8"
              preload="none"
            />
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(annotation.id)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
