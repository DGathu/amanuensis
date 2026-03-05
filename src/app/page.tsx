"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import { ScrollText, Feather, Flame, Plus, Loader2, AlertTriangle, ShieldAlert, LogOut, Key } from "lucide-react";
import ResumeUploader from "@/components/ResumeUploader"; 
import { useSession, signIn, signOut } from "next-auth/react";

type ModalConfig = {
  isOpen: boolean;
  type: "alert" | "confirm";
  title: string;
  message: string;
  onConfirm?: () => void;
};

export default function Dashboard() {
  const router = useRouter();
  
  // NEXT-AUTH HOOKS
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";
  const isSignedIn = status === "authenticated";
  
  const { setResumeData, setDbId, setDocumentTitle, setIsEditing } = useResumeStore();
  
  const [resumes, setResumes] = useState<any[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // --- STANDARD MODALS ---
  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false, type: "alert", title: "", message: ""
  });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  // --- CUSTOM AUTH MODAL STATE ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  // Fetch resumes ONLY if authenticated
  useEffect(() => {
    if (isSignedIn) {
      fetchResumes();
    } else if (!isLoadingSession) {
      setIsLoadingResumes(false);
    }
  }, [isSignedIn, isLoadingSession]);

  const fetchResumes = async () => {
    setIsLoadingResumes(true);
    try {
      const res = await fetch("/api/resumes");
      if (!res.ok) throw new Error("Failed to fetch resumes");
      const data = await res.json();
      setResumes(data);
    } catch (error) {
      console.error(error);
      setModal({ isOpen: true, type: "alert", title: "Archive Sealed", message: "Failed to connect to the database." });
    } finally {
      setIsLoadingResumes(false);
    }
  };

  // --- CUSTOM LOGIN HANDLER ---
  const handleSilentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError("");

    const res = await signIn("credentials", {
      password: authPassword,
      redirect: false, // <-- This stops the annoying page reload/redirect!
    });

    if (res?.error) {
      setAuthError("Invalid cipher. The guards remain steadfast.");
      setIsAuthenticating(false);
    } else {
      setShowAuthModal(false);
      setAuthPassword("");
      setIsAuthenticating(false);
      // useSession will automatically detect the new login and trigger fetchResumes!
    }
  };

  const handleCreateNew = () => {
    if (!isSignedIn) {
      return setShowAuthModal(true); // Summon our custom modal instead of redirecting
    }

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
      const parsedData = JSON.parse(dataString);
      setDbId(id);
      setDocumentTitle(title);
      setResumeData(parsedData);
      
      if (parsedData.template) {
        useResumeStore.getState().setTemplate(parsedData.template);
      }
      
      setIsEditing(true);
      router.push("/editor");
    } catch (error) {
      setModal({ isOpen: true, type: "alert", title: "Corrupted Scroll", message: "This manuscript could not be unrolled." });
    }
  };

  const triggerDelete = (id: string) => {
    setModal({
      isOpen: true, type: "confirm", title: "Burn Manuscript?",
      message: "Are you certain you wish to cast this manuscript into the fire?",
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
      setModal({ isOpen: true, type: "alert", title: "Resilient Ash", message: "Deletion failed." });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-300 selection:bg-amber-900/50 relative overflow-hidden">
      
      {/* Custom CSS for the Torch Flicker */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes torch-flicker {
          0% { opacity: 0.8; transform: scale(0.98); }
          20% { opacity: 0.95; transform: scale(1.02); }
          40% { opacity: 0.7; transform: scale(0.95); }
          60% { opacity: 0.9; transform: scale(1); }
          80% { opacity: 0.85; transform: scale(1.04); }
          100% { opacity: 0.8; transform: scale(0.98); }
        }
        .animate-torch { animation: torch-flicker 2s infinite alternate; }
        .animate-flame-1 { animation: torch-flicker 0.4s infinite alternate; }
        .animate-flame-2 { animation: torch-flicker 0.6s infinite alternate-reverse; }
        .animate-flame-3 { animation: torch-flicker 0.3s infinite alternate; }
      `}} />

      {/* Base Background Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-stone-900 via-stone-950 to-stone-950 -z-20" />

      {/* --- THE AMBIENT ORANGE GLOW (Illuminates the whole page) --- */}
      <div className="fixed inset-0 pointer-events-none -z-10 mix-blend-color-dodge opacity-50 animate-torch hidden md:block"
           style={{ background: 'radial-gradient(circle at 95% 25%, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.1) 30%, transparent 70%)' }} />

      {/* --- THE PHYSICAL TORCH SCONCE --- */}
      <div className="fixed right-0 top-[25%] -translate-y-1/2 z-0 pointer-events-none hidden md:block" style={{ width: '120px', height: '200px' }}>
        
        {/* Wall Iron Bracket */}
        <div className="absolute right-0 bottom-10 w-3 h-16 bg-stone-900 border-l border-y border-stone-800 rounded-l-md shadow-2xl" />
        
        {/* Angled Wood Handle */}
        <div className="absolute right-1 bottom-12 w-3 h-24 bg-gradient-to-t from-stone-950 to-stone-800 border border-stone-700 rounded-sm origin-bottom-right -rotate-[20deg] shadow-2xl" />
        
        {/* Iron Basket / Torch Head */}
        <div className="absolute right-7 top-16 w-8 h-8 bg-stone-900 border-2 border-stone-700 rounded-b-lg -rotate-[20deg] flex items-center justify-center shadow-lg">
          <div className="w-10 h-2 bg-stone-800 absolute -top-2 border border-stone-700 rounded-sm" />
        </div>
        
        {/* The Dancing Flames */}
        <div className="absolute right-9 top-4 w-8 h-12 -rotate-[10deg] flex justify-center items-end opacity-90 mix-blend-screen">
           {/* Outer Orange Flame */}
           <div className="w-6 h-10 bg-amber-600 rounded-[100%_0_100%_0] rotate-45 blur-[3px] absolute bottom-2 animate-flame-1 origin-bottom" />
           {/* Middle Yellow Flame */}
           <div className="w-4 h-8 bg-amber-400 rounded-[100%_0_100%_0] rotate-45 blur-[2px] absolute bottom-1 animate-flame-2 origin-bottom" />
           {/* Inner White/Hot Flame */}
           <div className="w-2 h-5 bg-yellow-100 rounded-[100%_0_100%_0] rotate-45 blur-[1px] absolute bottom-0 animate-flame-3 origin-bottom" />
        </div>
        
        {/* Intense Light Source Bloom (Directly over the fire) */}
        <div className="absolute right-2 top-0 w-24 h-24 bg-amber-500 rounded-full blur-2xl opacity-40 animate-torch" />
      </div>


      {/* --- CUSTOM AUTHENTICATION MODAL --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-amber-900/50 p-8 rounded-sm shadow-2xl max-w-sm w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-700 to-transparent opacity-50" />
            
            <div className="flex flex-col items-center text-center mb-6">
              <div className="bg-stone-950 border border-stone-800 p-4 rounded-full text-amber-500 shadow-inner mb-4 relative">
                <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-pulse" />
                <Key className="w-6 h-6 relative z-10" />
              </div>
              <h3 className="text-2xl font-serif text-amber-500">The Royal Cipher</h3>
              <p className="text-stone-400 text-sm mt-2 font-serif italic">Speak the master word to unlock the archives.</p>
            </div>

            <form onSubmit={handleSilentLogin} className="space-y-4">
              <div>
                <input 
                  type="password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter the password..." 
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-700/60 focus:ring-1 focus:ring-amber-700/30 text-stone-200 rounded-sm p-3 text-sm transition-all placeholder-stone-700 outline-none shadow-inner text-center font-serif tracking-widest"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="text-red-400 text-xs font-serif italic text-center animate-in fade-in">
                  {authError}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-stone-800/80">
                <button type="button" onClick={() => setShowAuthModal(false)} className="flex-1 py-2.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-400 rounded-sm text-xs font-serif tracking-widest uppercase transition">
                  Retreat
                </button>
                <button type="submit" disabled={isAuthenticating} className="flex-1 py-2.5 bg-stone-900 border border-amber-900/50 hover:border-amber-500/80 text-amber-500 rounded-sm text-xs font-serif tracking-widest uppercase shadow-inner hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all flex items-center justify-center gap-2">
                  {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin text-amber-700" /> : "Unlock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- STANDARD NOTIFICATION MODAL --- */}
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
        
        {/* NEXT-AUTH BAR */}
        <div className="absolute top-4 right-6 flex items-center gap-4">
          {isLoadingSession ? (
            <Loader2 className="w-5 h-5 animate-spin text-amber-700" />
          ) : !isSignedIn ? (
            <button onClick={() => setShowAuthModal(true)} className="text-amber-500 hover:text-amber-400 font-serif text-sm tracking-widest uppercase transition border border-amber-900/50 hover:border-amber-500/50 px-4 py-1.5 rounded-sm bg-stone-900 shadow-inner">
              Identify Yourself
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-xs font-serif italic text-stone-500 hidden sm:block">Welcome, Master Scribe</span>
              <button onClick={() => signOut()} title="Depart" className="p-2 border border-stone-800 hover:border-amber-700/50 text-stone-500 hover:text-amber-500 rounded-sm transition bg-stone-900 shadow-inner">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <header className="text-center space-y-6 pt-10">
          <div className="flex justify-center mb-6">
             <Feather className="w-12 h-12 text-amber-600/80" strokeWidth={1.5} />
          </div>
          <h1 className="text-5xl md:text-6xl font-serif text-amber-500 tracking-wide drop-shadow-md">The Amanuensis</h1>
          <p className="text-stone-400 max-w-xl mx-auto text-lg font-serif italic">Your faithful AI scribe. Present an old scroll for enhancement, or command a blank parchment.</p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-12">
            <div className="w-full sm:w-auto h-12 flex items-center justify-center">
              <ResumeUploader onRequireAuth={() => setShowAuthModal(true)} />
            </div>
            <div className="text-stone-600 font-serif italic text-sm px-2 flex items-center h-12">— OR —</div>
            <button onClick={handleCreateNew} className="bg-stone-900 hover:bg-stone-800 border border-amber-900/50 text-amber-500 px-8 h-12 rounded-sm text-sm font-serif tracking-wider uppercase transition flex items-center justify-center gap-3 w-full sm:w-auto shadow-inner hover:border-amber-500/80 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <Plus className="w-4 h-4" /> Draft New Parchment
            </button>
          </div>

          {/* --- NEW: ROYAL PROCLAMATIONS (Disclaimers) --- */}
          <div className="max-w-2xl mx-auto mt-16 p-6 border border-stone-800/60 bg-stone-900/20 rounded-sm relative shadow-inner">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-stone-950 px-4 text-[10px] font-serif uppercase tracking-widest text-amber-600/80 flex items-center gap-2 border border-stone-800/60 rounded-sm shadow-sm">
              <AlertTriangle className="w-3 h-3" />
              Notices of the Realm
            </div>
            <div className="space-y-4 text-xs text-stone-400 font-serif leading-relaxed text-center italic">
              <p>
                <strong className="text-amber-700/80 font-normal tracking-wide not-italic">I. The Forge is Active:</strong> This sanctuary is in active development. Please forgive any errant ink spills, loose stones, or sudden changes to the castle walls.
              </p>
              <p>
                <strong className="text-amber-700/80 font-normal tracking-wide not-italic">II. Verify Thy Parchment:</strong> The Amanuensis is a faithful servant, but alas, only a machine. Always verify the accuracy of the ink before presenting your scroll to future employers.
              </p>
            </div>
          </div>
          {/* ---------------------------------------------- */}
        </header>

        <div className="flex items-center justify-center gap-4 opacity-50">
          <div className="h-px bg-gradient-to-r from-transparent to-amber-900/50 w-32" />
          <div className="w-2 h-2 rotate-45 border border-amber-700" />
          <div className="h-px bg-gradient-to-l from-transparent to-amber-900/50 w-32" />
        </div>

        <section>
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-serif text-amber-500 tracking-wide">The Archives</h2>
              <p className="text-stone-500 text-sm mt-2 font-serif italic">Consult your previously bound manuscripts.</p>
            </div>
          </div>

          {isLoadingSession || isLoadingResumes ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-amber-700" />
            </div>
          ) : !isSignedIn ? (
            <div className="text-center py-24 border border-dashed border-stone-800 rounded-lg bg-stone-900/30">
              <ShieldAlert className="w-12 h-12 text-stone-700 mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-xl font-serif text-stone-400">The Archives are Secured</h3>
              <p className="text-sm text-stone-600 mt-2 font-serif italic">You must identify yourself to view your manuscripts.</p>
              <div className="mt-6">
                <button onClick={() => setShowAuthModal(true)} className="text-amber-500 hover:text-amber-400 font-serif text-xs tracking-widest uppercase transition border border-amber-900/50 hover:border-amber-500/50 px-4 py-2 rounded-sm bg-stone-950">
                  Unlock Archives
                </button>
              </div>
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
                let previewData = null;
                try { previewData = JSON.parse(resume.data); } catch(e) {}
                return (
                  <div key={resume.id} className="bg-stone-900 border border-stone-800 hover:border-amber-700/50 rounded-sm p-6 transition duration-300 group flex flex-col shadow-lg relative h-72">
                    {previewData && (
                      <div className="absolute top-0 left-0 w-full h-full p-6 pt-16 overflow-hidden pointer-events-none opacity-[0.15] group-hover:opacity-[0.25] transition-opacity">
                        <div className="w-full text-center mb-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-500">{previewData.personalInfo?.fullName || "UNKNOWN"}</h4>
                          <div className="w-1/2 h-px bg-amber-700/50 mx-auto my-1" />
                          <p className="text-[6px] uppercase tracking-wider">{previewData.personalInfo?.headline}</p>
                        </div>
                        <div className="text-[5px] leading-relaxed text-justify mt-3 opacity-70 blur-[0.3px]">{previewData.summary?.content}</div>
                        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-stone-900 to-transparent" />
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-6 relative z-20">
                      <div className="bg-stone-950 border border-stone-800 p-3 rounded-sm text-amber-600 shadow-inner">
                        <ScrollText className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                      <button onClick={() => triggerDelete(resume.id)} disabled={isDeleting === resume.id} className="text-stone-600 hover:text-red-500 transition p-2 hover:bg-stone-950 rounded-sm" title="Burn Manuscript">
                        {isDeleting === resume.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flame className="w-5 h-5" strokeWidth={1.5} />}
                      </button>
                    </div>
                    <div className="flex-1 relative z-20 mt-auto flex flex-col justify-end">
                      <h3 className="font-serif text-amber-100 text-xl truncate pr-2" title={resume.title}>{resume.title}</h3>
                      <p className="text-xs text-stone-500 mt-2 font-serif italic">Sealed on {new Date(resume.updatedAt).toLocaleDateString()}</p>
                      <button onClick={() => handleEdit(resume.id, resume.title, resume.data)} className="mt-6 w-full py-3 bg-stone-950/80 backdrop-blur-sm hover:bg-stone-800 border border-stone-800 hover:border-amber-700/80 text-amber-600 hover:text-amber-500 rounded-sm text-sm font-serif tracking-widest uppercase transition flex items-center justify-center gap-3 relative z-10 group-hover:shadow-[0_0_10px_rgba(245,158,11,0.05)]">
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