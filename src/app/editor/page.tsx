"use client";

import React, { useState, useEffect } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

// --- HELPER COMPONENT FOR BULLET POINTS ---
const RenderDescription = ({ text }: { text?: string }) => {
  if (!text) return null;
  // Split text by newlines and filter out empty strings
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // If it's just one line and has no bullet characters, render as a paragraph
  if (lines.length === 1 && !/^[\-•*]/.test(lines[0])) {
    return <p className="text-sm mt-1 text-gray-800">{lines[0]}</p>;
  }

  // Otherwise, render as a proper bulleted list
  return (
    <ul className="list-disc pl-4 mt-1 text-sm text-gray-800 space-y-1">
      {lines.map((line, i) => {
        // Strip the raw bullet characters so the HTML <li> can handle the bulleting
        const cleanLine = line.replace(/^[\-•*]\s*/, '');
        return <li key={i} className="leading-snug">{cleanLine}</li>;
      })}
    </ul>
  );
};
// --- CONFIGURATION FOR ARRAY SECTIONS ---
// This prevents us from writing 1,000 lines of repeated UI code.
const ARRAY_SECTIONS = [
  {
    key: "profiles", label: "Profiles",
    getTitle: (i: any) => i.network || "New Network", getSubtitle: (i: any) => i.username || "Username",
    getBlank: () => ({ id: crypto.randomUUID(), network: "LinkedIn", username: "", website: "" })
  },
  {
    key: "experience", label: "Experience",
    getTitle: (i: any) => i.position || "Untitled Position", getSubtitle: (i: any) => i.company || "Company",
    getBlank: () => ({ id: crypto.randomUUID(), company: "New Company", position: "Job Title", location: "Nairobi", startDate: "", endDate: "", description: "", website: "" })
  },
  {
    key: "education", label: "Education",
    getTitle: (i: any) => i.degree || "Degree", getSubtitle: (i: any) => i.school || "School",
    getBlank: () => ({ id: crypto.randomUUID(), school: "University Name", degree: "Degree", studyArea: "", grade: "", location: "", startDate: "", endDate: "", website: "", description: "" })
  },
  {
    key: "projects", label: "Projects",
    getTitle: (i: any) => i.name || "Untitled Project", getSubtitle: (i: any) => i.website || "",
    getBlank: () => ({ id: crypto.randomUUID(), name: "New Project", startDate: "", endDate: "", website: "", description: "" })
  },
  {
    key: "skills", label: "Skills",
    getTitle: (i: any) => i.name || "New Skill", getSubtitle: (i: any) => i.proficiency || "",
    getBlank: () => ({ id: crypto.randomUUID(), name: "Docker", proficiency: "Intermediate", keywords: [] })
  },
  {
    key: "languages", label: "Languages",
    getTitle: (i: any) => i.language || "New Language", getSubtitle: (i: any) => i.fluency || "",
    getBlank: () => ({ id: crypto.randomUUID(), language: "English", fluency: "Native" })
  },
  {
    key: "interests", label: "Interests",
    getTitle: (i: any) => i.name || "New Interest", getSubtitle: (i: any) => "",
    getBlank: () => ({ id: crypto.randomUUID(), name: "Software Development", keywords: [] })
  },
  {
    key: "awards", label: "Awards",
    getTitle: (i: any) => i.title || "New Award", getSubtitle: (i: any) => i.awarder || "",
    getBlank: () => ({ id: crypto.randomUUID(), title: "Award Title", awarder: "Issuer", date: "", website: "", description: "" })
  },
  {
    key: "certifications", label: "Certifications",
    getTitle: (i: any) => i.title || "New Certification", getSubtitle: (i: any) => i.issuer || "",
    getBlank: () => ({ id: crypto.randomUUID(), title: "Cert Title", issuer: "Issuing Body", date: "", website: "", description: "" })
  },
  {
    key: "publications", label: "Publications",
    getTitle: (i: any) => i.title || "New Publication", getSubtitle: (i: any) => i.publisher || "",
    getBlank: () => ({ id: crypto.randomUUID(), title: "Publication Title", publisher: "Publisher", date: "", website: "", description: "" })
  },
  {
    key: "volunteer", label: "Volunteer",
    getTitle: (i: any) => i.organization || "New Organization", getSubtitle: (i: any) => i.location || "",
    getBlank: () => ({ id: crypto.randomUUID(), organization: "Org Name", location: "", startDate: "", endDate: "", website: "", description: "" })
  },
  {
    key: "references", label: "References",
    getTitle: (i: any) => i.name || "Reference Name", getSubtitle: (i: any) => i.position || "",
    getBlank: () => ({ id: crypto.randomUUID(), name: "John Doe", position: "Manager", phone: "", website: "", description: "" })
  }
];

