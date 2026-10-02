import { AlertCircle, ChevronLeft, ChevronRight, Clock, Search } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import type { Solve } from '../types';

interface SolvesTableProps {
  solves: Solve[];
}

export const SolvesTable: React.FC<SolvesTableProps> = ({ solves }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredSolves = useMemo(() => {
    if (!searchTerm.trim()) return solves;
    const term = searchTerm.toLowerCase();
    return solves.filter(
      (s) =>
        s.index.toString().includes(term) ||
        s.finalTimeSec.toString().includes(term) ||
        s.dateStr.includes(term) ||
        s.penalty?.toLowerCase().includes(term) ||
        s.scramble?.toLowerCase().includes(term),
    );
  }, [solves, searchTerm]);

  const totalPages = Math.ceil(filteredSolves.length / pageSize) || 1;
  const currentSolves = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSolves.slice(start, start + pageSize);
  }, [filteredSolves, currentPage]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-4 sm:p-6 text-stone-100 shadow-xl">
      {/* Table Header Controls */}
      <div className="flex flex-col justify-between gap-3 border-b border-stone-800/80 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-stone-100">
            <Clock className="h-4 w-4 text-amber-400" />
            Session Solve Log ({solves.length} Total)
          </h2>
          <p className="mt-0.5 text-xs text-stone-400">
            Detailed breakdown of individual solve times, scrambles, and rolling averages.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search solves or scrambles..."
            className="w-full rounded-xl border border-stone-700/80 bg-stone-950/70 py-1.5 pr-3 pl-9 text-sm sm:text-xs text-stone-200 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table Canvas */}
      <div className="overflow-x-auto rounded-xl border border-stone-800/80">
        <table className="w-full text-left text-xs text-stone-300">
          <thead className="border-b border-stone-800 bg-stone-950/80 font-mono text-[10px] tracking-wider text-stone-400 uppercase">
            <tr>
              <th className="w-16 px-4 py-3">#</th>
              <th className="w-28 px-4 py-3">Time</th>
              <th className="w-20 px-4 py-3">Ao5</th>
              <th className="w-20 px-4 py-3">Ao12</th>
              <th className="w-20 px-4 py-3">Ao50</th>
              <th className="w-20 px-4 py-3">Ao100</th>
              <th className="w-28 px-4 py-3">Date</th>
              <th className="px-4 py-3">Scramble</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60 font-mono">
            {currentSolves.map((solve) => (
              <tr key={solve.id} className="transition-colors hover:bg-stone-800/40">
                <td className="px-4 py-2.5 font-semibold text-stone-500">{solve.index}</td>
                <td className="px-4 py-2.5 font-bold text-stone-100">
                  {solve.penalty === 'DNF' ? (
                    <span className="flex items-center gap-1 text-rose-400">
                      <AlertCircle className="h-3 w-3" /> DNF
                    </span>
                  ) : (
                    <span>
                      {solve.finalTimeSec.toFixed(2)}s
                      {solve.penalty === '+2' && (
                        <span className="ml-1 text-[10px] text-amber-400">(+2)</span>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-emerald-400">
                  {solve.ao5 !== null && solve.ao5 !== undefined ? `${solve.ao5.toFixed(2)}s` : '—'}
                </td>
                <td className="px-4 py-2.5 text-orange-400">
                  {solve.ao12 !== null && solve.ao12 !== undefined
                    ? `${solve.ao12.toFixed(2)}s`
                    : '—'}
                </td>
                <td className="px-4 py-2.5 text-sky-400">
                  {solve.ao50 !== null && solve.ao50 !== undefined
                    ? `${solve.ao50.toFixed(2)}s`
                    : '—'}
                </td>
                <td className="px-4 py-2.5 text-purple-400">
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
      <div className="flex flex-col gap-3 pt-2 text-xs text-stone-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {Math.min(filteredSolves.length, (currentPage - 1) * pageSize + 1)} to{' '}
          {Math.min(filteredSolves.length, currentPage * pageSize)} of {filteredSolves.length}{' '}
          solves
        </span>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg bg-stone-800 p-2 sm:p-1.5 text-stone-300 transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-stone-200">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg bg-stone-800 p-2 sm:p-1.5 text-stone-300 transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
