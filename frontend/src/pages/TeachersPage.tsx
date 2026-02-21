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
import { fetchTeachersThunk } from "../features/teacher/teacherSlice";
import { useNavigate } from "react-router-dom";

const TeachersPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { teachers, status } = useAppSelector((state) => state.teacher);

  useEffect(() => {
    dispatch(fetchTeachersThunk());
  }, [dispatch]);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Teachers
      </Typography>

      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => navigate("/teachers/create")}
      >
        Create Teacher
      </Button>

      {status === "loading" && <Typography>Loading...</Typography>}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {teachers.map((teacher) => (
            <TableRow key={teacher.id}>
              <TableCell>{teacher.name}</TableCell>
              <TableCell>{teacher.email}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
};

export default TeachersPage;