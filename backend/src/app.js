const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const protectedRoutes = require("./routes/protected.routes");
const institutionRoutes = require("./routes/institution.routes");
const academicRoutes = require("./routes/academic.routes");
const sectionRoutes = require("./routes/section.routes");

const app = express();   // ✅ Define app FIRST

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/institution", institutionRoutes);
app.use("/api/academic", academicRoutes);  // ✅ Now safe
app.use("/api/section", sectionRoutes);

app.get("/", (req, res) => {
  res.send("Backend Running");
});

module.exports = app;
