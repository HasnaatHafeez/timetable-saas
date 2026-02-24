import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { createSubject, fetchSubjects } from "./subjectService";
import type { Subject, CreateSubjectPayload } from "./types";
import { showNotification } from "../ui/uiSlice";

interface SubjectState {
  subjects: Subject[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: SubjectState = {
  subjects: [],
  status: "idle",
  error: null,
};


export const createSubjectThunk = createAsyncThunk(
  "subject/create",
  async (data: any, thunkAPI) => {
    try {
      const response = await createSubject(data);

      thunkAPI.dispatch(
        showNotification({
          message: "Subject created successfully",
          severity: "success",
        })
      );

      return response;
    } catch (error: any) {

      thunkAPI.dispatch(
        showNotification({
          message: error.response?.data?.message || "Create failed",
          severity: "error",
        })
      );

      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Create failed"
      );
    }
  }
);

export const fetchSubjectsThunk = createAsyncThunk(
  "subject/fetchAll",
  async (_, thunkAPI) => {
    try {
      return await fetchSubjects();
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Fetch subjects failed"
      );
    }
  }
);

const subjectSlice = createSlice({
  name: "subject",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubjectsThunk.fulfilled, (state, action) => {
        state.subjects = action.payload;
      })
      .addCase(createSubjectThunk.fulfilled, (state, action) => {
        state.subjects.push(action.payload);
      });
  },
});

export default subjectSlice.reducer;