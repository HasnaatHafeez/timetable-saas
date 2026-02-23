export interface TimetableEntry {
  id: string;
  sectionId: string;
  subjectName: string;
  teacherName: string;
  day: string;
  startTime: string;
  endTime: string;
}

export interface GenerateTimetablePayload {
  sectionId: string;
}