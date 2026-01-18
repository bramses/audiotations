import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, AUDIO_BUCKET } from "@/lib/supabase";
import {
  openai,
  WHISPER_MODEL,
  CLEANUP_MODEL,
  EMBEDDING_MODEL,
} from "@/lib/openai";
import { toFile } from "openai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const bookId = formData.get("bookId") as string;

    if (!audioFile || !bookId) {
      return NextResponse.json(
        { error: "audio and bookId are required" },
        { status: 400 }
      );
    }

    // Verify user owns the book
    const book = await prisma.book.findFirst({
      where: { id: bookId, userId: session.user.id },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // 1. Upload audio to Supabase Storage
    const fileName = `${session.user.id}/${bookId}/${Date.now()}.webm`;
    const audioBuffer = await audioFile.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .upload(fileName, audioBuffer, {
        contentType: "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload audio" },
        { status: 500 }
      );
    }

    // Get public URL for the audio
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(AUDIO_BUCKET).getPublicUrl(fileName);

    // 2. Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(Buffer.from(audioBuffer), "audio.webm", {
        type: "audio/webm",
      }),
      model: WHISPER_MODEL,
    });

    const rawTranscript = transcription.text;

    // 3. Clean up with GPT
    const cleanupResponse = await openai.chat.completions.create({
      model: CLEANUP_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a transcript editor. Clean up the following transcript of a book note/annotation. Fix grammar, punctuation, and formatting while preserving the original meaning. Remove filler words like "um", "uh", "like" when they don't add meaning. Format the text in clear paragraphs. Return only the cleaned transcript, nothing else.`,
        },
        {
          role: "user",
          content: rawTranscript,
        },
      ],
      temperature: 0.3,
    });

    const cleanedTranscript =
      cleanupResponse.choices[0]?.message?.content || rawTranscript;

    // 4. Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: cleanedTranscript,
    });

    const embedding = embeddingResponse.data[0].embedding;
    // Format embedding as PostgreSQL vector literal: [0.1, 0.2, ...]
    const embeddingStr = `[${embedding.join(",")}]`;

    // 5. Store annotation with embedding using raw SQL for vector type
    const annotation = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Annotation" (id, transcript, embedding, "audioUrl", "bookId", "createdAt")
      VALUES (
        ${crypto.randomUUID()},
        ${cleanedTranscript},
        ${embeddingStr}::vector,
        ${publicUrl},
        ${bookId},
        NOW()
      )
      RETURNING id
    `;

    return NextResponse.json({
      id: annotation[0].id,
      transcript: cleanedTranscript,
      audioUrl: publicUrl,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to process recording" },
      { status: 500 }
    );
  }
}
