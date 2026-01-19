import { Header } from "@/components/header";
import { BookList } from "@/components/books/book-list";
import { SearchBar } from "@/components/search/search-bar";
import { ReadingHeatmap } from "@/components/reading/reading-heatmap";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-center mb-8">
          <SearchBar />
        </div>
        <div className="mb-8">
          <ReadingHeatmap />
        </div>
        <BookList />
      </main>
    </div>
  );
}
