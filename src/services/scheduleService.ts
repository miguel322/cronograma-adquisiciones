import { auth } from '@/core/config/firebase';
import { ScheduleRequestDTO, ScheduleResponseDTO } from '../core/types/schedule';

// Firebase Cloud Function URL (v2)
const API_BASE_URL = 'https://generateschedule-449057630387.us-central1.run.app';

/**
 * Utility to convert File to Base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result?.toString().split(',')[1];
      resolve(base64 || '');
    };
    reader.onerror = error => reject(error);
  });
};

export const scheduleService = {
  generateSchedule: async (request: ScheduleRequestDTO): Promise<ScheduleResponseDTO> => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const fileBase64 = await fileToBase64(request.templateFile as unknown as File);

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileBase64,
          startDateStr: request.startDate
        })
      });

      if (!response.ok) throw new Error('Error al generar el cronograma');
      
      const result = await response.json();
      
      // Adaptation: The frontend expects fileBytes as property for ResultsArea/Export
      return {
        ...result,
        generatedFile: result.processedFileBase64 // Mapping for compatibility
      };
    } catch (error) {
      console.error('Error en generateSchedule:', error);
      throw error;
    }
  },

  exportSchedule: async (data: ScheduleResponseDTO): Promise<void> => {
    try {
      if (!data.generatedFile) throw new Error('No hay archivo generado para exportar');
      // With the serverless approach, the file is already in the data object as Base64
      const byteCharacters = atob(data.generatedFile);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cronograma_${data.referenceCode}_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error en exportSchedule:', error);
      throw error;
    }
  }
};


