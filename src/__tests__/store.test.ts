import { useUIStore } from '@/features/ui/store';

describe('UI state ownership', () => {
  it('stores transient search and presentation state', () => {
    useUIStore.getState().setResearchSearch('NVDA');
    useUIStore.getState().setExpandedCard('News');
    expect(useUIStore.getState()).toMatchObject({ researchSearch: 'NVDA', expandedCard: 'News' });
  });
});
