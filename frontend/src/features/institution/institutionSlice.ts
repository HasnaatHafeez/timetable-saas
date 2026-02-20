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

// ✅ CREATE INSTITUTION
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

// ✅ FETCH MY INSTITUTION
export const fetchInstitutionThunk = createAsyncThunk(
  "institution/fetch",
  async (_, thunkAPI) => {
    try {
      const response = await axiosInstance.get("/api/institution/me");
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Fetch institution failed"
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
      // CREATE
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
      })

      // FETCH
      .addCase(fetchInstitutionThunk.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchInstitutionThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.institution = action.payload;
      })
      .addCase(fetchInstitutionThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default institutionSlice.reducer;