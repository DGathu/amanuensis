"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, History } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import ResumeUploader from "@/components/ResumeUploader";

export default function Dashboard() {
  const router = useRouter();
  const { resetToBlank, setIsEditing } = useResumeStore();

  const handleCreateBlank = () => {
    resetToBlank();
    setIsEditing(true);
    router.push("/editor");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">
        
        <header>
          <h1 className="text-4xl font-bold tracking-tight mb-2">The Amanuensis</h1>
          <p className="text-neutral-400">Your AI-assisted resume architect.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Blank Card */}
          <div 
            onClick={handleCreateBlank}
            className="group p-6 bg-neutral-900 rounded-xl border border-neutral-800 hover:border-blue-500 cursor-pointer transition flex flex-col items-center justify-center min-h-[200px] text-center"
          >
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <Plus className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-white">Start from Scratch</h2>
            <p className="text-sm text-neutral-400 mt-2">Open the editor with a blank canvas.</p>
          </div>

          {/* Upload Resume Card */}
          <div className="p-6 bg-neutral-900 rounded-xl border border-neutral-800 flex flex-col justify-center min-h-[200px]">
             <div className="flex items-center gap-3 mb-4">
                <FileText className="text-blue-400 w-6 h-6" />
                <h2 className="text-lg font-semibold text-white">Import Existing Resume</h2>
             </div>
             <p className="text-sm text-neutral-400 mb-6">Upload a PDF and let Gemini parse your data into the editor instantly.</p>
             <ResumeUploader />
          </div>
        </section>

        {/* Recent Resumes Mockup */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2">
            <History className="w-5 h-5 text-neutral-400" />
            <h2 className="text-lg font-semibold">Recent Resumes</h2>
          </div>
          <div className="text-sm text-neutral-500 italic">
            Saved resumes will appear here once database integration is complete.
          </div>
        </section>

      </div>
    </div>
  );
}