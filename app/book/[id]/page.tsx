import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/header";
import { BookPageClient } from "./client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function BookPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const book = await prisma.book.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!book) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm mb-4 inline-block transition-opacity hover:opacity-70"
            style={{ color: "var(--accent-gold)" }}
          >
            &larr; Back to books
          </Link>
          <div className="flex items-start gap-6">
            {book.coverUrl ? (
              <Image
                src={book.coverUrl}
                alt={book.title}
                width={128}
                height={192}
                className="w-32 h-48 object-cover rounded-lg shadow"
              />
            ) : (
              <div
                className="w-32 h-48 rounded-lg shadow flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--brown-300) 0%, var(--brown-400) 100%)",
                }}
              >
                <span
                  className="text-4xl"
                  style={{
                    color: "var(--card)",
                    fontFamily: "var(--font-playfair), Georgia, serif",
                  }}
                >
                  {book.title.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h1
                className="text-2xl font-bold"
                style={{
                  color: "var(--foreground)",
                  fontFamily: "var(--font-playfair), Georgia, serif",
                }}
              >
                {book.title}
              </h1>
              <p
                className="text-lg"
                style={{ color: "var(--foreground-muted)" }}
              >
                {book.author}
              </p>
            </div>
          </div>
        </div>

        <BookPageClient bookId={book.id} />
      </main>
    </div>
  );
}
