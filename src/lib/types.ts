export type PersonalInfo = {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website: string;
};

export type Summary = {
    content: string;
};

export type Profile = {
    network: string;
    username: string;
    website: string;
};

export type Experience = {
    id: string;
    company: string;
    position: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string; // fixed typo from "descritpion"
    website: string;
};

export type Education = {
    id: string;
    school: string;
    degree: string;
    studyArea: string;
    grade: string;
    location: string;
    startDate: string;
    endDate: string;
    website: string;
    description: string;
};

export type Project = {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    website: string;
    description: string;
};

export type Skill = {
    id: string;
    name: string;
    proficiency: string;
    keywords: string[];
};

export type Language = {
    id: string;
    language: string;
    fluency: string;
};

export type Interest = {
    id: string;
    name: string;
    keywords: string[];
};

export type Award = {
    id: string;
    title: string;
    awarder: string;
    date: string;
    website: string;
    description: string;
};

export type Certification = {
    id: string;
    title: string;
    issuer: string;
    date: string;
    website: string;
    description: string;
};

export type Publication = {
    id: string;
    title: string;
    publisher: string;
    date: string;
    website: string;
    description: string;
};

export type Volunteer = {
    id: string;
    organization: string;
    location: string;
    startDate: string;
    endDate: string;
    website: string;
    description: string;
};

export type Reference = {
    id: string;
    name: string;
    position: string;
    phone: string;
    website: string;
    description: string;
};

export type ResumeData = {
    personalInfo: PersonalInfo;
    summary: Summary;
    profiles: Profile[];
    experience: Experience[];
    education: Education[];
    projects: Project[];
    skills: Skill[];
    languages: Language[];
    interests: Interest[];
    awards: Award[];
    certifications: Certification[];
    publications: Publication[];
    volunteer: Volunteer[];
    references: Reference[];
};
