import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { createTeacher, fetchTeachers } from "./teacherService";
import type { Teacher, CreateTeacherPayload } from "./types";

interface TeacherState {
  teachers: Teacher[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: TeacherState = {
  teachers: [],
  status: "idle",
  error: null,
};

export const fetchTeachersThunk = createAsyncThunk(
  "teacher/fetchAll",
  async (_, thunkAPI) => {
    try {
      return await fetchTeachers();
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Fetch teachers failed"
      );
    }
  }
);

export const createTeacherThunk = createAsyncThunk(
  "teacher/create",
  async (data: CreateTeacherPayload, thunkAPI) => {
    try {
      return await createTeacher(data);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Create teacher failed"
      );
    }
  }
);

const teacherSlice = createSlice({
  name: "teacher",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeachersThunk.fulfilled, (state, action) => {
        state.teachers = action.payload;
      })
      .addCase(createTeacherThunk.fulfilled, (state, action) => {
        state.teachers.push(action.payload);
      });
  },
});

export default teacherSlice.reducer;