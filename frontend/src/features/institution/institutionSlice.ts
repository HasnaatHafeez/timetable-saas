import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../services/axiosInstance";

interface InstitutionState {
  institution: any | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: InstitutionState = {
  institution: null,
  status: "idle",
  error: null,
};

export const createInstitutionThunk = createAsyncThunk(
  "institution/create",
  async (data: any, thunkAPI) => {
    try {
      const response = await axiosInstance.post(
        "/api/institution/create",
        data
      );
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Institution creation failed"
      );
    }
  }
);

const institutionSlice = createSlice({
  name: "institution",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createInstitutionThunk.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createInstitutionThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.institution = action.payload;
      })
      .addCase(createInstitutionThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default institutionSlice.reducer;
