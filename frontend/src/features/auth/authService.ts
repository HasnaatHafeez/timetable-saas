import axiosInstance from "../../services/axiosInstance";
import { LoginPayload, SignupPayload } from "./types";

export const loginUser = async (data: LoginPayload) => {
  const response = await axiosInstance.post("/api/auth/login", data);
  return response.data;
};

export const signupUser = async (data: SignupPayload) => {
  const response = await axiosInstance.post("/api/auth/signup", data);
  return response.data;
};
