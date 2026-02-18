import axiosInstance from "../../services/axiosInstance";

export interface CreateInstitutionPayload {
  institutionName: string;
  institutionType: string;
  campusName: string;
  location: string;
}

export const createInstitution = async (
  data: CreateInstitutionPayload
) => {
  const response = await axiosInstance.post(
    "/api/institution/create",
    data
  );
  return response.data;
};
