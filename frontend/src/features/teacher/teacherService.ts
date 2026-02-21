import axiosInstance from "../../services/axiosInstance";
import type { CreateTeacherPayload } from "./types";

export const createTeacher = async (data: CreateTeacherPayload) => {
  const response = await axiosInstance.post("/api/teacher/create", data);
  return response.data;
};

export const fetchTeachers = async () => {
  const response = await axiosInstance.get("/api/teacher/all");
  return response.data;
};