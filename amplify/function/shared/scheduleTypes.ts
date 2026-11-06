export interface ScheduleEntry {
  id: string;
  eventId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  title: string;
  description?: string;
  location?: string;
  supplierId?: string;
  order?: number;
  color?: string;
  participantIds?: string[];
  owner: string;
  createdAt: string;
  updatedAt: string;
}
