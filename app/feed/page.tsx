import { Header } from "@/components/header";
import { FeedList } from "./feed-list";

export default function FeedPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Random Notes
        </h1>
        <FeedList />
      </main>
    </div>
  );
}
