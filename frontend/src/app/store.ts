import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import institutionReducer from "../features/institution/institutionSlice";
import subjectReducer from "../features/subject/subjectSlice";
import teacherReducer from "../features/teacher/teacherSlice";
import teacherSubjectReducer from "../features/teacherSubject/teacherSubjectSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    institution: institutionReducer,
    subject: subjectReducer,
    teacher: teacherReducer,
    teacherSubject: teacherSubjectReducer, // ✅ Correct placement
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;