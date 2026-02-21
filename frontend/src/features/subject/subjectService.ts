import axiosInstance from "../../services/axiosInstance";
import type { CreateSubjectPayload } from "./types";

export const createSubject = async (data: CreateSubjectPayload) => {
  const response = await axiosInstance.post("/api/subject/create", data);
  return response.data;
};

export const fetchSubjects = async () => {
  const response = await axiosInstance.get("/api/subject/all");
  return response.data;
};