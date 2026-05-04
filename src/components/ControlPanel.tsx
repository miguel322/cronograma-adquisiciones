'use client';

import React, { memo, useState, useRef } from 'react';
import { ScheduleRequestDTO } from '@/core/types/schedule';

interface ControlPanelProps {
  onGenerate: (request: ScheduleRequestDTO) => void;
  onExport: () => void;
  isLoading: boolean;
  isExporting: boolean;
  hasData: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onGenerate, 
  onExport, 
  isLoading, 
  isExporting, 
  hasData 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file && startDate) {
      onGenerate({ startDate, templateFile: file });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="glass-panel p-5 md:p-8 mb-8 animate-fade-in transition-all-custom">
      <h2 className="text-xl md:text-2xl font-bold mb-6 gradient-text">Configuración</h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-end">
        <div className="flex flex-col gap-2">
          <label htmlFor="templateFile" className="text-sm font-medium text-gray-400">Plantilla Excel (.xlsx)</label>
          <input
            id="templateFile"
            type="file"
            accept=".xlsx"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all-custom file:mr-2 md:file:mr-4 file:py-2 file:px-3 md:file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="startDate" className="text-sm font-medium text-gray-400">Fecha de Inicio</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all-custom w-full"
          />
        </div>

        <div className="flex flex-col gap-2 sm:pt-2">
          <button
            type="submit"
            disabled={isLoading || !file || !startDate}
            className={`gradient-primary text-white font-bold py-3.5 px-6 rounded-lg transition-all-custom transform active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary/20 w-full text-sm md:text-base`}
          >
            {isLoading ? 'Procesando...' : 'Generar Cronograma'}
          </button>
        </div>

        {hasData && (
          <div className="flex flex-col gap-2 animate-fade-in sm:pt-2">
            <button
              type="button"
              onClick={onExport}
              disabled={isExporting}
              className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-400 font-bold py-3.5 px-6 rounded-lg transition-all-custom transform active:scale-[0.98] disabled:opacity-50 w-full text-sm md:text-base"
            >
              {isExporting ? 'Exportando...' : 'Exportar Excel'}
            </button>
          </div>
        )}
      </form>
      
      <p className="mt-6 text-xs md:text-sm text-gray-500 italic">
        * La plantilla se procesa respetando su diseño institucional.
        * Fines de semana y feriados se excluyen automáticamente.
      </p>
    </div>
  );
};

export default memo(ControlPanel);
