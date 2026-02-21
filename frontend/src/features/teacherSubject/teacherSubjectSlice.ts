import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  assignTeacherToSubject,
  fetchTeacherSubjects,
} from "./teacherSubjectService";
import type {
  TeacherSubject,
  AssignTeacherSubjectPayload,
} from "./types";

interface TeacherSubjectState {
  assignments: TeacherSubject[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: TeacherSubjectState = {
  assignments: [],
  status: "idle",
  error: null,
};

export const fetchTeacherSubjectsThunk = createAsyncThunk(
  "teacherSubject/fetchAll",
  async (_, thunkAPI) => {
    try {
      return await fetchTeacherSubjects();
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Fetch failed"
      );
    }
  }
);

export const assignTeacherSubjectThunk = createAsyncThunk(
  "teacherSubject/assign",
  async (data: AssignTeacherSubjectPayload, thunkAPI) => {
    try {
      return await assignTeacherToSubject(data);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Assignment failed"
      );
    }
  }
);

const teacherSubjectSlice = createSlice({
  name: "teacherSubject",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeacherSubjectsThunk.fulfilled, (state, action) => {
        state.assignments = action.payload;
      })
      .addCase(assignTeacherSubjectThunk.fulfilled, (state, action) => {
        state.assignments.push(action.payload);
      });
  },
});

export default teacherSubjectSlice.reducer;