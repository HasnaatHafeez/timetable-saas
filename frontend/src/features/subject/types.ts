export interface Subject {
  id: string;
  name: string;
  code: string;
  weeklyHours: number;
  institutionId: string;
}

export interface CreateSubjectPayload {
  name: string;
  code: string;
  weeklyHours: number;
}