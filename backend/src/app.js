const express = require("express");
const cors = require("cors");
const { createRateLimitMiddleware } = require("./middlewares/rateLimit.middleware");

const authRoutes = require("./routes/auth.routes");
const protectedRoutes = require("./routes/protected.routes");
const institutionRoutes = require("./routes/institution.routes");
const campusRoutes = require("./routes/campus.routes");
const academicRoutes = require("./routes/academic.routes");
const sectionRoutes = require("./routes/section.routes");
const departmentRoutes = require("./routes/department.routes");
const subjectRoutes = require("./routes/subject.routes");
const teacherRoutes = require("./routes/teacher.routes");
const teacherSubjectRoutes = require("./routes/teacherSubject.routes");
const roomRoutes = require("./routes/room.routes");
const workingDayRoutes = require("./routes/workingDay.routes");
const timeSlotRoutes = require("./routes/timeSlot.routes");
const teacherAvailabilityRoutes = require("./routes/teacherAvailability.routes");
const timetableRoutes = require("./routes/timetable.routes");
const staffRoutes = require("./routes/staff.routes");
const adminRoutes = require("./routes/admin.routes");
const usersRoutes = require("./routes/users.routes");
const auditLogRoutes = require("./routes/auditLog.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", createRateLimitMiddleware());

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/institutions", institutionRoutes);
app.use("/api/campuses", campusRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/academic-levels", academicRoutes);
app.use("/api/classes", sectionRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/teacher-subject", teacherSubjectRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/working-day", workingDayRoutes);
app.use("/api/workingdays", workingDayRoutes);
app.use("/api/time-slot", timeSlotRoutes);
app.use("/api/timeslots", timeSlotRoutes);
app.use("/api/teacher-availability", teacherAvailabilityRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/audit-logs", auditLogRoutes);


app.get("/", (req, res) => {
  res.send("Backend Running");
});

app.use((error, req, res, next) => {
  if (!error) return next();

  const statusCode = Number(error.statusCode) || 500;
  if (error.code === "TENANT_CONTEXT_REQUIRED" || error.code === "TENANT_ACCESS_DENIED" || error.code === "TENANT_RAW_BLOCKED" || error.code === "TENANT_QUERY_INVALID" || error.code === "TENANT_SYSTEM_ACCESS_DENIED") {
    return res.status(statusCode).json({
      message: error.message,
      code: error.code,
    });
  }

  return res.status(statusCode).json({
    message: error.message || "Internal server error",
  });
});

module.exports = app;