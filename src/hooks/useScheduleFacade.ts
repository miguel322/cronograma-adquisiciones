import { useState, useCallback, useMemo } from 'react';
import { ScheduleRequestDTO, ScheduleResponseDTO } from '../core/types/schedule';
import { scheduleService } from '../services/scheduleService';

/**
 * Facade Pattern: A custom hook that orchestrates state, service calls, and errors.
 * The UI interacts ONLY with this hook.
 */
export const useScheduleFacade = () => {
  const [scheduleData, setScheduleData] = useState<ScheduleResponseDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async (request: ScheduleRequestDTO) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await scheduleService.generateSchedule(request);
      setScheduleData(result);
    } catch (err) {
      setError('Failed to generate schedule. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleExport = useCallback(async () => {
    if (!scheduleData) return;

    // Si ya tenemos el archivo generado en el DTO, lo descargamos directamente
    if (scheduleData.generatedFile) {
      const byteCharacters = atob(scheduleData.generatedFile);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cronograma_${scheduleData.referenceCode}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    }

    setIsExporting(true);
    try {
      await scheduleService.exportSchedule(scheduleData);
    } catch (err) {
      setError('Error al exportar el cronograma.');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  }, [scheduleData]);

  // Memoized values to prevent unnecessary re-renders of consuming components
  const facadeState = useMemo(() => ({
    scheduleData,
    isLoading,
    isExporting,
    error,
    handleGenerate,
    handleExport
  }), [scheduleData, isLoading, isExporting, error, handleGenerate, handleExport]);

  return facadeState;
};
