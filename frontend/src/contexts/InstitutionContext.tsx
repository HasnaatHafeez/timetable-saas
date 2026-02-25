import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface Campus {
  id: string;
  name: string;
  location: string;
  institutionId: string;
}

export interface Institution {
  id: string;
  name: string;
  type: "SCHOOL" | "COLLEGE" | "UNIVERSITY";
  ownerId: string;
  campuses?: Campus[];
}

export interface AcademicLevel {
  id: string;
  name: string;
  campusId: string;
}

interface InstitutionContextType {
  institution: Institution | null;
  campus: Campus | null;
  academicLevel: AcademicLevel | null;
  setInstitution: (institution: Institution | null) => void;
  setCampus: (campus: Campus | null) => void;
  setAcademicLevel: (level: AcademicLevel | null) => void;
  isReady: boolean;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export const InstitutionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedInstitution = localStorage.getItem("institution");
    const savedCampus = localStorage.getItem("campus");
    const savedLevel = localStorage.getItem("academicLevel");

    if (savedInstitution) setInstitution(JSON.parse(savedInstitution));
    if (savedCampus) setCampus(JSON.parse(savedCampus));
    if (savedLevel) setAcademicLevel(JSON.parse(savedLevel));

    setIsReady(true);
  }, []);

  // Persist to localStorage when changed
  const handleSetInstitution = useCallback((inst: Institution | null) => {
    setInstitution(inst);
    if (inst) {
      localStorage.setItem("institution", JSON.stringify(inst));
    } else {
      localStorage.removeItem("institution");
      localStorage.removeItem("campus");
      localStorage.removeItem("academicLevel");
    }
  }, []);

  const handleSetCampus = useCallback((camp: Campus | null) => {
    setCampus(camp);
    localStorage.setItem("campus", JSON.stringify(camp));
    if (camp) {
      localStorage.removeItem("academicLevel");
      setAcademicLevel(null);
    }
  }, []);

  const handleSetAcademicLevel = useCallback((level: AcademicLevel | null) => {
    setAcademicLevel(level);
    if (level) {
      localStorage.setItem("academicLevel", JSON.stringify(level));
    } else {
      localStorage.removeItem("academicLevel");
    }
  }, []);

  return (
    <InstitutionContext.Provider
      value={{
        institution,
        campus,
        academicLevel,
        setInstitution: handleSetInstitution,
        setCampus: handleSetCampus,
        setAcademicLevel: handleSetAcademicLevel,
        isReady,
      }}
    >
      {children}
    </InstitutionContext.Provider>
  );
};

export const useInstitution = () => {
  const context = useContext(InstitutionContext);
  if (!context) throw new Error("useInstitution must be used within InstitutionProvider");
  return context;
};
