"use client";

import React, { useState, useRef } from "react";
import { ScrollText, Loader2 } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"; // <-- NextAuth hooks

// NEW: Accept a prop to trigger the modal
interface ResumeUploaderProps {
  onRequireAuth?: () => void;
}

export default function ResumeUploader({ onRequireAuth }: ResumeUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { setResumeData, setIsEditing, setDocumentTitle, setDbId } = useResumeStore();
  const router = useRouter();
  
  // NEXT-AUTH STATE
  const { status } = useSession();
  const isSignedIn = status === "authenticated";

  // Intercept the click before the file browser opens
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      // PROPER FIX: Call the prop function to open the modal!
      if (onRequireAuth) onRequireAuth();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to parse resume");
      }

      const parsedData = await response.json();
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      
      setDbId(null); 
      setDocumentTitle(fileName);
      setResumeData(parsedData);
      setIsEditing(true);
      
      router.push("/editor");
      
    } catch (error) {
      console.error("Upload error:", error);
      alert("The scribe failed to read the parchment. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <button
        onClick={handleButtonClick}
        disabled={isUploading}
        className={`w-full sm:w-auto flex items-center justify-center gap-3 px-8 h-12 rounded-sm text-sm font-serif tracking-wider uppercase transition shadow-inner whitespace-nowrap ${
          isUploading
            ? "bg-stone-900 border border-stone-800 text-stone-600 cursor-not-allowed"
            : "bg-stone-900 hover:bg-stone-800 border border-amber-900/50 text-amber-500 hover:border-amber-500/80 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]"
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
            <span>Unrolling Scroll...</span>
          </>
        ) : (
          <>
            <ScrollText className="w-4 h-4" />
            <span>Present Scroll</span>
          </>
        )}
      </button>
    </>
  );
}