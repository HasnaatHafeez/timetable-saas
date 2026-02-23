export interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

export interface CreateTimeSlotPayload {
  day: string;
  startTime: string;
  endTime: string;
}