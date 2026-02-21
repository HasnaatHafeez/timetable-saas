import { useForm } from "react-hook-form";
import { Container, TextField, Button, Typography } from "@mui/material";
import { useAppDispatch } from "../app/hooks";
import { createTeacherThunk } from "../features/teacher/teacherSlice";
import { useNavigate } from "react-router-dom";

interface FormValues {
  name: string;
  email: string;
}

const CreateTeacherPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { register, handleSubmit } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    await dispatch(createTeacherThunk(data));
    navigate("/teachers");
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Create Teacher
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Name"
          fullWidth
          margin="normal"
          {...register("name")}
        />

        <TextField
          label="Email"
          fullWidth
          margin="normal"
          {...register("email")}
        />

        <Button variant="contained" type="submit" sx={{ mt: 2 }}>
          Create
        </Button>
      </form>
    </Container>
  );
};

export default CreateTeacherPage;