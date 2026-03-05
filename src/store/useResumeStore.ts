import { create } from 'zustand';
import { ResumeData, PersonalInfo, Summary } from '@/lib/types';

export type SuggestedRewrite = {
  section: string;
  itemId: string;
  field: string;
  oldText: string;
  newText: string;
  reasoning: string;
};

export type AIOptimizationResult = {
  generalFeedback?: {
    summary: string;
    strengths: string[];
    fixes: string[];
  };
  matchStrategy?: {
    priorities: string[];
    emphasis: string;
  };
  suggestedRewrites: SuggestedRewrite[];
};

interface ResumeState {
  data: ResumeData;
  dbId: string | null;
  setDbId: (id: string | null) => void;
  documentTitle: string;
  setDocumentTitle: (title: string) => void;
  flashedId: string | null;
  triggerFlash: (id: string) => void;
  setResumeData: (data: ResumeData) => void;
  resetToBlank: () => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  sectionOrder: string[];
  setSectionOrder: (order: string[]) => void;
  template: string;
  setTemplate: (template: string) => void;
  
  // Direct edits
  updatePersonalInfo: (info: Partial<PersonalInfo>) => void;
  updateSummary: (content: string) => void;

  // Generic Array Handlers (Handles Experience, Education, Projects, etc.)
  addItem: <K extends keyof ResumeData>(section: K, item: any) => void;
  updateItem: <K extends keyof ResumeData>(section: K, id: string, updatedItem: any) => void;
  removeItem: <K extends keyof ResumeData>(section: K, id: string) => void;
  aiSuggestions: AIOptimizationResult | null;
  setAiSuggestions: (suggestions: AIOptimizationResult | null) => void;
}

const initialData: ResumeData = {
  personalInfo: { fullName: "", headline: "", email: "", phone: "", location: "", website: "" },
  summary: { content: "" },
  profiles: [], experience: [], education: [], projects: [], skills: [], languages: [],
  interests: [], awards: [], certifications: [], publications: [], volunteer: [], references: [],
};

export const useResumeStore = create<ResumeState>((set) => ({
  data: initialData,
  dbId: null,
  setDbId: (id) => set({ dbId: id }),
  documentTitle: "Untitled Document",
  setDocumentTitle: (title) => set({ documentTitle: title }),
  sectionOrder: ["summary", "experience", "education", "projects", "skills", "languages", "interests", "awards", "certifications", "publications", "volunteer", "references"],
  setSectionOrder: (order) => set({ sectionOrder: order }),
  template: "onyx",
  setTemplate: (template) => set({ template }),
  
  flashedId: null,
  triggerFlash: (id) => {
    set({ flashedId: id });
    setTimeout(() => set({ flashedId: null }), 1500); // clear after animation ends
  },
  aiSuggestions: null,
  setAiSuggestions: (suggestions) => set({ aiSuggestions: suggestions }),
  isEditing: false,
  setIsEditing: (val) => set({ isEditing: val }),
  
  setResumeData: (data) => set({ data }),
  
  resetToBlank: () => set({ data: initialData }),

  updatePersonalInfo: (info) =>
    set((state) => ({
      data: { ...state.data, personalInfo: { ...state.data.personalInfo, ...info } },
    })),

  updateSummary: (content) =>
    set((state) => ({
      data: { ...state.data, summary: { content } },
    })),

  // Dynamic Array Handlers
  addItem: (section, item) =>
    set((state) => ({
      data: { ...state.data, [section]: [...(state.data[section] as any[]), item] },
    })),

  updateItem: (section, id, updatedItem) =>
    set((state) => ({
      data: {
        ...state.data,
        [section]: (state.data[section] as any[]).map((item) =>
          item.id === id ? { ...item, ...updatedItem } : item
        ),
      },
    })),

  removeItem: (section, id) =>
    set((state) => ({
      data: {
        ...state.data,
        [section]: (state.data[section] as any[]).filter((item) => item.id !== id),
      },
    })),
}));