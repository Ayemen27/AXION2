import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ProjectContextType {
  selectedProjectId: string | null;
  selectProject: (id: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function SelectedProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    // Try to load default project first, then last selected
    const defaultProject = localStorage.getItem('axion_default_project');
    const lastSelected = localStorage.getItem('axion_selected_project');
    return defaultProject || lastSelected || null;
  });

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('axion_selected_project', selectedProjectId);
    } else {
      localStorage.removeItem('axion_selected_project');
    }
  }, [selectedProjectId]);

  return (
    <ProjectContext.Provider value={{ selectedProjectId, selectProject: setSelectedProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useSelectedProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useSelectedProject must be used within SelectedProjectProvider');
  return ctx;
}
