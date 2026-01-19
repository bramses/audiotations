import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, IMAGES_BUCKET } from "@/lib/supabase";
import { openai, VISION_MODEL, EMBEDDING_MODEL } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File;
    const bookId = formData.get("bookId") as string;

    if (!imageFile || !bookId) {
      return NextResponse.json(
        { error: "image and bookId are required" },
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

    // 1. Upload image to Supabase Storage
    const originalName = imageFile.name || "image.jpg";
    const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = imageFile.type || `image/${extension}`;

    const fileName = `${session.user.id}/${bookId}/${Date.now()}.${extension}`;
    const imageBuffer = await imageFile.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(IMAGES_BUCKET)
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    // Get public URL for the image
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(IMAGES_BUCKET).getPublicUrl(fileName);

    // 2. Convert image to base64 for GPT Vision
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // 3. Use GPT Vision to transcribe/describe the image
    const visionResponse = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "This is a photo of a page or section from a book. If there is text visible, transcribe it accurately. If it's a diagram, illustration, or image without text, describe what you see in detail. Focus on the content that would be relevant for book notes/annotations. Return only the transcription or description, nothing else.",
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const transcript =
      visionResponse.choices[0]?.message?.content || "Unable to process image";

    // 4. Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: transcript,
    });

    const embedding = embeddingResponse.data[0].embedding;
    const embeddingStr = `[${embedding.join(",")}]`;

    // 5. Store annotation with embedding using raw SQL for vector type
    const annotation = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Annotation" (id, transcript, embedding, "imageUrl", "bookId", "createdAt")
      VALUES (
        ${crypto.randomUUID()},
        ${transcript},
        ${embeddingStr}::vector,
        ${publicUrl},
        ${bookId},
        NOW()
      )
      RETURNING id
    `;

    return NextResponse.json({
      id: annotation[0].id,
      transcript,
      imageUrl: publicUrl,
    });
  } catch (error) {
    console.error("Image transcription error:", error);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }
}
