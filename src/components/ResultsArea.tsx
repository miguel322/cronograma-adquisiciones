'use client';

import React, { memo } from 'react';
import { ScheduleResponseDTO, MilestoneDTO } from '@/core/types/schedule';

interface ResultsAreaProps {
  data: ScheduleResponseDTO | null;
  isLoading: boolean;
}

/**
 * Loading Skeleton Component
 */
const TableSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-16 bg-white/5 rounded-lg w-full" />
    ))}
  </div>
);

/**
 * ResultsArea Component
 * A responsive DataGrid for displaying schedule milestones.
 * Uses an optimized load skeleton.
 */
const ResultsArea: React.FC<ResultsAreaProps> = ({ data, isLoading }) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel p-8 animate-fade-in">
        <div className="h-8 bg-white/5 rounded w-1/4 mb-8" />
        <TableSkeleton />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-2xl animate-slide-up">
      <div className="p-4 md:p-6 border-b border-zinc-800/50 bg-white/[0.02] flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white">{data.processName}</h2>
          <p className="text-xs md:text-sm text-zinc-500 font-mono">Ref: {data.referenceCode}</p>
        </div>
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-zinc-800/50">
              <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-16">#</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider min-w-[300px]">Actividad</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Responsable</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">Días Cal.</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fecha Esperada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {data.milestones.map((milestone: MilestoneDTO) => (
              <tr key={milestone.order} className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/40">
                <td className="px-6 py-4 text-sm font-mono text-zinc-500">{milestone.order}</td>
                <td className="px-6 py-4">
                  <span className="text-zinc-200 text-sm font-medium leading-relaxed block">
                    {milestone.activity}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-zinc-400 text-sm leading-relaxed">{milestone.responsible}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-zinc-300 font-mono text-sm">{milestone.calendarDays}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-semibold tracking-wide whitespace-nowrap">
                    {formatDate(milestone.expectedDate)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden divide-y divide-zinc-800/50">
        {data.milestones.map((milestone: MilestoneDTO) => (
          <div key={milestone.order} className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono text-zinc-600">ORDEN #{milestone.order}</span>
              <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase">
                {milestone.calendarDays} Días
              </span>
            </div>
            
            <h3 className="text-sm font-medium text-zinc-200 leading-snug">
              {milestone.activity}
            </h3>
            
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-zinc-500">{milestone.responsible}</span>
              <span className="text-sm font-bold text-blue-400">
                {formatDate(milestone.expectedDate)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {data.milestones.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-zinc-500 italic">No se encontraron actividades.</p>
        </div>
      )}
    </div>
  );
};

export default memo(ResultsArea);
