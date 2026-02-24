

import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { CircularProgress } from "@mui/material";
import { fetchSectionsThunk } from "../features/section/sectionSlice";
import {
  generateTimetableThunk,
  fetchTimetableThunk,
} from "../features/timetable/timetableSlice";

const TimetablePage = () => {
  const dispatch = useAppDispatch();
  const { sections } = useAppSelector((state) => state.section);
  
  const { entries, status } = useAppSelector((state) => state.timetable);

  const [selectedSection, setSelectedSection] = useState("");
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const timeSlots = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "01:00",
];
const getSlot = (day: string, time: string) => {
  return entries.find(
    (entry) =>
      entry.day === day &&
      entry.startTime === time
  );
};
  const { user } = useAppSelector((state) => state.auth);
  

  useEffect(() => {
    dispatch(fetchSectionsThunk());
  }, [dispatch]);

  const handleGenerate = async () => {
    await dispatch(generateTimetableThunk(selectedSection));
    const filteredEntries = entries.filter((entry) => {
  if (user?.role === "TEACHER") {
    return entry.teacherName === user.name;
  }

  if (user?.role === "STUDENT") {
    return entry.sectionId === user.sectionId;
  }

  return true; // ADMIN
});
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Timetable Generator
      </Typography>

      <FormControl fullWidth margin="normal">
        <InputLabel>Section</InputLabel>
        <Select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          label="Section"
        >
          {sections.map((section) => (
            <MenuItem key={section.id} value={section.id}>
              {section.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {user?.role === "ADMIN" && (
  <Button
    variant="contained"
    onClick={handleGenerate}
    sx={{ mb: 3 }}
  >
    Generate Timetable
  </Button>
)}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Day</TableCell>
            <TableCell>Time</TableCell>
            <TableCell>Subject</TableCell>
            <TableCell>Teacher</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <Table>
  <TableHead>
    <TableRow>
      <TableCell>Day / Time</TableCell>
      {timeSlots.map((time) => (
        <TableCell key={time}>{time}</TableCell>
      ))}
    </TableRow>
  </TableHead>

  <TableBody>
    {days.map((day) => (
      <TableRow key={day}>
        <TableCell>{day}</TableCell>

        {timeSlots.map((time) => {
          const slot = getSlot(day, time);

          const conflicts = entries.filter(
            (e) =>
              e.day === day &&
              e.startTime === time &&
              slot &&
              e.teacherName === slot.teacherName
          );

          const isConflict = conflicts.length > 1;

          return (
            <TableCell
              key={time}
              sx={{
                backgroundColor: isConflict
                  ? "#ffebee"
                  : "transparent",
              }}
            >
              {slot ? (
                <>
                  <div>
                    <strong>{slot.subjectName}</strong>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {slot.teacherName}
                  </div>
                </>
              ) : (
                "-"
              )}
            </TableCell>
          );
        })}
      </TableRow>
    ))}
  </TableBody>
</Table>
        </TableBody>
      </Table>
    </Container>
  );
};

export default TimetablePage;