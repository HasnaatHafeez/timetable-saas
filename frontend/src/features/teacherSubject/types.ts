export interface TeacherSubject {
  id: string;
  teacherId: string;
  subjectId: string;
}

export interface AssignTeacherSubjectPayload {
  teacherId: string;
  subjectId: string;
}