import axiosInstance from "../../services/axiosInstance";
import type { CreateSectionPayload } from "./types";

export const createSection = async (data: CreateSectionPayload) => {
  const response = await axiosInstance.post("/api/section/create", data);
  return response.data;
};

export const fetchSections = async () => {
  const response = await axiosInstance.get("/api/section/all");
  return response.data;
};