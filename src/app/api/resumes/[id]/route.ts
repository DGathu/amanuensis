import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

// Fetches ONE specific manuscript, verifying ownership
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = "local-admin";
    const { id } = await params;

    const resume = await prisma.resume.findUnique({ where: { id } });
    
    if (!resume || resume.userId !== userId) {
      return NextResponse.json({ error: "Manuscript not found or unauthorized" }, { status: 404 });
    }
    
    return NextResponse.json(resume, { status: 200 });
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch manuscript" }, { status: 500 });
  }
}

// Burns a specific manuscript, verifying ownership
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = "local-admin";
    const { id } = await params;

    const existing = await prisma.resume.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.resume.delete({ where: { id } });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to burn manuscript" }, { status: 500 });
  }
}