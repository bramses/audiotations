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
            className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
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
              <div className="w-32 h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg shadow flex items-center justify-center">
                <span className="text-4xl text-gray-400">
                  {book.title.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{book.title}</h1>
              <p className="text-lg text-gray-600">{book.author}</p>
            </div>
          </div>
        </div>

        <BookPageClient bookId={book.id} />
      </main>
    </div>
  );
}
