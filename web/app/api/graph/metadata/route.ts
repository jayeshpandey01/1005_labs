import { NextResponse } from "next/server";
import { getGraphMetadata } from "@/lib/neo4j";

export async function GET() {
  try {
    const metadata = await getGraphMetadata();
    return NextResponse.json(metadata, { status: 200 });
  } catch (error: any) {
    console.error("[API /api/graph/metadata] Error fetching graph metadata:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch graph metadata.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

