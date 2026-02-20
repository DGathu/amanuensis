import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Saves a manuscript (Create or Update)
export async function POST(request: Request) {
  try {
    const { id, title, data } = await request.json();

    if (!data) return NextResponse.json({ error: "No data provided" }, { status: 400 });

    const resume = await prisma.resume.upsert({
      where: { id: id || "invalid-id" },
      update: { title: title || "Untitled Parchment", data: JSON.stringify(data) },
      create: { title: title || "Untitled Parchment", data: JSON.stringify(data) },
    });

    return NextResponse.json(resume, { status: 200 });
  } catch (error) {
    console.error("Database Save Error:", error);
    return NextResponse.json({ error: "Failed to save manuscript" }, { status: 500 });
  }
}

// Fetches ALL manuscripts for the dashboard
export async function GET() {
  try {
    const resumes = await prisma.resume.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true, data: true }
    });
    
    return NextResponse.json(resumes, { status: 200 });
  } catch (error) {
    console.error("Archive Fetch Error:", error);
    return NextResponse.json({ error: "Failed to retrieve the archives" }, { status: 500 });
  }
}