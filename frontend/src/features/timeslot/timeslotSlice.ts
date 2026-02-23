import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { createTimeSlot, fetchTimeSlots } from "./timeslotService";
import type { TimeSlot, CreateTimeSlotPayload } from "./types";

interface TimeSlotState {
  timeslots: TimeSlot[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: TimeSlotState = {
  timeslots: [],
  status: "idle",
  error: null,
};

export const fetchTimeSlotsThunk = createAsyncThunk(
  "timeslot/fetchAll",
  async (_, thunkAPI) => {
    try {
      return await fetchTimeSlots();
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Fetch timeslots failed"
      );
    }
  }
);

export const createTimeSlotThunk = createAsyncThunk(
  "timeslot/create",
  async (data: CreateTimeSlotPayload, thunkAPI) => {
    try {
      return await createTimeSlot(data);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Create timeslot failed"
      );
    }
  }
);

const timeslotSlice = createSlice({
  name: "timeslot",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimeSlotsThunk.fulfilled, (state, action) => {
        state.timeslots = action.payload;
      })
      .addCase(createTimeSlotThunk.fulfilled, (state, action) => {
        state.timeslots.push(action.payload);
      });
  },
});

export default timeslotSlice.reducer;
