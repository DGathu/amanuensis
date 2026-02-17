"use client";

import React, { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { useRouter } from "next/navigation";

export default function ResumeUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setResumeData, setIsEditing } = useResumeStore();
  const router = useRouter();
  

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
      
      // Update the global state with the extracted data
      setResumeData(parsedData);
      setIsEditing(true);
      router.push("/editor");
      
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to parse the resume. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset input so the user can upload the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="mb-4">
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded border transition ${
          isUploading
            ? "bg-neutral-800 border-neutral-700 text-neutral-400 cursor-not-allowed"
            : "bg-neutral-900 border-neutral-700 hover:border-blue-500 hover:text-blue-400 text-neutral-300"
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Parsing PDF...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span className="text-sm font-semibold">Upload Existing Resume</span>
          </>
        )}
      </button>
    </div>
  );
}