export default function EditorWorkspace() {
  const router = useRouter();
  const { data, isEditing, updatePersonalInfo, updateSummary, addItem, removeItem } = useResumeStore();
  
  // --- REDIRECT GUARD ---
  useEffect(() => {
    if (!isEditing) {
      router.push("/");
    }
  }, [isEditing, router]);

  // Prevent flashing the editor UI before redirecting
  if (!isEditing) return <div className="h-screen w-full bg-neutral-950" />;

  const [openSection, setOpenSection] = useState<string | null>("PersonalInfo");
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const handleAddNewItem = () => {
    if (!activeModal) return;
    const config = ARRAY_SECTIONS.find(sec => sec.key === activeModal);
    if (config) {
      addItem(config.key as any, config.getBlank());
    }
    setActiveModal(null);
  };

  const activeModalConfig = ARRAY_SECTIONS.find(sec => sec.key === activeModal);

  return (
    <div className="flex h-screen w-full bg-neutral-950 text-neutral-200 overflow-hidden font-sans relative">
      
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
                <input 
                  type="text" placeholder="Full Name" value={data.personalInfo.fullName}
                  onChange={(e) => updatePersonalInfo({ fullName: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                />
                <input 
                  type="text" placeholder="Job Title / Headline" value={data.personalInfo.headline}
                  onChange={(e) => updatePersonalInfo({ headline: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="email" placeholder="Email" value={data.personalInfo.email}
                    onChange={(e) => updatePersonalInfo({ email: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                  />
                  <input 
                    type="text" placeholder="Phone" value={data.personalInfo.phone}
                    onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                  />
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
                <textarea 
                  rows={4} placeholder="Write a brief professional summary..."
                  value={data.summary?.content || ""}
                  onChange={(e) => updateSummary(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white resize-none focus:border-blue-500 outline-none"
                />
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
                  onClick={() => setOpenSection(isOpen ? null : config.key)}
                >
                  {config.label} ({sectionData?.length || 0})
                  <span className="text-xs text-neutral-500">{isOpen ? "▼" : "☰"}</span>
                </button>
                
                {isOpen && (
                  <div className="p-4 border-t border-neutral-800 bg-neutral-950 space-y-3">
                    {sectionData.map((item: any) => (
                      <div key={item.id} className="p-3 bg-neutral-900 border border-neutral-800 rounded flex justify-between items-center group">
                        <div className="overflow-hidden">
                          <h4 className="text-sm font-semibold text-white truncate">{config.getTitle(item)}</h4>
                          <p className="text-xs text-neutral-400 truncate">{config.getSubtitle(item)}</p>
                        </div>
                        <button 
                          onClick={() => removeItem(config.key as any, item.id)}
                          className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    <button 
                      onClick={() => setActiveModal(config.key)}
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

      {/* MINISCREEN MODAL (Dynamic for all sections) */}
      {activeModal && activeModalConfig && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-[500px] flex flex-col">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Add New {activeModalConfig.label}</h3>
              <button onClick={() => setActiveModal(null)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-neutral-400">
                Clicking save will inject a dummy object into your global state for the <strong className="text-white">{activeModalConfig.label}</strong> section. 
                Full form fields for editing inside the modal will be built in the future.
              </p>
            </div>
            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 rounded text-sm text-neutral-400 hover:text-white transition">Cancel</button>
              <button onClick={handleAddNewItem} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition">
                Save {activeModalConfig.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CENTER COLUMN: A4 Canvas */}
      <main className="flex-1 bg-neutral-800 overflow-y-auto flex justify-center py-10 relative">
        <div
          className="bg-white text-black shadow-2xl relative"
          style={{ width: "210mm", minHeight: "297mm", padding: "20mm" }}
        >
          {/* HEADER */}
          <header className="text-center mb-6">
            <h1 className="text-3xl font-bold uppercase tracking-wide">
              {data.personalInfo.fullName || "Your Name"}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {[data.personalInfo.email, data.personalInfo.phone, data.personalInfo.location]
                .filter(Boolean)
                .join(" • ")}
            </p>
            {/* PROFILES */}
            {data.profiles?.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {data.profiles.map(p => p.username || p.network).join(" | ")}
              </p>
            )}
          </header>

          {/* SUMMARY */}
          {data.summary?.content && (
            <section className="mb-5">
              <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Summary</h2>
              <p className="text-sm leading-relaxed text-gray-800">{data.summary.content}</p>
            </section>
          )}

          {/* EXPERIENCE */}
          {data.experience?.length > 0 && (
            <section className="mb-5">
              <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Experience</h2>
              {data.experience.map((exp) => (
                <div key={exp.id} className="mb-3">
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

          {/* EDUCATION */}
          {data.education?.length > 0 && (
            <section className="mb-5">
              <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Education</h2>
              {data.education.map((edu) => (
                <div key={edu.id} className="mb-3">
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

          {/* PROJECTS */}
          {data.projects?.length > 0 && (
            <section className="mb-5">
              <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Projects</h2>
              {data.projects.map((proj) => (
                <div key={proj.id} className="mb-3">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{proj.name}</span>
                    <span>{proj.startDate} {proj.endDate ? `- ${proj.endDate}` : ""}</span>
                  </div>
                  <RenderDescription text={proj.description} />
                </div>
              ))}
            </section>
          )}

          {/* AWARDS & CERTIFICATIONS (Grouped) */}
          {(data.awards?.length > 0 || data.certifications?.length > 0) && (
            <section className="mb-5">
              <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Awards & Certifications</h2>
              {[...data.awards, ...data.certifications].map((item: any) => (
                <div key={item.id} className="mb-2 text-sm">
                  <span className="font-semibold">{item.title}</span> — {item.awarder || item.issuer}
                  <span className="text-gray-500 ml-2 text-xs">{item.date}</span>
                  <RenderDescription text={item.description} />
                </div>
              ))}
            </section>
          )}

          {/* SKILLS & LANGUAGES GRID */}
          <div className="grid grid-cols-2 gap-4">
            {data.skills?.length > 0 && (
              <section>
                <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Skills</h2>
                <div className="flex flex-wrap gap-1 mt-1 text-sm">
                  {data.skills.map((skill) => (
                    <div key={skill.id} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium">
                      {skill.name} {skill.proficiency && `(${skill.proficiency})`}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.languages?.length > 0 && (
              <section>
                <h2 className="text-sm font-bold border-b-2 border-black mb-2 uppercase tracking-wider">Languages</h2>
                <div className="flex flex-wrap gap-1 mt-1 text-sm">
                  {data.languages.map((lang) => (
                    <div key={lang.id} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium">
                      {lang.language} ({lang.fluency})
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* RIGHT COLUMN: Layout & AI */}
      <aside className="w-80 border-l border-neutral-800 bg-neutral-950 flex flex-col z-10 shadow-xl">
        <div className="p-4 border-b border-neutral-800">
          <h2 className="font-bold text-lg">Layout & AI</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="border-t border-neutral-800 pt-4">
            <h3 className="text-sm text-blue-400 font-semibold mb-2 flex items-center gap-2">
              ✨ AI Job Tailoring
            </h3>
            <p className="text-xs text-neutral-500 mb-3">Paste a job description below to initiate Phase 3 & 4 enhancement.</p>
            <textarea 
              className="w-full h-32 bg-neutral-900 border border-neutral-700 rounded p-2 text-xs focus:border-blue-500 outline-none resize-none"
              placeholder="Paste Job Description here..."
            />
            <button className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold transition">
              Tailor Resume
            </button>
          </div>
        </div>
      </aside>

    </div>
  );
}