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
    // Detect file extension and MIME type from uploaded file
    const originalName = audioFile.name || "recording.webm";
    const extension = originalName.split(".").pop()?.toLowerCase() || "webm";
    const mimeType = audioFile.type || `audio/${extension}`;

    const fileName = `${session.user.id}/${bookId}/${Date.now()}.${extension}`;
    const audioBuffer = await audioFile.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .upload(fileName, audioBuffer, {
        contentType: mimeType,
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
      file: await toFile(Buffer.from(audioBuffer), originalName, {
        type: mimeType,
      }),
      model: WHISPER_MODEL,
    });

    const rawTranscript = transcription.text;

    // 3. Clean up with GPT and extract metadata
    const cleanupResponse = await openai.chat.completions.create({
      model: CLEANUP_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a transcript editor for book notes. Clean up the transcript while preserving meaning. Remove filler words ("um", "uh", "like").

IMPORTANT: Look for metadata phrases that sound like:
- "Meta Note Page [number]" (or mishearings like "meta note paid", "met a note page", "meta no page")
- "Meta Note Location [number]" (or mishearings like "meta note locate", "met a note location")

If found, extract the page or location number and REMOVE that phrase from the transcript.

Return JSON in this exact format:
{
  "transcript": "cleaned transcript text without the meta note phrases",
  "pageNumber": "extracted page number or null",
  "location": "extracted location number or null"
}`,
        },
        {
          role: "user",
          content: rawTranscript,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    let cleanedTranscript = rawTranscript;
    let pageNumber: string | null = null;
    let location: string | null = null;

    try {
      const parsed = JSON.parse(cleanupResponse.choices[0]?.message?.content || "{}");
      cleanedTranscript = parsed.transcript || rawTranscript;
      pageNumber = parsed.pageNumber || null;
      location = parsed.location || null;
    } catch {
      cleanedTranscript = cleanupResponse.choices[0]?.message?.content || rawTranscript;
    }

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
      INSERT INTO "Annotation" (id, transcript, embedding, "audioUrl", "pageNumber", location, "bookId", "createdAt")
      VALUES (
        ${crypto.randomUUID()},
        ${cleanedTranscript},
        ${embeddingStr}::vector,
        ${publicUrl},
        ${pageNumber},
        ${location},
        ${bookId},
        NOW()
      )
      RETURNING id
    `;

    return NextResponse.json({
      id: annotation[0].id,
      transcript: cleanedTranscript,
      audioUrl: publicUrl,
      pageNumber,
      location,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to process recording" },
      { status: 500 }
    );
  }
}
