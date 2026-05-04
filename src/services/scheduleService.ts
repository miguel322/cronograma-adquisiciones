import { ScheduleRequestDTO, ScheduleResponseDTO } from '../core/types/schedule';

const API_BASE_URL = 'http://localhost:5219/api/schedules';

export const scheduleService = {
  generateSchedule: async (request: ScheduleRequestDTO): Promise<ScheduleResponseDTO> => {
    try {
      const formData = new FormData();
      formData.append('startDate', request.startDate);
      formData.append('templateFile', request.templateFile);

      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        // DO NOT set Content-Type header when using FormData
        body: formData
      });

      if (!response.ok) throw new Error('Error al generar el cronograma');
      return response.json();
    } catch (error) {
      console.error('Error en generateSchedule:', error);
      throw error;
    }
  },

  exportSchedule: async (data: ScheduleResponseDTO): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Error al exportar el archivo');

      const blob = await response.blob();
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
