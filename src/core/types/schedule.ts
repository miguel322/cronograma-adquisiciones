export interface ScheduleRequestDTO {
  startDate: string;
  templateFile: File;
}

export interface MilestoneDTO {
  order: number;
  activity: string;
  responsible: string;
  suspensiveDays: number;
  calendarDays: number;
  expectedDate: string;
  bidPolicy: string;
}

export interface ScheduleResponseDTO {
  referenceCode: string;
  processName: string;
  milestones: MilestoneDTO[];
  generatedFile?: string;
}
