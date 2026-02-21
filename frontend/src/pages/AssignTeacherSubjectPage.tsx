import { useEffect } from "react";
import {
  Container,
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchTeachersThunk } from "../features/teacher/teacherSlice";
import { fetchSubjectsThunk } from "../features/subject/subjectSlice";
import { assignTeacherSubjectThunk } from "../features/teacherSubject/teacherSubjectSlice";

interface FormValues {
  teacherId: string;
  subjectId: string;
}

const AssignTeacherSubjectPage = () => {
  const dispatch = useAppDispatch();

  const { teachers } = useAppSelector((state) => state.teacher);
  const { subjects } = useAppSelector((state) => state.subject);

  const { handleSubmit, control } = useForm<FormValues>();

  useEffect(() => {
    dispatch(fetchTeachersThunk());
    dispatch(fetchSubjectsThunk());
  }, [dispatch]);

  const onSubmit = async (data: FormValues) => {
    await dispatch(assignTeacherSubjectThunk(data));
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Assign Teacher to Subject
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Teacher</InputLabel>
          <Controller
            name="teacherId"
            control={control}
            render={({ field }) => (
              <Select {...field} label="Teacher">
                {teachers.map((teacher) => (
                  <MenuItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel>Subject</InputLabel>
          <Controller
            name="subjectId"
            control={control}
            render={({ field }) => (
              <Select {...field} label="Subject">
                {subjects.map((subject) => (
                  <MenuItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>

        <Button variant="contained" type="submit" sx={{ mt: 2 }}>
          Assign
        </Button>
      </form>
    </Container>
  );
};

export default AssignTeacherSubjectPage;