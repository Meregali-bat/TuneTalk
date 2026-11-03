import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FounderBadge } from './FounderBadge.jsx';

describe('selo de fundador', () => {
  it('aparece para quem está no TuneTalk desde o início (já ativado no login)', () => {
    render(<FounderBadge ativo />);
    const selo = screen.getByRole('img', { name: 'No TuneTalk desde o início' });
    expect(selo).toHaveClass('founder-badge', 'bi-award-fill');
    expect(selo).toHaveAttribute('title', 'No TuneTalk desde o início');
  });

  it('não aparece para os outros', () => {
    const { container } = render(<FounderBadge ativo={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
