import { initials } from '@/utils/format';

describe('format utilities', () => {
  it('creates bounded initials', () => {
    expect(initials('Meta Platforms')).toBe('MP');
    expect(initials('NVIDIA')).toBe('N');
  });
});
