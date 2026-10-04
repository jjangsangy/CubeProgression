import { ExternalLink, FileText, HelpCircle, ShieldCheck, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface InstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstructionModal: React.FC<InstructionModalProps> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const baseUrl = import.meta.env.BASE_URL || './';
  const imageSrc = baseUrl.endsWith('/')
    ? `${baseUrl}instruction.webp`
    : `${baseUrl}/instruction.webp`;

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Focus close button on open for accessibility
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div
      id="instruction-modal"
      className="fade-in fixed inset-0 z-[100] flex animate-in flex-col items-center justify-center overflow-y-auto p-3 sm:p-6 duration-200 safe-area-modal"
    >
      {/* Backdrop overlay button */}
      <button
        id="instruction-modal-overlay"
        type="button"
        aria-label="Close modal overlay"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/85 backdrop-blur-md cursor-default"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="instruction-modal-title"
        aria-describedby="instruction-modal-description"
        className="relative z-10 my-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 text-stone-100 shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-800 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="instruction-modal-title"
                className="text-base sm:text-lg font-bold tracking-tight text-stone-100"
              >
                How to Export from csTimer
              </h2>
              <p id="instruction-modal-description" className="text-xs text-stone-400">
                Follow these simple steps to export your solve history to CubeProgression.
              </p>
            </div>
          </div>

          <button
            id="instruction-modal-close"
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close instructions modal"
            className="cursor-pointer rounded-xl p-2 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="max-h-[calc(85vh-130px)] space-y-5 overflow-y-auto p-5 sm:p-6 text-xs sm:text-sm">
          {/* Visual Walkthrough Image */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-stone-300 uppercase">
              <span>Visual Walkthrough</span>
              <span className="text-[11px] font-normal text-stone-500 normal-case">
                csTimer Export Flow
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-950 shadow-inner">
              <img
                src={imageSrc}
                alt="csTimer export walkthrough showing the export toolbar button and Export to file button"
                className="block h-auto w-full object-contain"
                loading="lazy"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-400">
              <div className="flex items-center gap-2 rounded-lg border border-stone-800/80 bg-stone-950/60 px-3 py-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-300">
                  1
                </span>
                <span>
                  Top toolbar: Click the <strong className="text-stone-200">Export icon</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-stone-800/80 bg-stone-950/60 px-3 py-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-300">
                  2
                </span>
                <span>
                  Modal dialog: Click <strong className="text-stone-200">Export to file</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Numbered Steps */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold tracking-wider text-stone-300 uppercase">
              Step-by-Step Instructions
            </h3>

            <ol className="space-y-2 text-stone-300">
              <li className="flex items-start gap-3 rounded-xl border border-stone-800 bg-stone-950/40 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-stone-950">
                  1
                </span>
                <div className="space-y-0.5">
                  <div className="font-semibold text-stone-200">Open csTimer</div>
                  <p className="text-xs text-stone-400">
                    Navigate to your timer at{' '}
                    <a
                      href="https://cstimer.net"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-amber-400 underline underline-offset-2 hover:text-amber-300"
                    >
                      cstimer.net
                    </a>{' '}
                    in your browser.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-xl border border-stone-800 bg-stone-950/40 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-stone-950">
                  2
                </span>
                <div className="space-y-0.5">
                  <div className="font-semibold text-stone-200">Click the Export Button</div>
                  <p className="text-xs text-stone-400">
                    In the top navigation toolbar, click the{' '}
                    <strong className="text-stone-200">Export icon</strong> (an upward arrow inside
                    a tray, located next to the Options gear).
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-xl border border-stone-800 bg-stone-950/40 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-stone-950">
                  3
                </span>
                <div className="space-y-0.5">
                  <div className="font-semibold text-stone-200">
                    Click &quot;Export to file&quot;
                  </div>
                  <p className="text-xs text-stone-400">
                    In the &quot;Data Import/Export&quot; dialog that appears, click the{' '}
                    <strong className="text-stone-200">&quot;Export to file&quot;</strong> button.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-xl border border-stone-800 bg-stone-950/40 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-stone-950">
                  4
                </span>
                <div className="space-y-0.5">
                  <div className="font-semibold text-stone-200">Save the Downloaded File</div>
                  <p className="text-xs text-stone-400">
                    csTimer will download a text file (e.g.{' '}
                    <code className="rounded bg-stone-800 px-1 py-0.5 font-mono text-[11px] text-amber-300">
                      cstimer_20250101_120000.txt
                    </code>
                    ) containing all your sessions formatted as JSON.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-xl border border-stone-800 bg-stone-950/40 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-stone-950">
                  5
                </span>
                <div className="space-y-0.5">
                  <div className="font-semibold text-stone-200">Load into CubeProgression</div>
                  <p className="text-xs text-stone-400">
                    Drag and drop or browse for that file on this page. All your sessions and solves
                    will be loaded automatically!
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Quick Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-start gap-2.5 rounded-xl border border-stone-800 bg-stone-950/50 p-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="text-xs text-stone-400">
                <strong className="block text-stone-200">.txt or .json Accepted</strong>
                csTimer saves files as <code className="text-amber-300 font-mono">.txt</code> by
                default, but the content is standard JSON. Both extensions work seamlessly.
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-stone-800 bg-stone-950/50 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div className="text-xs text-stone-400">
                <strong className="block text-stone-200">100% Private &amp; Offline</strong>
                Your solve data never leaves your browser. Parsing, analysis, and charting run
                entirely on your device.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-stone-800 bg-stone-950/60 px-5 py-3.5 sm:px-6">
          <a
            href="https://cstimer.net"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-amber-400 underline underline-offset-2 transition-colors hover:text-amber-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open csTimer.net</span>
          </a>

          <button
            id="instruction-modal-confirm"
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-stone-950 shadow-md shadow-amber-500/10 transition-all hover:from-amber-400 hover:to-orange-400 active:scale-95"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
