import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fetches ONE specific manuscript by its ID
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const resume = await prisma.resume.findUnique({
      where: { id },
    });
    
    if (!resume) return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });
    
    return NextResponse.json(resume, { status: 200 });
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch manuscript" }, { status: 500 });
  }
}

// Burns a specific manuscript by its ID
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await prisma.resume.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to burn manuscript" }, { status: 500 });
  }
}