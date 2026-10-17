import { NextResponse } from "next/server";
import { searchNodes } from "@/lib/neo4j";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json([], { status: 200 });
    }

    const matchedNodes = await searchNodes(query.trim());
    return NextResponse.json(matchedNodes, { status: 200 });
  } catch (error: any) {
    console.error("[API /api/graph/search] Error searching nodes:", error);
    return NextResponse.json(
      {
        error: "Failed to search nodes.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

