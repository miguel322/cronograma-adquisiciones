import { auth } from '@/core/config/firebase';
import { ScheduleRequestDTO, ScheduleResponseDTO } from '@/core/types/schedule';

/** Next.js API Route (same origin — no CORS needed) */
const CLOUD_FUNCTION_URL = '/api/generate-schedule';

// ---------------------------------------------------------------------------
// Utility: File → raw Base64 string (no "data:...;base64," prefix)
// ---------------------------------------------------------------------------
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // result looks like "data:application/...;base64,AAAA..." – strip the prefix
      const raw = (reader.result as string).split(',')[1];
      resolve(raw);
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
  });

// ---------------------------------------------------------------------------
// Utility: raw Base64 → Blob via fetch data-URL trick (clean & reliable)
// ---------------------------------------------------------------------------
const base64ToBlob = (base64: string): Promise<Blob> =>
  fetch(
    `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`
  ).then((r) => r.blob());

// ---------------------------------------------------------------------------
// Utility: trigger browser file download
// ---------------------------------------------------------------------------
const triggerDownload = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
export const scheduleService = {
  /**
   * Sends the template file + start date to the Cloud Function.
   * Returns the full response including the processed Base64 file.
   */
  generateSchedule: async (
    request: ScheduleRequestDTO
  ): Promise<ScheduleResponseDTO> => {
    // 1. Obtain Firebase Auth token (throws if user is not logged in)
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Usuario no autenticado');
    const token = await currentUser.getIdToken();

    // 2. Convert file to raw Base64
    const fileBase64 = await fileToBase64(request.templateFile);

    // 3. POST to Cloud Function
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileBase64,
        startDate: request.startDate, // matches Cloud Function body key
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Error del servidor (${response.status}): ${detail}`);
    }

    // 4. Map response to frontend DTO
    const json = await response.json();

    return {
      referenceCode: json.referenceCode ?? `CRONO-${Date.now()}`,
      processName: json.processName ?? '',
      milestones: json.milestones ?? [],
      generatedFile: json.processedFileBase64, // canonical field name from Function
    };
  },

  /**
   * Converts the stored Base64 back to an XLSX file and forces the download.
   */
  exportSchedule: async (data: ScheduleResponseDTO): Promise<void> => {
    if (!data.generatedFile) {
      throw new Error('No hay archivo generado para exportar');
    }

    const blob = await base64ToBlob(data.generatedFile);
    const filename = `Cronograma_${data.referenceCode}_${Date.now()}.xlsx`;
    triggerDownload(blob, filename);
  },
};
