import axiosInstance from "../../services/axiosInstance";
import type { CreateTimeSlotPayload } from "./types";

export const createTimeSlot = async (data: CreateTimeSlotPayload) => {
  const response = await axiosInstance.post("/api/timeslot/create", data);
  return response.data;
};

export const fetchTimeSlots = async () => {
  const response = await axiosInstance.get("/api/timeslot/all");
  return response.data;
};