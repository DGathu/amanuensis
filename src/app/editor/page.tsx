"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import { Plus, Trash2, X, Home, Loader2, Check, Save, AlertTriangle, Flame, Sparkles, Wand2 } from "lucide-react";

type ModalConfig = {
  isOpen: boolean;
  type: "alert" | "success" | "confirm";
  title: string;
  message: string;
  onConfirm?: () => void;
};

// --- HELPERS ---
const RenderDescription = ({ text }: { text?: string }) => {
  if (!text) return null;
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length === 1 && !/^[\-•*]/.test(lines[0])) {
    return <p className="text-sm mt-1 text-gray-800">{lines[0]}</p>;
  }
  return (
    <ul className="list-disc pl-4 mt-1 text-sm text-gray-800 space-y-1">
      {lines.map((line, i) => {
        const cleanLine = line.replace(/^[\-•*]\s*/, '');
        return <li key={i} className="leading-snug">{cleanLine}</li>;
      })}
    </ul>
  );
};

const safeRender = (val: any): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
};

const generateId = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

const ARRAY_SECTIONS = [
  { key: "profiles", label: "Profiles", getTitle: (i: any) => i.network || "New Network", getSubtitle: (i: any) => i.username || "Username", getBlank: () => ({ id: generateId(), network: "LinkedIn", username: "", website: "" }) },
  { key: "experience", label: "Experience", getTitle: (i: any) => i.position || "Untitled Position", getSubtitle: (i: any) => i.company || "Company", getBlank: () => ({ id: generateId(), company: "New Company", position: "Job Title", location: "Nairobi", startDate: "", endDate: "", description: "", website: "" }) },
  { key: "education", label: "Education", getTitle: (i: any) => i.degree || "Degree", getSubtitle: (i: any) => i.school || "School", getBlank: () => ({ id: generateId(), school: "University Name", degree: "Degree", studyArea: "", grade: "", location: "", startDate: "", endDate: "", website: "", description: "" }) },
  { key: "projects", label: "Projects", getTitle: (i: any) => i.name || "Untitled Project", getSubtitle: (i: any) => i.website || "", getBlank: () => ({ id: generateId(), name: "New Project", startDate: "", endDate: "", website: "", description: "" }) },
  { key: "skills", label: "Skills", getTitle: (i: any) => i.name || "New Skill", getSubtitle: (i: any) => i.proficiency || "", getBlank: () => ({ id: generateId(), name: "React", proficiency: "Advanced", keywords: [] }) },
  { key: "languages", label: "Languages", getTitle: (i: any) => i.language || "New Language", getSubtitle: (i: any) => i.fluency || "", getBlank: () => ({ id: generateId(), language: "English", fluency: "Native" }) },
  { key: "interests", label: "Interests", getTitle: (i: any) => i.name || "New Interest", getSubtitle: (i: any) => "", getBlank: () => ({ id: generateId(), name: "Software Development", keywords: [] }) },
  { key: "awards", label: "Awards", getTitle: (i: any) => i.title || "New Award", getSubtitle: (i: any) => i.awarder || "", getBlank: () => ({ id: generateId(), title: "Award Title", awarder: "Issuer", date: "", website: "", description: "" }) },
  { key: "certifications", label: "Certifications", getTitle: (i: any) => i.title || "New Certification", getSubtitle: (i: any) => i.issuer || "", getBlank: () => ({ id: generateId(), title: "Cert Title", issuer: "Issuing Body", date: "", website: "", description: "" }) },
  { key: "publications", label: "Publications", getTitle: (i: any) => i.title || "New Publication", getSubtitle: (i: any) => i.publisher || "", getBlank: () => ({ id: generateId(), title: "Publication Title", publisher: "Publisher", date: "", website: "", description: "" }) },
  { key: "volunteer", label: "Volunteer", getTitle: (i: any) => i.organization || "New Organization", getSubtitle: (i: any) => i.location || "", getBlank: () => ({ id: generateId(), organization: "Org Name", location: "", startDate: "", endDate: "", website: "", description: "" }) },
  { key: "references", label: "References", getTitle: (i: any) => i.name || "Reference Name", getSubtitle: (i: any) => i.position || "", getBlank: () => ({ id: generateId(), name: "John Doe", position: "Manager", phone: "", website: "", description: "" }) }
];

