import { AlertCircle, ChevronLeft, ChevronRight, Clock, Search } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import type { Solve } from '../types';

interface SolvesTableProps {
  solves: Solve[];
}

export const SolvesTable: React.FC<SolvesTableProps> = ({ solves }) => {
  const { colors } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredSolves = useMemo(() => {
    if (!normalizedSearch) return solves;
    return solves.filter(
      (s) =>
        s.index.toString().includes(normalizedSearch) ||
        s.finalTimeSec.toString().includes(normalizedSearch) ||
        s.dateStr.includes(normalizedSearch) ||
        s.penalty?.toLowerCase().includes(normalizedSearch) ||
        s.scramble?.toLowerCase().includes(normalizedSearch),
    );
  }, [solves, normalizedSearch]);

  const totalPages = Math.ceil(filteredSolves.length / pageSize) || 1;
  const start = (currentPage - 1) * pageSize;
  const currentSolves = useMemo(
    () => filteredSolves.slice(start, start + pageSize),
    [filteredSolves, start],
  );

  return (
    <section
      id="solves-table"
      aria-labelledby="session-solve-log-heading"
      className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-4 sm:p-6 text-stone-100 shadow-xl"
    >
      {/* Table Header Controls */}
      <div className="flex flex-col justify-between gap-3 border-b border-stone-800/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2
            id="session-solve-log-heading"
            className="text-base leading-snug font-bold tracking-tight text-stone-100 sm:text-lg"
          >
            <span className="mb-1.5 block sm:mb-0 sm:mr-2 sm:inline-flex sm:items-center sm:align-middle">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300"
                style={{
                  borderColor: `${colors.accent}40`,
                  backgroundColor: `${colors.accent}15`,
                  color: colors.accentText,
                }}
              >
                <Clock className="h-3.5 w-3.5 text-amber-400" style={{ color: colors.accent }} />
                Session Solve Log
              </span>
            </span>
            <span className="block sm:inline sm:align-middle">Complete Solve History</span>
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">
            <span className="hidden sm:inline">
              Detailed breakdown of individual solve times, scrambles, and rolling averages.
            </span>
            <span className="sm:hidden">Times, scrambles &amp; rolling averages.</span>
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            id="solves-search"
            aria-label="Search solves or scrambles"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search solves or scrambles..."
            className="w-full rounded-xl border border-stone-700/80 bg-stone-950/70 py-1.5 pr-3 pl-9 text-base sm:text-xs text-stone-200 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table Canvas */}
      <div className="min-h-[460px] overflow-x-auto rounded-xl border border-stone-800/80">
        <table
          aria-labelledby="session-solve-log-heading"
          className="w-full min-w-[780px] table-fixed text-left text-xs text-stone-300"
        >
          <thead className="border-b border-stone-800 bg-stone-950/80 font-mono text-[10px] tracking-wider text-stone-400 uppercase">
            <tr>
              <th className="w-16 px-4 py-3">#</th>
              <th className="w-28 px-4 py-3">Time</th>
              <th className="w-20 px-4 py-3">Ao5</th>
              <th className="w-20 px-4 py-3">Ao12</th>
              <th className="w-20 px-4 py-3">Ao50</th>
              <th className="w-20 px-4 py-3">Ao100</th>
              <th className="w-28 px-4 py-3">Date</th>
              <th className="w-56 min-w-[180px] px-4 py-3">Scramble</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60 font-mono">
            {currentSolves.map((solve) => (
              <tr
                key={solve.id}
                className="transition-colors hover:bg-stone-800/40 even:bg-stone-800/20"
              >
                <td className="px-4 py-2.5 font-semibold text-stone-500">{solve.index}</td>
                <td className="px-4 py-2.5 font-bold text-stone-100">
                  {solve.penalty === 'DNF' ? (
                    <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-400 font-semibold">
                      <AlertCircle className="h-3 w-3" /> DNF
                    </span>
                  ) : (
                    <span>
                      {solve.finalTimeSec.toFixed(2)}s
                      {solve.penalty === '+2' && (
                        <span className="ml-1 rounded bg-amber-500/15 px-1 py-0.5 text-[10px] text-amber-400 font-semibold">
                          (+2)
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-emerald-400" style={{ color: colors.series.green }}>
                  {solve.ao5 !== null && solve.ao5 !== undefined ? `${solve.ao5.toFixed(2)}s` : '—'}
                </td>
                <td className="px-4 py-2.5 text-orange-400" style={{ color: colors.series.orange }}>
                  {solve.ao12 !== null && solve.ao12 !== undefined
                    ? `${solve.ao12.toFixed(2)}s`
                    : '—'}
                </td>
                <td className="px-4 py-2.5 text-sky-400" style={{ color: colors.series.blue }}>
                  {solve.ao50 !== null && solve.ao50 !== undefined
                    ? `${solve.ao50.toFixed(2)}s`
                    : '—'}
                </td>
                <td className="px-4 py-2.5 text-purple-400" style={{ color: colors.series.purple }}>
                  {solve.ao100 !== null && solve.ao100 !== undefined
                    ? `${solve.ao100.toFixed(2)}s`
                    : '—'}
                </td>
                <td className="px-4 py-2.5 font-sans text-[11px] text-stone-400">
                  {solve.dateStr}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-stone-400">
                  <div className="max-w-xs truncate">{solve.scramble || '—'}</div>
                </td>
              </tr>
            ))}
            {currentSolves.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-stone-500">
                  No solves found matching your query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col gap-2.5 pt-2 text-xs text-stone-400 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-center sm:text-left">
          Showing {Math.min(filteredSolves.length, (currentPage - 1) * pageSize + 1)} to{' '}
          {Math.min(filteredSolves.length, currentPage * pageSize)} of {filteredSolves.length}{' '}
          solves
        </span>

        <div className="flex items-center justify-center sm:justify-end gap-2">
          <button
            id="solves-prev-page"
            type="button"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-stone-700/60 bg-stone-800 p-2 sm:p-1.5 text-stone-300 transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span id="pagination-indicator" className="font-mono text-stone-200 px-1">
            {currentPage} / {totalPages}
          </span>
          <button
            id="solves-next-page"
            type="button"
            aria-label="Next page"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-stone-700/60 bg-stone-800 p-2 sm:p-1.5 text-stone-300 transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
