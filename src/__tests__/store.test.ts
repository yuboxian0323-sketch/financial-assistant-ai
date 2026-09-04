import { useUIStore } from '@/features/ui/store';

describe('UI state ownership', () => {
  it('stores transient search and presentation state', () => {
    useUIStore.getState().setResearchSearch('NVDA');
    useUIStore.getState().setCompanyHubPage('News');
    useUIStore.getState().setHomeNewsCompanyId('nvda');
    useUIStore.getState().setPortfolioCompositionView('Theme');
    useUIStore.getState().setWorkspacePageId('workspace-page-research');
    expect(useUIStore.getState()).toMatchObject({ researchSearch: 'NVDA', companyHubPage: 'News', homeNewsCompanyId: 'nvda', portfolioCompositionView: 'Theme', workspacePageId: 'workspace-page-research' });
  });
});
