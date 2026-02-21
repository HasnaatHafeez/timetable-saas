import axiosInstance from "../../services/axiosInstance";
import type { AssignTeacherSubjectPayload } from "./types";

export const assignTeacherToSubject = async (
  data: AssignTeacherSubjectPayload
) => {
  const response = await axiosInstance.post(
    "/api/teacherSubject/assign",
    data
  );
  return response.data;
};

export const fetchTeacherSubjects = async () => {
  const response = await axiosInstance.get("/api/teacherSubject/all");
  return response.data;
};