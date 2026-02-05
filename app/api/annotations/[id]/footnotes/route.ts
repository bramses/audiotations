import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai, CLEANUP_MODEL } from "@/lib/openai";

type Footnote = {
  quote: string;
  issue: string;
  searchQuery: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const annotation = await prisma.annotation.findFirst({
    where: { id, book: { userId: session.user.id } },
    select: { id: true, transcript: true },
  });

  if (!annotation) {
    return NextResponse.json({ error: "Annotation not found" }, { status: 404 });
  }

  let mode: "default" | "subjects" = "default";
  try {
    const body = await req.json();
    if (body?.mode === "subjects") {
      mode = "subjects";
    }
  } catch {
    // ignore missing/invalid body
  }

  try {
    const instruction =
      mode === "subjects"
        ? `Create footnotes for subjects/entities (people, places, organizations, works, products, events) mentioned in the transcript, even if no inaccuracies are detected. Each footnote should provide a short context note and a Google search query to learn more.`
        : `Prioritize subjects and entities from the transcript (people, places, organizations, works, products, events) and any claims, numbers, or dates that might be inaccurate or misheard.`;

    const response = await openai.chat.completions.create({
      model: CLEANUP_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You generate concise fact-check footnotes for an audio transcription.
${instruction}
Return up to 5 footnotes. If none, return an empty list.

Return JSON in this exact format:
{
  "footnotes": [
    {
      "quote": "short quoted phrase from the transcript",
      "issue": "why it might be inaccurate or needs verification",
      "searchQuery": "google search query to verify"
    }
  ]
}`,
        },
        {
          role: "user",
          content: annotation.transcript,
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const footnotes = Array.isArray(parsed.footnotes)
      ? parsed.footnotes
          .filter(
            (item: Footnote) =>
              typeof item?.quote === "string" &&
              typeof item?.issue === "string" &&
              typeof item?.searchQuery === "string"
          )
          .slice(0, 5)
      : [];

    await prisma.annotation.update({
      where: { id: annotation.id },
      data: { footnotes },
    });

    return NextResponse.json({ footnotes });
  } catch (error) {
    console.error("Footnote generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate footnotes" },
      { status: 500 }
    );
  }
}
