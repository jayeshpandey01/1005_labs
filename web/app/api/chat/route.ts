import { NextResponse } from "next/server";
import { runGraphRAG } from "@/lib/rag/graphrag-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = body?.query;

    if (!query || typeof query !== "string" || query.trim() === "") {
      return NextResponse.json(
        { error: "Query is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    if (query.length > 1000) {
      return NextResponse.json(
        { error: "Query exceeds the maximum allowed length of 1,000 characters." },
        { status: 400 }
      );
    }

    const ragResult = await runGraphRAG(query.trim());

    return NextResponse.json(ragResult, { status: 200 });
  } catch (error: any) {
    console.error("[API /api/chat] Error processing GraphRAG request:", error);
    return NextResponse.json(
      {
        error: "Internal server error occurred while processing your request.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

