import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders footer text and safe-area classes', () => {
    const { container } = render(<Footer />);

    const footer = container.querySelector('#footer');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('safe-area-x');
    expect(footer).toHaveClass('safe-area-bottom');
  });
});
