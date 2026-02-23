import axiosInstance from "../../services/axiosInstance";
import type { GenerateTimetablePayload } from "./types";

export const generateTimetable = async (
  data: GenerateTimetablePayload
) => {
  const response = await axiosInstance.post(
    "/api/timetable/generate",
    data
  );
  return response.data;
};

export const fetchTimetable = async (sectionId: string) => {
  const response = await axiosInstance.get(
    `/api/timetable/${sectionId}`
  );
  return response.data;
};