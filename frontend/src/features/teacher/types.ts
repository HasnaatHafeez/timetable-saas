export interface Teacher {
  id: string;
  name: string;
  email: string;
  institutionId: string;
}

export interface CreateTeacherPayload {
  name: string;
  email: string;
}