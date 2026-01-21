import { Header } from "@/components/header";
import { FeedList } from "./feed-list";

export default function FeedPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1
          className="text-2xl font-bold mb-6"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-playfair), Georgia, serif",
          }}
        >
          Random Notes
        </h1>
        <FeedList />
      </main>
    </div>
  );
}
