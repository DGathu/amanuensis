"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import { ScrollText, Feather, Flame, Plus, Loader2, AlertTriangle } from "lucide-react";
import ResumeUploader from "@/components/ResumeUploader"; 

// --- TYPES FOR OUR CUSTOM MODAL ---
type ModalConfig = {
  isOpen: boolean;
  type: "alert" | "confirm";
  title: string;
  message: string;
  onConfirm?: () => void;
};

export default function Dashboard() {
  const router = useRouter();
  const { setResumeData, setDbId, setDocumentTitle, setIsEditing } = useResumeStore();
  
  const [resumes, setResumes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Custom Modal State
  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false, type: "alert", title: "", message: ""
  });

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await fetch("/api/resumes");
      if (!res.ok) throw new Error("Failed to fetch resumes");
      const data = await res.json();
      setResumes(data);
    } catch (error) {
      console.error(error);
      setModal({ isOpen: true, type: "alert", title: "Archive Sealed", message: "Failed to connect to the database. The archives remain closed." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setDbId(null);
    setDocumentTitle("Untitled Parchment");
    setResumeData({
      personalInfo: { fullName: "", headline: "", email: "", phone: "", location: "", website: "" },
      summary: { content: "" },
      profiles: [], experience: [], education: [], projects: [], skills: [], 
      languages: [], interests: [], awards: [], certifications: [], publications: [], 
      volunteer: [], references: []
    });
    setIsEditing(true);
    router.push("/editor");
  };

  const handleEdit = async (id: string, title: string, dataString: string) => {
    try {
      setDbId(id);
      setDocumentTitle(title);
      setResumeData(JSON.parse(dataString));
      setIsEditing(true);
      router.push("/editor");
    } catch (error) {
      console.error(error);
      setModal({ isOpen: true, type: "alert", title: "Corrupted Scroll", message: "This manuscript could not be unrolled. Its data may be corrupted." });
    }
  };

  const triggerDelete = (id: string) => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Burn Manuscript?",
      message: "Are you certain you wish to cast this manuscript into the fire? It shall turn to ash and cannot be recovered.",
      onConfirm: () => executeDelete(id)
    });
  };

  const executeDelete = async (id: string) => {
    closeModal();
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to burn");
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error(error);
      setModal({ isOpen: true, type: "alert", title: "Resilient Ash", message: "The manuscript resisted the flames. Deletion failed." });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-300 selection:bg-amber-900/50 relative overflow-hidden">
      
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 via-stone-950 to-stone-950 -z-10" />

      {/* --- CUSTOM MODAL OVERLAY --- */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-amber-900/50 p-6 sm:p-8 rounded-sm shadow-2xl max-w-md w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-700 to-transparent opacity-50" />
            
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-stone-950 border border-stone-800 p-3 rounded-sm text-amber-500 shadow-inner">
                {modal.type === "confirm" ? <Flame className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-xl font-serif text-amber-500">{modal.title}</h3>
                <p className="text-stone-400 text-sm mt-2 font-serif italic leading-relaxed">{modal.message}</p>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button onClick={closeModal} className="px-6 py-2 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-400 rounded-sm text-sm font-serif tracking-widest uppercase transition">
                {modal.type === "confirm" ? "Mercy" : "Understood"}
              </button>
              {modal.type === "confirm" && (
                <button onClick={modal.onConfirm} className="px-6 py-2 bg-stone-900 hover:bg-red-950/40 border border-red-900/50 hover:border-red-700/80 text-red-500 rounded-sm text-sm font-serif tracking-widest uppercase transition shadow-[0_0_10px_rgba(239,68,68,0.05)]">
                  Cast to Fire
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-20 relative z-10">
        
        {/* HERO SECTION */}
        <header className="text-center space-y-6 pt-10">
          <div className="flex justify-center mb-6">
             <Feather className="w-12 h-12 text-amber-600/80" strokeWidth={1.5} />
          </div>
          <h1 className="text-5xl md:text-6xl font-serif text-amber-500 tracking-wide drop-shadow-md">
            The Amanuensis
          </h1>
          <p className="text-stone-400 max-w-xl mx-auto text-lg font-serif italic">
            Your faithful AI scribe. Present an old scroll for enhancement, or command a blank parchment.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-12">
            <div className="w-full sm:w-auto h-12 flex items-center justify-center">
              <ResumeUploader />
            </div>
            
            <div className="text-stone-600 font-serif italic text-sm px-2 flex items-center h-12">
              — OR —
            </div>

            <button onClick={handleCreateNew} className="bg-stone-900 hover:bg-stone-800 border border-amber-900/50 text-amber-500 px-8 h-12 rounded-sm text-sm font-serif tracking-wider uppercase transition flex items-center justify-center gap-3 w-full sm:w-auto shadow-inner hover:border-amber-500/80 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <Plus className="w-4 h-4" /> Draft New Parchment
            </button>
          </div>
        </header>

        {/* DIVIDER */}
        <div className="flex items-center justify-center gap-4 opacity-50">
          <div className="h-px bg-gradient-to-r from-transparent to-amber-900/50 w-32" />
          <div className="w-2 h-2 rotate-45 border border-amber-700" />
          <div className="h-px bg-gradient-to-l from-transparent to-amber-900/50 w-32" />
        </div>

        {/* SAVED RESUMES */}
        <section>
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-serif text-amber-500 tracking-wide">The Archives</h2>
              <p className="text-stone-500 text-sm mt-2 font-serif italic">Consult your previously bound manuscripts.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-amber-700" />
            </div>
          ) : resumes.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-stone-800 rounded-lg bg-stone-900/30">
              <ScrollText className="w-12 h-12 text-stone-700 mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-xl font-serif text-stone-400">The archives are bare.</h3>
              <p className="text-sm text-stone-600 mt-2 font-serif italic">Command your scribe to begin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resumes.map((resume) => {
                
                // --- PARSE DATA FOR PREVIEW ---
                let previewData = null;
                try { previewData = JSON.parse(resume.data); } catch(e) {}

                return (
                  <div key={resume.id} className="bg-stone-900 border border-stone-800 hover:border-amber-700/50 rounded-sm p-6 transition duration-300 group flex flex-col shadow-lg relative h-72">
                    
                    {/* --- THE PARCHMENT MINI-PREVIEW --- */}
                    {previewData && (
                      <div className="absolute top-0 left-0 w-full h-full p-6 pt-16 overflow-hidden pointer-events-none opacity-[0.15] group-hover:opacity-[0.25] transition-opacity">
                        <div className="w-full text-center mb-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-500">{previewData.personalInfo?.fullName || "UNKNOWN"}</h4>
                          <div className="w-1/2 h-px bg-amber-700/50 mx-auto my-1" />
                          <p className="text-[6px] uppercase tracking-wider">{previewData.personalInfo?.headline}</p>
                        </div>
                        <div className="text-[5px] leading-relaxed text-justify mt-3 opacity-70 blur-[0.3px]">
                           {previewData.summary?.content}
                        </div>
                        {/* Gradient Fade-Out Mask */}
                        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-stone-900 to-transparent" />
                      </div>
                    )}

                    {/* INTERACTIVE FOREGROUND UI */}
                    <div className="flex justify-between items-start mb-6 relative z-20">
                      <div className="bg-stone-950 border border-stone-800 p-3 rounded-sm text-amber-600 shadow-inner">
                        <ScrollText className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                      <button 
                        onClick={() => triggerDelete(resume.id)}
                        disabled={isDeleting === resume.id}
                        className="text-stone-600 hover:text-red-500 transition p-2 hover:bg-stone-950 rounded-sm"
                        title="Burn Manuscript"
                      >
                        {isDeleting === resume.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flame className="w-5 h-5" strokeWidth={1.5} />}
                      </button>
                    </div>

                    <div className="flex-1 relative z-20 mt-auto flex flex-col justify-end">
                      <h3 className="font-serif text-amber-100 text-xl truncate pr-2" title={resume.title}>
                        {resume.title}
                      </h3>
                      <p className="text-xs text-stone-500 mt-2 font-serif italic">
                        Sealed on {new Date(resume.updatedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>

                      <button 
                        onClick={() => handleEdit(resume.id, resume.title, resume.data)}
                        className="mt-6 w-full py-3 bg-stone-950/80 backdrop-blur-sm hover:bg-stone-800 border border-stone-800 hover:border-amber-700/80 text-amber-600 hover:text-amber-500 rounded-sm text-sm font-serif tracking-widest uppercase transition flex items-center justify-center gap-3 relative z-10 group-hover:shadow-[0_0_10px_rgba(245,158,11,0.05)]"
                      >
                        <Feather className="w-4 h-4" /> Unroll Scroll
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}