import { formatPercent, initials } from '@/utils/format';

describe('format utilities', () => {
  it('formats signed percentages', () => {
    expect(formatPercent(1.234)).toBe('+1.23%');
    expect(formatPercent(-0.5)).toBe('-0.50%');
  });
  it('creates bounded initials', () => {
    expect(initials('Meta Platforms')).toBe('MP');
    expect(initials('NVIDIA')).toBe('N');
  });
});
