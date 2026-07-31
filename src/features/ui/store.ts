import { create } from 'zustand';

interface UIState {
  researchSearch: string;
  companyHubPage: string | null;
  setResearchSearch(value: string): void;
  setCompanyHubPage(value: string | null): void;
}

export const useUIStore = create<UIState>((set) => ({
  researchSearch: '', companyHubPage: null,
  setResearchSearch: (researchSearch) => set({ researchSearch }),
  setCompanyHubPage: (companyHubPage) => set({ companyHubPage }),
}));
