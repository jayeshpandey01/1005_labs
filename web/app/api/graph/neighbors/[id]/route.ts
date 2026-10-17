import { NextResponse } from "next/server";
import { getNeighbors } from "@/lib/neo4j";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const rawId = params?.id;

    if (!rawId) {
      return NextResponse.json(
        { error: "Node ID parameter is required." },
        { status: 400 }
      );
    }

    const nodeId = decodeURIComponent(rawId);
    const subgraph = await getNeighbors(nodeId);

    return NextResponse.json(subgraph, { status: 200 });
  } catch (error: any) {
    console.error("[API /api/graph/neighbors] Error fetching node neighbors:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch node neighbors.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

