import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

// Saves a manuscript (Create or Update securely)
export async function POST(request: Request) {
  try {
    // 1. Identify the user via NextAuth
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Single-tenant ID for your self-hosted database
    const userId = "local-admin";

    const { id, title, data } = await request.json();
    if (!data) return NextResponse.json({ error: "No data provided" }, { status: 400 });

    let resume;

    if (id) {
      const existing = await prisma.resume.findUnique({ where: { id } });
      if (existing && existing.userId !== userId) {
        return NextResponse.json({ error: "Forbidden: Not your manuscript" }, { status: 403 });
      }
      
      resume = await prisma.resume.update({
        where: { id },
        data: { title: title || "Untitled Parchment", data: JSON.stringify(data) },
      });
    } else {
      resume = await prisma.resume.create({
        data: { userId, title: title || "Untitled Parchment", data: JSON.stringify(data) },
      });
    }

    return NextResponse.json(resume, { status: 200 });
  } catch (error) {
    console.error("Database Save Error:", error);
    return NextResponse.json({ error: "Failed to save manuscript" }, { status: 500 });
  }
}

// Fetches ONLY the logged-in user's manuscripts
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = "local-admin";

    const resumes = await prisma.resume.findMany({
      where: { userId }, 
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true, data: true }
    });
    
    return NextResponse.json(resumes, { status: 200 });
  } catch (error) {
    console.error("Archive Fetch Error:", error);
    return NextResponse.json({ error: "Failed to retrieve the archives" }, { status: 500 });
  }
}