import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import institutionReducer from "../features/institution/institutionSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    institution: institutionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
