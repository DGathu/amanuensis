"use server";

import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from 'next/cache';

export async function fetchDispatchBoardJobs() {
  noStore(); 
  
  try {
    const jobs = await prisma.jobApplication.findMany({
      orderBy: [
        { matchScore: 'desc' }, 
        { createdAt: 'desc' }
      ],
    });
    return jobs;
  } catch (error) {
    console.error("Failed to fetch jobs from Vault:", error);
    return [];
  }
}