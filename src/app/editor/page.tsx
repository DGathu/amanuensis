"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import { Plus, Trash2, X, Home, Loader2, Check } from "lucide-react";

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
    data, isEditing, setIsEditing, documentTitle, setDocumentTitle, 
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

  useEffect(() => {
    if (!isEditing) router.push("/");
  }, [isEditing, router]);

  // 🚀 FEATURE: SMART TELEPROMPTER SCROLLING
  useEffect(() => {
    // 1. If we JUST generated new suggestions, scroll the Right Sidebar to the top of the AI block
    if (!prevAiSuggestions.current && aiSuggestions) {
      setTimeout(() => aiResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }

    // 2. Keep the top AI suggestion perfectly centered on the A4 Canvas
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

  const handleGoHome = () => {
    setIsEditing(false);
    router.push("/");
  };

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
      alert("Failed to run AI optimization.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRunTailoring = async () => {
    if (!jobDescription.trim()) return alert("Please paste a job description first.");
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
      alert("Failed to tailor resume.");
    } finally {
      setIsTailoring(false);
    }
  };

  const handleApplyEdit = (suggestion: any, index: number) => {
    const newTextStr = safeRender(suggestion.newText).trim();
    const upperCheck = newTextStr.toUpperCase();
    const isDeletion = upperCheck === "REMOVE_ITEM" || upperCheck === "DELETE" || suggestion.field === "DELETE" || newTextStr === "";

    // 🚀 FIX: STRICT SECTION NORMALIZATION
    // Ensures case-sensitivity mismatches between Gemini and Zustand don't break the app
    const rawSection = (suggestion.section || "").trim().toLowerCase();
    let sectionKey = rawSection;
    if (rawSection === "personalinfo") sectionKey = "personalInfo";
    const validArrayConfig = ARRAY_SECTIONS.find(s => s.key.toLowerCase() === rawSection);
    if (validArrayConfig) sectionKey = validArrayConfig.key;

    const itemId = (suggestion.itemId || "").trim();
    const fieldKey = (suggestion.field || "").trim();

    // 🚀 FIX: ROBUST DELETION LOGIC
    if (isDeletion) {
      if (sectionKey === "summary") {
        updateSummary("");
      } else if (sectionKey === "personalInfo" && fieldKey) {
        updatePersonalInfo({ [fieldKey]: "" });
      } else if (itemId) {
        // AI explicitly wants to delete an entire array item (like an old job)
        removeItem(sectionKey as any, itemId);
      }
    } else {
      // Standard text update
      if (sectionKey === "summary") {
        updateSummary(newTextStr);
      } else if (sectionKey === "personalInfo" && fieldKey) {
        updatePersonalInfo({ [fieldKey]: newTextStr });
      } else if (itemId && fieldKey) {
        updateItem(sectionKey as any, itemId, { [fieldKey]: newTextStr });
      }
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

  if (!isEditing) return <div className="h-screen w-full bg-neutral-950" />;

  const activeModalConfig = ARRAY_SECTIONS.find(sec => sec.key === activeModal);

  return (
    <div className="flex flex-col h-screen w-full bg-neutral-950 text-neutral-200 overflow-hidden font-sans">
      
      {/* TOP NAVBAR */}
      <nav className="h-14 border-b border-neutral-800 bg-neutral-950 flex items-center px-4 shrink-0 z-20 shadow-sm justify-between">
        <div className="flex items-center gap-4">
          <button onClick={handleGoHome} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition" title="Return to Dashboard">
            <Home className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-neutral-800" />
          <input 
            type="text" 
            value={documentTitle} 
            onChange={(e) => setDocumentTitle(e.target.value)} 
            className="bg-transparent text-sm font-semibold text-neutral-300 hover:text-white focus:text-white focus:outline-none w-64 transition"
            placeholder="Untitled Document"
          />
        </div>
      </nav>

      {/* THREE-COLUMN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT COLUMN: Data Entry */}
        <aside className="w-96 border-r border-neutral-800 bg-neutral-950 flex flex-col z-10 shadow-xl">
          <div className="p-4 border-b border-neutral-800">
            <h1 className="font-bold text-lg tracking-tight">Editor</h1>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* DIRECT EDIT: Personal Info */}
            <div className="border border-neutral-800 rounded-md bg-neutral-900 overflow-hidden shrink-0">
              <button 
                className="w-full p-3 font-semibold flex justify-between items-center bg-neutral-900 hover:bg-neutral-800 transition"
                onClick={() => setOpenSection(openSection === "PersonalInfo" ? null : "PersonalInfo")}
              >
                Personal Info
                <span className="text-xs text-neutral-500">{openSection === "PersonalInfo" ? "▼" : "☰"}</span>
              </button>
              {openSection === "PersonalInfo" && (
                <div className="p-4 border-t border-neutral-800 space-y-3 bg-neutral-950">
                  <input type="text" placeholder="Full Name" value={data.personalInfo.fullName} onChange={(e) => updatePersonalInfo({ fullName: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"/>
                  <input type="text" placeholder="Job Title / Headline" value={data.personalInfo.headline} onChange={(e) => updatePersonalInfo({ headline: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"/>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="email" placeholder="Email" value={data.personalInfo.email} onChange={(e) => updatePersonalInfo({ email: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"/>
                    <input type="text" placeholder="Phone" value={data.personalInfo.phone} onChange={(e) => updatePersonalInfo({ phone: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Location" value={data.personalInfo.location} onChange={(e) => updatePersonalInfo({ location: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"/>
                    <input type="text" placeholder="Website URL" value={data.personalInfo.website} onChange={(e) => updatePersonalInfo({ website: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"/>
                  </div>
                </div>
              )}
            </div>

            {/* DIRECT EDIT: Summary */}
            <div className="border border-neutral-800 rounded-md bg-neutral-900 overflow-hidden shrink-0">
              <button 
                className="w-full p-3 font-semibold flex justify-between items-center hover:bg-neutral-800 transition"
                onClick={() => setOpenSection(openSection === "Summary" ? null : "Summary")}
              >
                Summary
                <span className="text-xs text-neutral-500">{openSection === "Summary" ? "▼" : "☰"}</span>
              </button>
              {openSection === "Summary" && (
                <div className="p-4 border-t border-neutral-800 bg-neutral-950">
                  <textarea rows={4} placeholder="Write a brief professional summary..." value={data.summary?.content || ""} onChange={(e) => updateSummary(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white resize-none focus:border-blue-500 outline-none"/>
                </div>
              )}
            </div>

            {/* DYNAMIC MAP FOR ALL ARRAY SECTIONS */}
            {ARRAY_SECTIONS.map((config) => {
              const sectionData = data[config.key as keyof typeof data] as any[];
              const isOpen = openSection === config.key;

              return (
                <div key={config.key} className="border border-neutral-800 rounded-md bg-neutral-900 overflow-hidden shrink-0">
                  <button 
                    className="w-full p-3 font-semibold flex justify-between items-center hover:bg-neutral-800 transition"
                    onClick={() => {
                      setOpenSection(isOpen ? null : config.key);
                      setEditingItemId(null); 
                    }}
                  >
                    {config.label} ({sectionData?.length || 0})
                    <span className="text-xs text-neutral-500">{isOpen ? "▼" : "☰"}</span>
                  </button>
                  
                  {isOpen && (
                    <div className="p-4 border-t border-neutral-800 bg-neutral-950 space-y-3">
                      {sectionData.map((item: any, index: number) => (
                        <div key={item.id || `fallback-${index}`} className="bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
                          
                          <div 
                            className="p-3 flex justify-between items-center group cursor-pointer hover:bg-neutral-800 transition"
                            onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                          >
                            <div className="overflow-hidden">
                              <h4 className="text-sm font-semibold text-white truncate">{config.getTitle(item)}</h4>
                              <p className="text-xs text-neutral-400 truncate">{config.getSubtitle(item)}</p>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeItem(config.key as any, item.id); }}
                              className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition ml-2 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {editingItemId === item.id && (
                            <div className="p-3 border-t border-neutral-800 bg-neutral-950 space-y-2">
                              {Object.keys(item)
                                .filter((key) => key !== "id" && typeof item[key] === "string")
                                .map((key) => {
                                  const isTextArea = key === "description" || key === "content";
                                  return (
                                    <div key={key}>
                                      <label className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1 block">
                                        {key.replace(/([A-Z])/g, " $1").trim()}
                                      </label>
                                      {isTextArea ? (
                                        <textarea
                                          rows={4}
                                          value={item[key]}
                                          onChange={(e) => updateItem(config.key as any, item.id, { [key]: e.target.value })}
                                          className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs text-white resize-none focus:border-blue-500 outline-none"
                                        />
                                      ) : (
                                        <input
                                          type="text"
                                          value={item[key]}
                                          onChange={(e) => updateItem(config.key as any, item.id, { [key]: e.target.value })}
                                          className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs text-white focus:border-blue-500 outline-none"
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
                        className="w-full py-2 border border-dashed border-neutral-700 hover:border-blue-500 text-neutral-400 hover:text-blue-400 rounded text-sm flex items-center justify-center gap-2 transition"
                      >
                        <Plus className="w-4 h-4" /> Add {config.label}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </aside>

        {/* MINISCREEN MODAL */}
        {activeModal && activeModalConfig && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-[500px] flex flex-col">
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                <h3 className="font-semibold text-lg">Add New {activeModalConfig.label}</h3>
                <button onClick={() => setActiveModal(null)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-neutral-400">Clicking save will inject a dummy object into your global state.</p>
              </div>
              <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end gap-3">
                <button onClick={() => setActiveModal(null)} className="px-4 py-2 rounded text-sm text-neutral-400 hover:text-white transition">Cancel</button>
                <button onClick={handleAddNewItem} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* CENTER COLUMN: A4 Canvas */}
        <main className="flex-1 bg-neutral-800 overflow-y-auto flex justify-center py-10 relative print:py-0 print:bg-white scroll-smooth">
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

        {/* RIGHT COLUMN: Layout & AI */}
        <aside className="w-96 border-l border-neutral-800 bg-neutral-950 flex flex-col z-10 shadow-xl relative">
          <div className="p-4 border-b border-neutral-800">
            <h2 className="font-bold text-lg">Layout & AI</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <h3 className="text-xs text-neutral-400 font-semibold mb-3 uppercase tracking-wider">Templates</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-20 bg-neutral-900 rounded border border-neutral-700 hover:border-blue-500 cursor-pointer transition flex items-center justify-center text-xs">Onyx</div>
                <div className="h-20 bg-neutral-900 rounded border border-neutral-700 hover:border-blue-500 cursor-pointer transition flex items-center justify-center text-xs">Classic</div>
              </div>
            </div>
            
            <div className="border-t border-neutral-800 pt-4">
              <h3 className="text-sm text-blue-400 font-semibold mb-2 flex items-center gap-2">✨ Phase 1 & 2: Optimize</h3>
              <p className="text-xs text-neutral-500 mb-4">Shorten redundancies and optimize keywords for ATS readability.</p>
              <button onClick={handleRunOptimization} disabled={isOptimizing} className={`w-full py-2 rounded text-sm font-semibold transition flex items-center justify-center gap-2 ${isOptimizing ? "bg-neutral-800 text-neutral-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
                {isOptimizing && <Loader2 className="w-4 h-4 animate-spin" />}
                {isOptimizing ? "Analyzing Resume..." : "Optimize Resume"}
              </button>
            </div>

            {/* AI AUTO-SCROLL ANCHOR */}
            <div ref={aiResultsRef} />

            {aiSuggestions && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {aiSuggestions.generalFeedback && (
                  <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-md">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">General Feedback</h4>
                    <p className="text-xs text-neutral-300 leading-relaxed mb-3">{safeRender(aiSuggestions.generalFeedback.summary)}</p>
                    <div className="space-y-2 text-xs">
                      {aiSuggestions.generalFeedback.strengths?.map((str, i) => (
                        <div key={i} className="text-green-400 flex gap-1"><Check className="w-3 h-3 shrink-0 mt-0.5"/> <span>{safeRender(str)}</span></div>
                      ))}
                      {aiSuggestions.generalFeedback.fixes?.map((fix, i) => (
                        <div key={i} className="text-yellow-500 flex gap-1"><X className="w-3 h-3 shrink-0 mt-0.5"/> <span>{safeRender(fix)}</span></div>
                      ))}
                    </div>
                  </div>
                )}

                {aiSuggestions.matchStrategy && (
                  <div className="bg-neutral-900 border border-emerald-900/50 p-3 rounded-md">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-2">🎯 Match Strategy</h4>
                    <p className="text-xs text-neutral-300 leading-relaxed mb-3">{safeRender(aiSuggestions.matchStrategy.emphasis)}</p>
                    <div className="space-y-1 text-xs text-neutral-400">
                      <span className="font-semibold text-neutral-300">Key Priorities:</span>
                      <ul className="list-disc pl-4 mt-1">
                        {aiSuggestions.matchStrategy.priorities?.map((priority, i) => (
                          <li key={i}>{safeRender(priority)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {aiSuggestions.suggestedRewrites?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Suggested Edits</h4>
                    <div className="space-y-3">
                      {aiSuggestions.suggestedRewrites.map((suggestion, index) => (
                        <div key={index} className="bg-neutral-900 border border-neutral-800 rounded-md overflow-hidden flex flex-col">
                          <div className="p-2 border-b border-neutral-800 bg-neutral-950 flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">{safeRender(suggestion.section)} • {safeRender(suggestion.field)}</span>
                            <span className="text-[10px] text-blue-400 font-medium px-2 py-0.5 bg-blue-500/10 rounded-full">{safeRender(suggestion.reasoning)}</span>
                          </div>
                          <div className="p-3 text-xs leading-relaxed space-y-2">
                            <div className="line-through text-red-400/70 whitespace-pre-wrap font-mono text-[10px]">{safeRender(suggestion.oldText)}</div>
                            <div className="text-green-400 font-medium whitespace-pre-wrap font-mono text-[10px]">{safeRender(suggestion.newText)}</div>
                          </div>
                          <div className="flex border-t border-neutral-800">
                            <button onClick={() => handleDismissEdit(index)} className="flex-1 py-2 text-xs text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition flex items-center justify-center gap-1"><X className="w-3 h-3" /> Reject</button>
                            <div className="w-px bg-neutral-800" />
                            <button onClick={() => handleApplyEdit(suggestion, index)} className="flex-1 py-2 text-xs text-neutral-300 hover:text-green-400 hover:bg-neutral-800 transition flex items-center justify-center gap-1 font-medium"><Check className="w-3 h-3" /> Apply Edit</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-neutral-800 pt-4 mt-6">
              <h3 className="text-sm text-blue-400 font-semibold mb-2 flex items-center gap-2">🎯 Phase 3 & 4: Tailor to Job</h3>
              <p className="text-xs text-neutral-500 mb-3">Paste a job description to map your skills and reframe your experience.</p>
              <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="w-full h-32 bg-neutral-900 border border-neutral-700 rounded p-2 text-xs focus:border-blue-500 outline-none resize-none" placeholder="Paste Job Description here..."/>
              <button onClick={handleRunTailoring} disabled={isTailoring} className={`w-full mt-2 py-2 rounded text-sm font-semibold transition flex items-center justify-center gap-2 ${isTailoring ? "bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed" : "border border-neutral-700 hover:border-blue-500 text-neutral-300 hover:text-blue-400"}`}>
                {isTailoring && <Loader2 className="w-4 h-4 animate-spin" />}
                {isTailoring ? "Tailoring..." : "Tailor Resume"}
              </button>
            </div>

          </div>
        </aside>
      </div>  
    </div>
  );
}