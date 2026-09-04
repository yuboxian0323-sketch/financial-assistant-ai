import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EmptyState, InteractivePriceChart, ProgressIndicator, Tag } from '@/components';
import { InvestmentTabBar } from '@/components/navigation/InvestmentTabBar';

describe('shared components', () => {
  it('renders reusable empty and semantic badge states', () => {
    render(<><EmptyState title="No results" description="Try another company." /><Tag label="Sample data" /></>);
    expect(screen.getByText('No results')).toBeTruthy();
    expect(screen.getByText('Try another company.')).toBeTruthy();
    expect(screen.getByText('Sample data')).toBeTruthy();
  });

  it('converts fractional progress into native-safe integer accessibility values', () => {
    render(<ProgressIndicator value={1 / 3} label="Research priority" />);
    expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 33 });
  });

  it('lets a user inspect price points and renders bar mode', () => {
    const points = [
      { timestamp: '2026-08-19T13:00:00.000Z', close: 100 },
      { timestamp: '2026-08-19T14:00:00.000Z', close: 110 },
      { timestamp: '2026-08-19T15:00:00.000Z', close: 120 },
    ];
    render(<InteractivePriceChart points={points} positive range="1D" currency="USD" mode="bar" />);
    const chart = screen.getByTestId('interactive-price-chart');
    fireEvent(chart, 'layout', { nativeEvent: { layout: { width: 300, height: 190, x: 0, y: 0 } } });
    fireEvent(chart, 'responderGrant', { nativeEvent: { locationX: 0 } });

    expect(screen.getAllByText('USD 100.00').length).toBeGreaterThan(0);
    expect(chart.props.accessibilityRole).toBe('adjustable');
  });
});

describe('bottom navigation', () => {
  it('sends a tab action for every visible destination', () => {
    const routes = ['index', 'portfolio', 'workspace', 'research', 'automations'].map(
      (name) => ({ key: `${name}-key`, name, params: undefined }),
    );
    const dispatch = jest.fn();
    const props = {
      state: { key: 'tabs-key', index: routes.length, routes },
      descriptors: Object.fromEntries(
        routes.map((route) => [route.key, { options: { title: route.name } }]),
      ),
      navigation: {
        emit: jest.fn(() => ({ defaultPrevented: false })),
        dispatch,
      },
    } as unknown as BottomTabBarProps;

    render(
      <SafeAreaProvider
        initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, right: 0, bottom: 34, left: 0 } }}
      >
        <InvestmentTabBar {...props} />
      </SafeAreaProvider>,
    );

    const visibleTabs = ['index', 'portfolio', 'workspace', 'research', 'automations'];
    visibleTabs.forEach((name) => fireEvent.press(screen.getByTestId(`tab-${name}`)));
    expect(dispatch).toHaveBeenCalledTimes(visibleTabs.length);
    visibleTabs.forEach((name) => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { name, params: undefined }, target: 'tabs-key' }),
      );
    });
    expect(screen.queryByTestId('tab-settings')).toBeNull();
  });
});
