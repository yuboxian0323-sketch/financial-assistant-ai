import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { CompanyNewsFeed } from '@/features/research/CompanyNewsFeed';
import type { NewsArticle } from '@/types/domain';

const article: NewsArticle = {
  id: 'MSFT-42',
  symbol: 'MSFT',
  headline: 'Microsoft publishes a company update',
  summary: 'A provider summary of the update.',
  source: 'Example News',
  category: 'company',
  publishedAt: new Date().toISOString(),
  url: 'https://example.com/microsoft-update',
  relatedSymbols: ['MSFT'],
  provider: 'Finnhub',
};

describe('company news feed', () => {
  it('opens the in-app article summary when pressed', () => {
    const push = jest.spyOn(router, 'push').mockImplementation(jest.fn());
    render(<CompanyNewsFeed symbol="MSFT" articles={[article]} loading={false} error={null} retry={jest.fn()} />);

    fireEvent.press(screen.getByText(article.headline));

    expect(push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/news/[id]', params: expect.objectContaining({ id: article.id, symbol: 'MSFT' }) }));
    expect(screen.getByText(/Preferred publishers/)).toBeTruthy();
    push.mockRestore();
  });
});
