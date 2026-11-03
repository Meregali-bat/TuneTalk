import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerifiedBadge } from './VerifiedBadge.jsx';
import { verifiedStyleFor } from './profileEffects.js';

describe('selo de verificado', () => {
  it('meregali.bat tem o selo verde TuneTalk; sweetener, o das cores da Olivia Rodrigo', () => {
    expect(verifiedStyleFor('meregali.bat')).toBe('tunetalk');
    expect(verifiedStyleFor('Sweetener')).toBe('olivia');
    expect(verifiedStyleFor('bia')).toBeNull();
    expect(verifiedStyleFor(undefined)).toBeNull();
  });

  it('mostra o selo com nome para leitor de tela, só para quem é verificado', () => {
    const { rerender, container } = render(<VerifiedBadge nome="sweetener" />);
    const selo = screen.getByRole('img', { name: 'Verificado' });
    expect(selo).toHaveClass('verified-badge', 'verified-badge--olivia', 'bi-patch-check-fill');

    rerender(<VerifiedBadge nome="bia" />);
    expect(container).toBeEmptyDOMElement();
  });
});
