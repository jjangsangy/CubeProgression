import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Hash, Clock, AlertCircle } from 'lucide-react';
import { Solve } from '../types';

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
        (s.scramble && s.scramble.toLowerCase().includes(term))
    );
  }, [solves, searchTerm]);

  const totalPages = Math.ceil(filteredSolves.length / pageSize) || 1;
  const currentSolves = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSolves.slice(start, start + pageSize);
  }, [filteredSolves, currentPage, pageSize]);

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl text-stone-100 flex flex-col gap-4">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-stone-100 tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Session Solve Log ({solves.length} Total)
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Detailed breakdown of individual solve times, scrambles, and rolling averages.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search solves or scrambles..."
            className="w-full bg-stone-950/70 border border-stone-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Table Canvas */}
      <div className="overflow-x-auto rounded-xl border border-stone-800/80">
        <table className="w-full text-left text-xs text-stone-300">
          <thead className="bg-stone-950/80 text-stone-400 uppercase font-mono tracking-wider text-[10px] border-b border-stone-800">
            <tr>
              <th className="py-3 px-4 w-16">#</th>
              <th className="py-3 px-4 w-28">Time</th>
              <th className="py-3 px-4 w-20">Ao5</th>
              <th className="py-3 px-4 w-20">Ao12</th>
              <th className="py-3 px-4 w-20">Ao50</th>
              <th className="py-3 px-4 w-20">Ao100</th>
              <th className="py-3 px-4 w-28">Date</th>
              <th className="py-3 px-4">Scramble</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60 font-mono">
            {currentSolves.map((solve) => (
              <tr key={solve.id} className="hover:bg-stone-800/40 transition-colors">
                <td className="py-2.5 px-4 text-stone-500 font-semibold">{solve.index}</td>
                <td className="py-2.5 px-4 font-bold text-stone-100">
                  {solve.penalty === 'DNF' ? (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> DNF
                    </span>
                  ) : (
                    <span>
                      {solve.finalTimeSec.toFixed(2)}s
                      {solve.penalty === '+2' && <span className="text-amber-400 text-[10px] ml-1">(+2)</span>}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-emerald-400">
                  {solve.ao5 !== null && solve.ao5 !== undefined ? `${solve.ao5.toFixed(2)}s` : '—'}
                </td>
                <td className="py-2.5 px-4 text-orange-400">
                  {solve.ao12 !== null && solve.ao12 !== undefined ? `${solve.ao12.toFixed(2)}s` : '—'}
                </td>
                <td className="py-2.5 px-4 text-sky-400">
                  {solve.ao50 !== null && solve.ao50 !== undefined ? `${solve.ao50.toFixed(2)}s` : '—'}
                </td>
                <td className="py-2.5 px-4 text-purple-400">
                  {solve.ao100 !== null && solve.ao100 !== undefined ? `${solve.ao100.toFixed(2)}s` : '—'}
                </td>
                <td className="py-2.5 px-4 text-stone-400 text-[11px] font-sans">{solve.dateStr}</td>
                <td className="py-2.5 px-4 text-stone-400 text-[11px] truncate max-w-xs font-mono">
                  {solve.scramble || '—'}
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
      <div className="flex items-center justify-between text-xs text-stone-400 pt-2">
        <span>
          Showing {Math.min(filteredSolves.length, (currentPage - 1) * pageSize + 1)} to{' '}
          {Math.min(filteredSolves.length, currentPage * pageSize)} of {filteredSolves.length} solves
        </span>

        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg bg-stone-800 text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-stone-200">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg bg-stone-800 text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
