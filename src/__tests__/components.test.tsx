import { render, screen } from '@testing-library/react-native';
import { EmptyState, Tag } from '@/components';

describe('shared components', () => {
  it('renders reusable empty and semantic badge states', () => {
    render(<><EmptyState title="No results" description="Try another company." /><Tag label="Sample data" /></>);
    expect(screen.getByText('No results')).toBeTruthy();
    expect(screen.getByText('Try another company.')).toBeTruthy();
    expect(screen.getByText('Sample data')).toBeTruthy();
  });
});
