import { create } from 'zustand';

interface UIState {
  researchSearch: string;
  expandedCard: string | null;
  modal: string | null;
  setResearchSearch(value: string): void;
  setExpandedCard(value: string | null): void;
  setModal(value: string | null): void;
}

export const useUIStore = create<UIState>((set) => ({
  researchSearch: '', expandedCard: null, modal: null,
  setResearchSearch: (researchSearch) => set({ researchSearch }),
  setExpandedCard: (expandedCard) => set({ expandedCard }),
  setModal: (modal) => set({ modal }),
}));
