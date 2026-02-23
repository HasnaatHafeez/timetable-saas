import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { createSection, fetchSections } from "./sectionService";
import type { Section, CreateSectionPayload } from "./types";

interface SectionState {
  sections: Section[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: SectionState = {
  sections: [],
  status: "idle",
  error: null,
};

export const fetchSectionsThunk = createAsyncThunk(
  "section/fetchAll",
  async (_, thunkAPI) => {
    try {
      return await fetchSections();
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Fetch sections failed"
      );
    }
  }
);

export const createSectionThunk = createAsyncThunk(
  "section/create",
  async (data: CreateSectionPayload, thunkAPI) => {
    try {
      return await createSection(data);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Create section failed"
      );
    }
  }
);

const sectionSlice = createSlice({
  name: "section",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSectionsThunk.fulfilled, (state, action) => {
        state.sections = action.payload;
      })
      .addCase(createSectionThunk.fulfilled, (state, action) => {
        state.sections.push(action.payload);
      });
  },
});

export default sectionSlice.reducer;