export default function EditorWorkspace() {
  const router = useRouter();
  
  const { 
    data, dbId, setDbId, isEditing, setIsEditing, documentTitle, setDocumentTitle, 
    aiSuggestions, setAiSuggestions, updatePersonalInfo, updateSummary, 
    addItem, updateItem, removeItem, flashedId, triggerFlash 
  } = useResumeStore();
  
  const [openSection, setOpenSection] = useState<string | null>("PersonalInfo");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);

  const aiResultsRef = useRef<HTMLDivElement>(null);
  const prevAiSuggestions = useRef(aiSuggestions);
  const [isSaving, setIsSaving] = useState(false);
  const [modal, setModal] = useState<ModalConfig>({ isOpen: false, type: "alert", title: "", message: "" });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  // Shared thematic input class
  const thematicInputClass = "w-full bg-stone-900/50 border border-stone-800 focus:border-amber-700/60 focus:ring-1 focus:ring-amber-700/30 text-stone-200 rounded-sm p-2.5 text-sm transition-all placeholder-stone-700 outline-none shadow-inner";

  useEffect(() => {
    if (!isEditing) router.push("/");
  }, [isEditing, router]);

  useEffect(() => {
    if (!prevAiSuggestions.current && aiSuggestions) {
      setTimeout(() => aiResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
    if (aiSuggestions?.suggestedRewrites?.length && aiSuggestions.suggestedRewrites.length > 0) {
      const nextSuggestion = aiSuggestions.suggestedRewrites[0];
      const targetId = nextSuggestion.itemId || nextSuggestion.section;
      const element = document.getElementById(`canvas-${targetId.toLowerCase().trim()}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    prevAiSuggestions.current = aiSuggestions;
  }, [aiSuggestions]);

  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: data }), 
      });
      if (!res.ok) throw new Error("Failed to optimize");
      setAiSuggestions(await res.json());
    } catch (error) {
      console.error(error);
      setModal({ isOpen: true, type: "alert", title: "Scribe Failed", message: "Failed to run AI optimization." });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRunTailoring = async () => {
    if (!jobDescription.trim()) return setModal({ isOpen: true, type: "alert", title: "Missing Decree", message: "Please paste a job description first." });
    setIsTailoring(true);
    setAiSuggestions(null); 
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: data, jobDescription }), 
      });
      if (!res.ok) throw new Error("Failed to tailor");
      setAiSuggestions(await res.json());
    } catch (error) {
      console.error(error);
      setModal({ isOpen: true, type: "alert", title: "Scribe Failed", message: "Failed to tailor the manuscript." });
    } finally {
      setIsTailoring(false);
    }
  };

  const handleApplyEdit = (suggestion: any, index: number) => {
    const newTextStr = safeRender(suggestion.newText).trim();
    const upperCheck = newTextStr.toUpperCase();
    const isDeletion = upperCheck === "REMOVE_ITEM" || upperCheck === "DELETE" || suggestion.field === "DELETE" || newTextStr === "";

    const rawSection = (suggestion.section || "").trim().toLowerCase();
    let sectionKey = rawSection;
    if (rawSection === "personalinfo") sectionKey = "personalInfo";
    const validArrayConfig = ARRAY_SECTIONS.find(s => s.key.toLowerCase() === rawSection);
    if (validArrayConfig) sectionKey = validArrayConfig.key;

    const itemId = (suggestion.itemId || "").trim();
    const fieldKey = (suggestion.field || "").trim();

    if (isDeletion) {
      if (sectionKey === "summary") updateSummary("");
      else if (sectionKey === "personalInfo" && fieldKey) updatePersonalInfo({ [fieldKey]: "" });
      else if (itemId) removeItem(sectionKey as any, itemId);
    } else {
      if (sectionKey === "summary") updateSummary(newTextStr);
      else if (sectionKey === "personalInfo" && fieldKey) updatePersonalInfo({ [fieldKey]: newTextStr });
      else if (itemId && fieldKey) updateItem(sectionKey as any, itemId, { [fieldKey]: newTextStr });
    }

    triggerFlash(itemId || sectionKey);

    const updatedSuggestions = { ...aiSuggestions! };
    updatedSuggestions.suggestedRewrites.splice(index, 1);
    
    if (updatedSuggestions.suggestedRewrites.length === 0 && !updatedSuggestions.generalFeedback && !updatedSuggestions.matchStrategy) {
       setAiSuggestions(null);
    } else {
       setAiSuggestions(updatedSuggestions);
    }
  };

  const handleDismissEdit = (index: number) => {
    const updatedSuggestions = { ...aiSuggestions! };
    updatedSuggestions.suggestedRewrites.splice(index, 1);
    if (updatedSuggestions.suggestedRewrites.length === 0 && !updatedSuggestions.generalFeedback && !updatedSuggestions.matchStrategy) {
       setAiSuggestions(null);
    } else {
       setAiSuggestions(updatedSuggestions);
    }
  };

  const handleAddNewItem = () => {
    if (!activeModal) return;
    const config = ARRAY_SECTIONS.find(sec => sec.key === activeModal);
    if (config) {
      addItem(config.key as any, config.getBlank());
    }
    setActiveModal(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dbId, title: documentTitle, data: data }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const savedResume = await res.json();
      setDbId(savedResume.id); 
      
      setModal({ 
        isOpen: true, type: "success", 
        title: "Manuscript Bound", 
        message: "Your parchment has been securely saved to the archives." 
      });

    } catch (error) {
      console.error(error);
      setModal({ 
        isOpen: true, type: "alert", 
        title: "Archive Failed", 
        message: "Could not reach the database to save your progress." 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) return <div className="h-screen w-full bg-stone-950" />;

  const activeModalConfig = ARRAY_SECTIONS.find(sec => sec.key === activeModal);

  return (
    <div className="h-screen w-full flex flex-col bg-stone-950 text-stone-300 font-sans overflow-hidden selection:bg-amber-900/50">
      
      {/* --- CUSTOM MODAL OVERLAY --- */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-amber-900/50 p-6 sm:p-8 rounded-sm shadow-2xl max-w-md w-full relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${modal.type === "success" ? "via-emerald-600" : modal.type === "confirm" ? "via-red-600" : "via-amber-700"} to-transparent opacity-50`} />
            
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-stone-950 border border-stone-800 p-3 rounded-sm shadow-inner">
                {modal.type === "success" ? <Check className="w-6 h-6 text-emerald-500" /> : 
                 modal.type === "confirm" ? <Flame className="w-6 h-6 text-red-500" /> : 
                 <AlertTriangle className="w-6 h-6 text-amber-500" />}
              </div>
              <div>
                <h3 className="text-xl font-serif text-stone-100">{modal.title}</h3>
                <p className="text-stone-400 text-sm mt-2 font-serif italic leading-relaxed">{modal.message}</p>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button onClick={closeModal} className="px-6 py-2 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 rounded-sm text-sm font-medium transition">
                {modal.type === "confirm" ? "Cancel" : "Understood"}
              </button>
              {modal.type === "confirm" && (
                <button onClick={modal.onConfirm} className="px-6 py-2 bg-red-950/40 hover:bg-red-900 border border-red-900/50 text-red-400 rounded-sm text-sm font-medium transition">
                  Cast to Fire
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVBAR */}
      <nav className="h-14 border-b border-stone-800 bg-stone-950 flex items-center px-4 shrink-0 z-20 shadow-sm justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="p-2 text-stone-500 hover:text-amber-500 hover:bg-stone-900 rounded-sm transition" title="Return to Archives">
            <Home className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-stone-800" />
          <input 
            type="text" 
            value={documentTitle} 
            onChange={(e) => setDocumentTitle(e.target.value)} 
            className="bg-transparent text-sm font-serif italic text-amber-500/80 hover:text-amber-400 focus:text-amber-500 focus:outline-none w-64 transition placeholder-stone-700"
            placeholder="Untitled Parchment"
          />
        </div>

        {/* SAVE BUTTON */}
        <div className="flex items-center gap-3">
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="flex items-center gap-2 bg-stone-900 border border-stone-800 hover:border-amber-700/80 hover:text-amber-500 text-stone-300 px-5 py-2 rounded-sm text-xs font-serif tracking-widest uppercase transition disabled:opacity-50 shadow-inner"
           >
             {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-amber-600"/> : <Save className="w-4 h-4 text-amber-600/70" />}
             {isSaving ? "Binding..." : "Save to Archive"}
           </button>
        </div>
      </nav>

      {/* THREE-COLUMN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT COLUMN: Data Entry (The Ledger) */}
        <aside className="w-[400px] border-r border-stone-800/80 bg-stone-950 flex flex-col z-10 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.5)]">
          <div className="p-5 border-b border-stone-800/80 bg-stone-950">
            <h1 className="text-xl font-serif text-amber-500 tracking-wide flex items-center gap-3">
              <div className="w-1.5 h-1.5 rotate-45 bg-amber-700" />
              Scribe's Ledger
            </h1>
            <p className="text-xs text-stone-500 font-serif italic mt-1.5">Record your history for the manuscript.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            
            {/* DIRECT EDIT: Personal Info */}
            <div className="border border-stone-800 rounded-sm bg-stone-900/50 overflow-hidden shrink-0 shadow-sm">
              <button 
                className="w-full p-3 font-serif tracking-wide text-stone-200 flex justify-between items-center hover:bg-stone-800 transition"
                onClick={() => setOpenSection(openSection === "PersonalInfo" ? null : "PersonalInfo")}
              >
                Personal Info
                <span className="text-xs text-stone-500">{openSection === "PersonalInfo" ? "▼" : "☰"}</span>
              </button>
              {openSection === "PersonalInfo" && (
                <div className="p-4 border-t border-stone-800 space-y-3 bg-stone-950">
                  <input type="text" placeholder="Full Name" value={data.personalInfo.fullName} onChange={(e) => updatePersonalInfo({ fullName: e.target.value })} className={thematicInputClass}/>
                  <input type="text" placeholder="Job Title / Headline" value={data.personalInfo.headline} onChange={(e) => updatePersonalInfo({ headline: e.target.value })} className={thematicInputClass}/>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="email" placeholder="Email" value={data.personalInfo.email} onChange={(e) => updatePersonalInfo({ email: e.target.value })} className={thematicInputClass}/>
                    <input type="text" placeholder="Phone" value={data.personalInfo.phone} onChange={(e) => updatePersonalInfo({ phone: e.target.value })} className={thematicInputClass}/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Location" value={data.personalInfo.location} onChange={(e) => updatePersonalInfo({ location: e.target.value })} className={thematicInputClass}/>
                    <input type="text" placeholder="Website URL" value={data.personalInfo.website} onChange={(e) => updatePersonalInfo({ website: e.target.value })} className={thematicInputClass}/>
                  </div>
                </div>
              )}
            </div>

            {/* DIRECT EDIT: Summary */}
            <div className="border border-stone-800 rounded-sm bg-stone-900/50 overflow-hidden shrink-0 shadow-sm">
              <button 
                className="w-full p-3 font-serif tracking-wide text-stone-200 flex justify-between items-center hover:bg-stone-800 transition"
                onClick={() => setOpenSection(openSection === "Summary" ? null : "Summary")}
              >
                Summary
                <span className="text-xs text-stone-500">{openSection === "Summary" ? "▼" : "☰"}</span>
              </button>
              {openSection === "Summary" && (
                <div className="p-4 border-t border-stone-800 bg-stone-950">
                  <textarea rows={4} placeholder="Write a brief professional summary..." value={data.summary?.content || ""} onChange={(e) => updateSummary(e.target.value)} className={`${thematicInputClass} resize-none`}/>
                </div>
              )}
            </div>

            {/* DYNAMIC MAP FOR ALL ARRAY SECTIONS */}
            {ARRAY_SECTIONS.map((config) => {
              const sectionData = data[config.key as keyof typeof data] as any[];
              const isOpen = openSection === config.key;

              return (
                <div key={config.key} className="border border-stone-800 rounded-sm bg-stone-900/50 overflow-hidden shrink-0 shadow-sm">
                  <button 
                    className="w-full p-3 font-serif tracking-wide text-stone-200 flex justify-between items-center hover:bg-stone-800 transition"
                    onClick={() => {
                      setOpenSection(isOpen ? null : config.key);
                      setEditingItemId(null); 
                    }}
                  >
                    {config.label} ({sectionData?.length || 0})
                    <span className="text-xs text-stone-500">{isOpen ? "▼" : "☰"}</span>
                  </button>
                  
                  {isOpen && (
                    <div className="p-4 border-t border-stone-800 bg-stone-950 space-y-3">
                      {sectionData.map((item: any, index: number) => (
                        <div key={item.id || `fallback-${index}`} className="bg-stone-900/50 border border-stone-800 rounded-sm overflow-hidden">
                          
                          <div 
                            className="p-3 flex justify-between items-center group cursor-pointer hover:bg-stone-800 transition"
                            onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                          >
                            <div className="overflow-hidden">
                              <h4 className="text-sm font-semibold text-stone-200 truncate">{config.getTitle(item)}</h4>
                              <p className="text-xs text-stone-500 truncate">{config.getSubtitle(item)}</p>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeItem(config.key as any, item.id); }}
                              className="text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition ml-2 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {editingItemId === item.id && (
                            <div className="p-3 border-t border-stone-800 bg-stone-950 space-y-3">
                              {Object.keys(item)
                                .filter((key) => key !== "id" && typeof item[key] === "string")
                                .map((key) => {
                                  const isTextArea = key === "description" || key === "content";
                                  return (
                                    <div key={key}>
                                      <label className="text-[10px] text-amber-600/70 font-serif uppercase tracking-widest mb-1.5 ml-0.5 block">
                                        {key.replace(/([A-Z])/g, " $1").trim()}
                                      </label>
                                      {isTextArea ? (
                                        <textarea
                                          rows={4}
                                          value={item[key]}
                                          onChange={(e) => updateItem(config.key as any, item.id, { [key]: e.target.value })}
                                          className={`${thematicInputClass} resize-none text-xs`}
                                        />
                                      ) : (
                                        <input
                                          type="text"
                                          value={item[key]}
                                          onChange={(e) => updateItem(config.key as any, item.id, { [key]: e.target.value })}
                                          className={`${thematicInputClass} text-xs`}
                                        />
                                      )}
                                    </div>
                                  );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <button 
                        onClick={() => {
                          const newItem = config.getBlank();
                          addItem(config.key as any, newItem);
                          setEditingItemId(newItem.id); 
                        }}
                        className="w-full mt-4 py-2 border border-dashed border-stone-700 hover:border-amber-600/60 text-amber-600/70 hover:text-amber-500 bg-stone-950 hover:bg-stone-900 rounded-sm text-xs font-serif tracking-widest uppercase transition-all flex justify-center items-center gap-2"
                      >
                        <Plus className="w-3 h-3" /> Add {config.label}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </aside>

        {/* MINISCREEN MODAL FOR ADDING ITEMS */}
        {activeModal && activeModalConfig && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm">
            <div className="bg-stone-900 border border-amber-900/50 rounded-sm shadow-2xl w-[500px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-700 to-transparent opacity-50" />
              <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950">
                <h3 className="font-serif text-xl text-amber-500">Add New {activeModalConfig.label}</h3>
                <button onClick={() => setActiveModal(null)} className="text-stone-500 hover:text-amber-500 transition"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-stone-400 font-serif italic">Clicking save will inject a dummy object into your global state.</p>
              </div>
              <div className="p-4 border-t border-stone-800 bg-stone-950 flex justify-end gap-4">
                <button onClick={() => setActiveModal(null)} className="px-6 py-2 rounded-sm text-sm font-medium text-stone-500 hover:text-stone-300 transition">Cancel</button>
                <button onClick={handleAddNewItem} className="px-6 py-2 bg-stone-900 border border-amber-900/50 hover:border-amber-500/80 text-amber-500 rounded-sm text-sm font-serif tracking-widest uppercase shadow-inner hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* CENTER COLUMN: A4 Canvas (Untouched styling for PDF) */}
        <main className="flex-1 bg-[#1c1917] overflow-y-auto flex justify-center py-10 relative print:py-0 print:bg-white scroll-smooth custom-scrollbar">
          <div
            id="print-area"
            className="a4-canvas bg-white text-black shadow-2xl relative transition-all duration-300"
            style={{ width: "210mm", minHeight: "297mm", height: "max-content", padding: "20mm" }}
          >
            <header id="canvas-personalinfo" className={`text-center mb-6 prevent-break ${flashedId === 'personalInfo' ? 'flash-highlight' : ''}`}>
              <h1 className="text-3xl font-bold uppercase tracking-wide">{data.personalInfo.fullName || "Your Name"}</h1>
              {data.personalInfo.headline && <h2 className="text-lg font-medium text-blue-700 mt-1 prevent-break">{data.personalInfo.headline}</h2>}
              <p className="text-sm text-gray-600 mt-1 prevent-break">
                {[data.personalInfo.email, data.personalInfo.phone, data.personalInfo.location].filter(Boolean).join(" • ")}
              </p>
              {data.personalInfo.website && <p className="text-xs text-gray-500 mt-1 prevent-break">{data.personalInfo.website}</p>}
              {data.profiles?.length > 0 && <p className="text-xs text-gray-500 mt-1 prevent-break">{data.profiles.map(p => p.username || p.network).join(" | ")}</p>}
            </header>

            {data.summary?.content && (
              <section id="canvas-summary" className={`mb-5 prevent-break ${flashedId === 'summary' ? 'flash-highlight' : ''}`}>
                <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Summary</h2>
                <p className="text-sm leading-relaxed text-gray-800">{data.summary.content}</p>
              </section>
            )}

            {data.experience?.length > 0 && (
              <section id="canvas-experience" className="mb-5 prevent-break">
                <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Experience</h2>
                {data.experience.map((exp, idx) => (
                  <div key={exp.id || `exp-${idx}`} id={`canvas-${exp.id}`} className={`mb-3 prevent-break ${flashedId === exp.id ? 'flash-highlight' : ''}`}>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>{exp.position} {exp.company && `— ${exp.company}`}</span>
                      <span>{exp.startDate} {exp.endDate ? `- ${exp.endDate}` : ""}</span>
                    </div>
                    {exp.location && <p className="text-xs text-gray-600 italic">{exp.location}</p>}
                    <RenderDescription text={exp.description} />
                  </div>
                ))}
              </section>
            )}

            {data.education?.length > 0 && (
              <section id="canvas-education" className="mb-5 prevent-break">
                <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Education</h2>
                {data.education.map((edu, idx) => (
                  <div key={edu.id || `edu-${idx}`} id={`canvas-${edu.id}`} className={`mb-3 prevent-break ${flashedId === edu.id ? 'flash-highlight' : ''}`}>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>{edu.degree} {edu.school && `— ${edu.school}`}</span>
                      <span>{edu.startDate} {edu.endDate ? `- ${edu.endDate}` : ""}</span>
                    </div>
                    {edu.location && <p className="text-xs text-gray-600 italic">{edu.location}</p>}
                    <RenderDescription text={edu.description} />
                  </div>
                ))}
              </section>
            )}

            {data.projects?.length > 0 && (
              <section id="canvas-projects" className="mb-5 prevent-break">
                <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Projects</h2>
                {data.projects.map((proj, idx) => (
                  <div key={proj.id || `proj-${idx}`} id={`canvas-${proj.id}`} className={`mb-3 prevent-break ${flashedId === proj.id ? 'flash-highlight' : ''}`}>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>{proj.name}</span>
                      <span>{proj.startDate} {proj.endDate ? `- ${proj.endDate}` : ""}</span>
                    </div>
                    <RenderDescription text={proj.description} />
                  </div>
                ))}
              </section>
            )}

            {(data.awards?.length > 0 || data.certifications?.length > 0) && (
              <section className="mb-5 prevent-break">
                <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Awards & Certifications</h2>
                {[...data.awards, ...data.certifications].map((item: any, idx) => (
                  <div key={item.id || `ac-${idx}`} id={`canvas-${item.id}`} className={`mb-2 text-sm prevent-break ${flashedId === item.id ? 'flash-highlight' : ''}`}>
                    <span className="font-semibold">{item.title}</span> — {item.awarder || item.issuer}
                    <span className="text-gray-500 ml-2 text-xs">{item.date}</span>
                    <RenderDescription text={item.description} />
                  </div>
                ))}
              </section>
            )}

            <div className="grid grid-cols-2 gap-4 prevent-break">
              {data.skills?.length > 0 && (
                <section id="canvas-skills">
                  <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Skills</h2>
                  <div className="flex flex-wrap gap-1 mt-1 text-sm">
                    {data.skills.map((skill, idx) => (
                      <div key={skill.id || `skill-${idx}`} id={`canvas-${skill.id}`} className={`bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium prevent-break ${flashedId === skill.id ? 'flash-highlight' : ''}`}>
                        {skill.name} {skill.proficiency && `(${skill.proficiency})`}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {data.languages?.length > 0 && (
                <section id="canvas-languages">
                  <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Languages</h2>
                  <div className="flex flex-wrap gap-1 mt-1 text-sm">
                    {data.languages.map((lang, idx) => (
                      <div key={lang.id || `lang-${idx}`} id={`canvas-${lang.id}`} className={`bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium prevent-break ${flashedId === lang.id ? 'flash-highlight' : ''}`}>
                        {lang.language} ({lang.fluency})
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {data.interests?.length > 0 && (
                <section id="canvas-interests">
                  <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Interests</h2>
                  <div className="flex flex-wrap gap-1 mt-1 text-sm">
                    {data.interests.map((interest, idx) => (
                      <div key={interest.id || `int-${idx}`} id={`canvas-${interest.id}`} className={`bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium ${flashedId === interest.id ? 'flash-highlight' : ''}`}>
                        {interest.name}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {data.publications?.length > 0 && (
              <section id="canvas-publications" className="mb-5 prevent-break mt-4">
                <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Publications</h2>
                {data.publications.map((pub, idx) => (
                  <div key={pub.id || `pub-${idx}`} id={`canvas-${pub.id}`} className={`mb-3 ${flashedId === pub.id ? 'flash-highlight' : ''}`}>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>{pub.title} {pub.publisher && `— ${pub.publisher}`}</span>
                      <span>{pub.date}</span>
                    </div>
                    <RenderDescription text={pub.description} />
                  </div>
                ))}
              </section>
            )}

            {data.volunteer?.length > 0 && (
              <section id="canvas-volunteer" className="mb-5 prevent-break">
                <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Volunteer Experience</h2>
                {data.volunteer.map((vol, idx) => (
                  <div key={vol.id || `vol-${idx}`} id={`canvas-${vol.id}`} className={`mb-3 ${flashedId === vol.id ? 'flash-highlight' : ''}`}>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>{vol.organization}</span>
                      <span>{vol.startDate} {vol.endDate ? `- ${vol.endDate}` : ""}</span>
                    </div>
                    {vol.location && <p className="text-xs text-gray-600 italic">{vol.location}</p>}
                    <RenderDescription text={vol.description} />
                  </div>
                ))}
              </section>
            )}

            {data.references?.length > 0 && (
              <section id="canvas-references" className="mb-5 prevent-break">
                <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">References</h2>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {data.references.map((ref, idx) => (
                    <div key={ref.id || `ref-${idx}`} id={`canvas-${ref.id}`} className={`text-sm ${flashedId === ref.id ? 'flash-highlight' : ''}`}>
                      <div className="font-semibold">{ref.name}</div>
                      {ref.position && <div className="text-gray-600 text-xs">{ref.position}</div>}
                      {ref.phone && <div className="text-gray-800 text-xs">{ref.phone}</div>}
                      {ref.description && <div className="text-gray-500 text-xs italic mt-1">{ref.description}</div>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>

        {/* RIGHT COLUMN: AI Counsel */}
        <aside className="w-[380px] border-l border-stone-800/80 bg-stone-950 flex flex-col z-10 shadow-[-4px_0_24px_-10px_rgba(0,0,0,0.5)]">
          <div className="p-5 border-b border-stone-800/80 bg-stone-950">
            <h2 className="text-xl font-serif text-amber-500 tracking-wide flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-600" />
              AI Counsel
            </h2>
            <p className="text-xs text-stone-500 font-serif italic mt-1.5">Consult the scribe to refine your parchment.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
            
            {/* OPTIMIZE SECTION */}
            <div>
              <h3 className="text-xs text-amber-600/70 font-serif uppercase tracking-widest mb-2 flex items-center gap-2">Phase 1 & 2: Optimize</h3>
              <p className="text-xs text-stone-400 mb-4 font-serif italic">Shorten redundancies and optimize keywords for readability.</p>
              <button onClick={handleRunOptimization} disabled={isOptimizing} className={`w-full py-3.5 rounded-sm text-xs font-serif tracking-widest uppercase transition-all flex items-center justify-center gap-2 group relative overflow-hidden shadow-inner ${isOptimizing ? "bg-stone-900 border border-stone-800 text-stone-500 cursor-not-allowed" : "bg-stone-900 border border-amber-900/50 hover:border-amber-500/80 text-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]"}`}>
                {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin text-amber-700" /> : <Wand2 className="w-4 h-4 text-amber-600" />}
                {isOptimizing ? "Scribe is reading..." : "Run Optimization"}
              </button>
            </div>

            {/* AI AUTO-SCROLL ANCHOR */}
            <div ref={aiResultsRef} />

            {/* AI FEEDBACK CARDS */}
            {aiSuggestions && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {aiSuggestions.generalFeedback && (
                  <div className="bg-stone-900/80 border border-stone-800 border-l-2 border-l-amber-600 rounded-r-sm p-4 relative shadow-sm">
                    <h4 className="text-[10px] font-serif uppercase tracking-widest text-amber-500 bg-amber-900/20 px-2 py-0.5 rounded-sm inline-block mb-3">General Feedback</h4>
                    <p className="text-xs text-stone-300 leading-relaxed mb-4 font-serif">{safeRender(aiSuggestions.generalFeedback.summary)}</p>
                    <div className="space-y-2 text-xs font-serif italic">
                      {aiSuggestions.generalFeedback.strengths?.map((str, i) => (
                        <div key={i} className="text-emerald-500/90 flex gap-2"><Check className="w-3 h-3 shrink-0 mt-0.5"/> <span>{safeRender(str)}</span></div>
                      ))}
                      {aiSuggestions.generalFeedback.fixes?.map((fix, i) => (
                        <div key={i} className="text-amber-500/90 flex gap-2"><X className="w-3 h-3 shrink-0 mt-0.5"/> <span>{safeRender(fix)}</span></div>
                      ))}
                    </div>
                  </div>
                )}

                {aiSuggestions.matchStrategy && (
                  <div className="bg-stone-900/80 border border-stone-800 border-l-2 border-l-emerald-600 rounded-r-sm p-4 relative shadow-sm">
                    <h4 className="text-[10px] font-serif uppercase tracking-widest text-emerald-500 bg-emerald-900/20 px-2 py-0.5 rounded-sm inline-block mb-3">Match Strategy</h4>
                    <p className="text-xs text-stone-300 leading-relaxed mb-4 font-serif">{safeRender(aiSuggestions.matchStrategy.emphasis)}</p>
                    <div className="space-y-1 text-xs text-stone-400 font-serif italic">
                      <span className="font-semibold text-stone-300 not-italic">Key Priorities:</span>
                      <ul className="list-disc pl-4 mt-2 space-y-1">
                        {aiSuggestions.matchStrategy.priorities?.map((priority, i) => (
                          <li key={i}>{safeRender(priority)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {aiSuggestions.suggestedRewrites?.length > 0 && (
                  <div>
                    <h4 className="text-xs text-amber-600/70 font-serif uppercase tracking-widest mb-3 flex items-center gap-2">Suggested Edits</h4>
                    <div className="space-y-4">
                      {aiSuggestions.suggestedRewrites.map((suggestion, index) => (
                        <div key={index} className="bg-stone-900/80 border border-stone-800 border-l-2 border-l-amber-600 rounded-r-sm p-4 relative shadow-sm flex flex-col">
                          
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-serif uppercase tracking-widest text-amber-500 bg-amber-900/20 px-2 py-0.5 rounded-sm">
                              {safeRender(suggestion.section)} • {safeRender(suggestion.field)}
                            </span>
                          </div>
                          
                          <div className="text-xs leading-relaxed space-y-3">
                            <div className="line-through decoration-stone-700 text-stone-500 whitespace-pre-wrap font-serif italic">{safeRender(suggestion.oldText)}</div>
                            <div className="text-stone-200 font-medium whitespace-pre-wrap">{safeRender(suggestion.newText)}</div>
                            <div className="text-[14px] text-amber-600/70 font-serif italic border-t border-stone-800/80 pt-2 mt-2">
                              Reasoning: {safeRender(suggestion.reasoning)}
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-4 pt-1">
                            <button onClick={() => handleDismissEdit(index)} className="flex-1 py-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-red-900/50 text-stone-500 hover:text-red-400 rounded-sm text-xs font-serif uppercase tracking-widest transition-all">
                              Reject
                            </button>
                            <button onClick={() => handleApplyEdit(suggestion, index)} className="flex-1 py-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-emerald-700/50 text-emerald-600 hover:text-emerald-500 rounded-sm text-xs font-serif uppercase tracking-widest transition-all">
                              Accept
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAILOR SECTION */}
            <div className="border-t border-stone-800/80 pt-6">
              <h3 className="text-xs text-amber-600/70 font-serif uppercase tracking-widest mb-2 flex items-center gap-2">Phase 3 & 4: Tailor</h3>
              <p className="text-xs text-stone-400 mb-3 font-serif italic">Paste a job decree to map your skills.</p>
              <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className={`${thematicInputClass} h-32 resize-none mb-3`} placeholder="Paste Job Description here..."/>
              <button onClick={handleRunTailoring} disabled={isTailoring} className={`w-full py-3.5 rounded-sm text-xs font-serif tracking-widest uppercase transition-all flex items-center justify-center gap-2 group relative overflow-hidden shadow-inner ${isTailoring ? "bg-stone-900 border border-stone-800 text-stone-500 cursor-not-allowed" : "bg-stone-900 border border-amber-900/50 hover:border-amber-500/80 text-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]"}`}>
                {isTailoring && <Loader2 className="w-4 h-4 animate-spin text-amber-700" />}
                {isTailoring ? "Forging alignment..." : "Tailor Manuscript"}
              </button>
            </div>

          </div>
        </aside>
      </div>  
    </div>
  );
}