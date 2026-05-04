'use client';

import React from 'react';
import { useScheduleFacade } from '@/hooks/useScheduleFacade';
import ControlPanel from '@/components/ControlPanel';
import ResultsArea from '@/components/ResultsArea';

/**
 * Main Application Page
 * Follows the Container/Presentational pattern.
 * This component acts as the container, orchestrating data via the facade hook.
 */
export default function Home() {
  const { 
    scheduleData, 
    isLoading, 
    isExporting, 
    error, 
    handleGenerate, 
    handleExport 
  } = useScheduleFacade();

  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
      <header className="mb-8 md:mb-12 text-center animate-fade-in px-4">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight leading-tight">
          Generador de <span className="gradient-text">Cronogramas</span>
        </h1>
        <p className="text-base md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Sube tu plantilla institucional y proyecta automáticamente las fechas de tu proceso de compra.
        </p>
      </header>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-8 animate-fade-in">
          {error}
        </div>
      )}

      {/* Control Panel (Presentation) */}
      <ControlPanel 
        onGenerate={handleGenerate}
        onExport={handleExport}
        isLoading={isLoading}
        isExporting={isExporting}
        hasData={!!scheduleData}
      />

      {/* Results Area (Presentation) */}
      <ResultsArea 
        data={scheduleData}
        isLoading={isLoading}
      />

      {/* Background Decoration */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[120px] rounded-full" />
      </div>
    </main>
  );
}
