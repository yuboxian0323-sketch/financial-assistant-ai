import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { seedCompanies } from '@/database/seedData';
import { CompanyOverview } from '@/features/research/CompanyOverview';

const mockUseCompanyMarketOverview = jest.fn();

jest.mock('@/hooks/useAppQueries', () => ({
  useCompanyMarketOverview: (symbol: string) => mockUseCompanyMarketOverview(symbol),
}));

const company = seedCompanies[0]!;

describe('company overview', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('shows live company facts and opens the official website', async () => {
    mockUseCompanyMarketOverview.mockReturnValue({
      data: {
        profile: {
          symbol: 'NVDA', name: 'NVIDIA Corp', country: 'US', currency: 'USD', exchange: 'NASDAQ',
          industry: 'Semiconductors', ipoDate: '1999-01-22', website: 'https://www.nvidia.com',
          marketCapitalizationMillions: 4_000_000, sharesOutstandingMillions: 24_000,
        },
        fundamentals: { peRatio: 31.2, revenueGrowth: 26.5, grossMargin: 72.1, week52High: 212.19 },
        peers: ['AMD', 'AVGO'], source: 'Finnhub', asOf: '2026-09-04T12:00:00.000Z',
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    render(<CompanyOverview company={company} />);

    expect(screen.getByText('Live facts')).toBeTruthy();
    expect(screen.getByText('31.20×')).toBeTruthy();
    expect(screen.getByText('26.50%')).toBeTruthy();
    expect(screen.getByText('AMD')).toBeTruthy();
    fireEvent.press(screen.getByText('Visit company website'));
    expect(openUrl).toHaveBeenCalledWith('https://www.nvidia.com');
    openUrl.mockRestore();
  });

  it('contains a provider error and retries without hiding saved research', () => {
    const refetch = jest.fn();
    mockUseCompanyMarketOverview.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Provider unavailable'),
      refetch,
    });

    render(<CompanyOverview company={company} />);

    expect(screen.getByText('Live fundamentals unavailable')).toBeTruthy();
    expect(screen.getByText(company.bullThesis)).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
