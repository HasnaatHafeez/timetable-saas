import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { generateTimetable, fetchTimetable } from "./timetableService";
import type { TimetableEntry } from "./types";

interface TimetableState {
  entries: TimetableEntry[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: TimetableState = {
  entries: [],
  status: "idle",
  error: null,
};

export const generateTimetableThunk = createAsyncThunk(
  "timetable/generate",
  async (sectionId: string, thunkAPI) => {
    try {
      return await generateTimetable({ sectionId });
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Generation failed"
      );
    }
  }
);

export const fetchTimetableThunk = createAsyncThunk(
  "timetable/fetch",
  async (sectionId: string, thunkAPI) => {
    try {
      return await fetchTimetable(sectionId);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Fetch failed"
      );
    }
  }
);

const timetableSlice = createSlice({
  name: "timetable",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimetableThunk.fulfilled, (state, action) => {
        state.entries = action.payload;
      })
      .addCase(generateTimetableThunk.fulfilled, (state, action) => {
        state.entries = action.payload;
      });
  },
});

export default timetableSlice.reducer;
