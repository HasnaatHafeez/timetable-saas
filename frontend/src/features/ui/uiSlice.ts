import { createSlice } from "@reduxjs/toolkit";

interface UIState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info" | "warning";
}

const initialState: UIState = {
  open: false,
  message: "",
  severity: "info",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    showNotification: (state, action) => {
      state.open = true;
      state.message = action.payload.message;
      state.severity = action.payload.severity;
    },
    clearNotification: (state) => {
      state.open = false;
      state.message = "";
    },
  },
});

export const { showNotification, clearNotification } = uiSlice.actions;
export default uiSlice.reducer;