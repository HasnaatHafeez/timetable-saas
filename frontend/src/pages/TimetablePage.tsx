

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
import { fetchSectionsThunk } from "../features/section/sectionSlice";
import {
  generateTimetableThunk,
  fetchTimetableThunk,
} from "../features/timetable/timetableSlice";

const TimetablePage = () => {
  const dispatch = useAppDispatch();
  const { sections } = useAppSelector((state) => state.section);
  const { entries } = useAppSelector((state) => state.timetable);

  const [selectedSection, setSelectedSection] = useState("");
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
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.day}</TableCell>
              <TableCell>
                {entry.startTime} - {entry.endTime}
              </TableCell>
              <TableCell>{entry.subjectName}</TableCell>
              <TableCell>{entry.teacherName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
};

export default TimetablePage;