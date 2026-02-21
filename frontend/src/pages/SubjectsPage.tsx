import { useEffect } from "react";
import {
  Container,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchSubjectsThunk } from "../features/subject/subjectSlice";
import { useNavigate } from "react-router-dom";

const SubjectsPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { subjects, status } = useAppSelector((state) => state.subject);

  useEffect(() => {
    dispatch(fetchSubjectsThunk());
  }, [dispatch]);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Subjects
      </Typography>

      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => navigate("/subjects/create")}
      >
        Create Subject
      </Button>

      {status === "loading" && <Typography>Loading...</Typography>}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Code</TableCell>
            <TableCell>Weekly Hours</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {subjects.map((subject) => (
            <TableRow key={subject.id}>
              <TableCell>{subject.name}</TableCell>
              <TableCell>{subject.code}</TableCell>
              <TableCell>{subject.weeklyHours}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
};

export default SubjectsPage;