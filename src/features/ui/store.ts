import { create } from 'zustand';
import type { PortfolioCompositionView } from '@/types/domain';

interface UIState {
  researchSearch: string;
  companyHubPage: string | null;
  homeNewsCompanyId: string | null;
  portfolioCompositionView: PortfolioCompositionView;
  workspacePageId: string | null;
  setResearchSearch(value: string): void;
  setCompanyHubPage(value: string | null): void;
  setHomeNewsCompanyId(value: string): void;
  setPortfolioCompositionView(value: PortfolioCompositionView): void;
  setWorkspacePageId(value: string): void;
}

export const useUIStore = create<UIState>((set) => ({
  researchSearch: '', companyHubPage: null, homeNewsCompanyId: null, portfolioCompositionView: 'Sector', workspacePageId: null,
  setResearchSearch: (researchSearch) => set({ researchSearch }),
  setCompanyHubPage: (companyHubPage) => set({ companyHubPage }),
  setHomeNewsCompanyId: (homeNewsCompanyId) => set({ homeNewsCompanyId }),
  setPortfolioCompositionView: (portfolioCompositionView) => set({ portfolioCompositionView }),
  setWorkspacePageId: (workspacePageId) => set({ workspacePageId }),
}));
