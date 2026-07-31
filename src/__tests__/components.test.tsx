import { render, screen } from '@testing-library/react-native';
import { EmptyState, ProgressIndicator, Tag } from '@/components';

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
});
