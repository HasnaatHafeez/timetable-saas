import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import institutionReducer from "../features/institution/institutionSlice";
import subjectReducer from "../features/subject/subjectSlice";
import teacherReducer from "../features/teacher/teacherSlice";
import teacherSubjectReducer from "../features/teacherSubject/teacherSubjectSlice";
import sectionReducer from "../features/section/sectionSlice";
import timeslotReducer from "../features/timeslot/timeslotSlice";
import timetableReducer from "../features/timetable/timetableSlice";
import uiReducer from "../features/ui/uiSlice";
export const store = configureStore({
reducer: {
  auth: authReducer,
  institution: institutionReducer,
  subject: subjectReducer,
  teacher: teacherReducer,
  section: sectionReducer,
  timetable: timetableReducer,
  ui: uiReducer,
}

  reducer: {
    auth: authReducer,
    institution: institutionReducer,
    subject: subjectReducer,
    section: sectionReducer,
    teacher: teacherReducer,
    timeslot: timeslotReducer,
    timetable: timetableReducer,
    teacherSubject: teacherSubjectReducer, // ✅ Correct placement
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;