import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstructionModal } from './InstructionModal';

describe('InstructionModal component', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('Rendering & Accessibility', () => {
    it('does not render when isOpen is false', () => {
      render(<InstructionModal isOpen={false} onClose={vi.fn()} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders modal dialog with complete accessibility semantics', () => {
      render(<InstructionModal isOpen={true} onClose={vi.fn()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'instruction-modal-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'instruction-modal-description');

      const title = document.getElementById('instruction-modal-title');
      expect(title).toHaveTextContent('How to Export from csTimer');

      const description = document.getElementById('instruction-modal-description');
      expect(description).toHaveTextContent(
        'Follow these simple steps to export your solve history to CubeProgression.',
      );
    });

    it('renders the visual walkthrough image with lazy loading and correct alt text', () => {
      render(<InstructionModal isOpen={true} onClose={vi.fn()} />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        'alt',
        'csTimer export walkthrough showing the export toolbar button and Export to file button',
      );
      expect(img.getAttribute('src')).toContain('instruction.webp');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('renders all external links with rel="noopener noreferrer" and target="_blank"', () => {
      render(<InstructionModal isOpen={true} onClose={vi.fn()} />);

      const links = screen.getAllByRole('link', { name: /cstimer/i });
      expect(links.length).toBe(2);

      for (const link of links) {
        expect(link).toHaveAttribute('href', 'https://cstimer.net');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }
    });
  });

  describe('Focus Management', () => {
    it('moves initial focus to the close button when opened', () => {
      render(<InstructionModal isOpen={true} onClose={vi.fn()} />);

      const closeBtn = screen.getByRole('button', { name: 'Close instructions modal' });
      expect(closeBtn).toHaveFocus();
    });
  });

  describe('User Interactions & Dismissal', () => {
    it('calls onClose when close icon button is clicked', () => {
      const onClose = vi.fn();
      render(<InstructionModal isOpen={true} onClose={onClose} />);

      const closeBtn = screen.getByRole('button', { name: 'Close instructions modal' });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when "Got it" button is clicked', () => {
      const onClose = vi.fn();
      render(<InstructionModal isOpen={true} onClose={onClose} />);

      const gotItBtn = screen.getByRole('button', { name: 'Got it' });
      fireEvent.click(gotItBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking outside modal on backdrop overlay', () => {
      const onClose = vi.fn();
      render(<InstructionModal isOpen={true} onClose={onClose} />);

      const backdropBtn = screen.getByRole('button', { name: 'Close modal overlay' });
      fireEvent.click(backdropBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside the dialog or its children', () => {
      const onClose = vi.fn();
      render(<InstructionModal isOpen={true} onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);
      fireEvent.click(screen.getByText('Step-by-Step Instructions'));
      fireEvent.click(screen.getByRole('img'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('calls onClose when pressing Escape key while open', () => {
      const onClose = vi.fn();
      render(<InstructionModal isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when pressing non-Escape keys', () => {
      const onClose = vi.fn();
      render(<InstructionModal isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'Space' });
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when pressing Escape while closed', () => {
      const onClose = vi.fn();
      render(<InstructionModal isOpen={false} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('cleans up Escape key listener on unmount', () => {
      const onClose = vi.fn();
      const { unmount } = render(<InstructionModal isOpen={true} onClose={onClose} />);

      unmount();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Locking Lifecycle', () => {
    it('locks body scroll when open and restores it when isOpen becomes false', () => {
      const { rerender } = render(<InstructionModal isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<InstructionModal isOpen={false} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('');
    });

    it('restores body scroll when component unmounts while open', () => {
      const { unmount } = render(<InstructionModal isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('');
    });

    it('preserves and restores pre-existing body overflow style', () => {
      document.body.style.overflow = 'auto';

      const { rerender } = render(<InstructionModal isOpen={true} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<InstructionModal isOpen={false} onClose={vi.fn()} />);
      expect(document.body.style.overflow).toBe('auto');
    });
  });
});
