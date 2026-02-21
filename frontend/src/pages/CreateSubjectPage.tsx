import { useForm } from "react-hook-form";
import { Container, TextField, Button, Typography } from "@mui/material";
import { useAppDispatch } from "../app/hooks";
import { createSubjectThunk } from "../features/subject/subjectSlice";
import { useNavigate } from "react-router-dom";

interface FormValues {
  name: string;
  code: string;
  weeklyHours: number;
}

const CreateSubjectPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { register, handleSubmit } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    await dispatch(createSubjectThunk(data));
    navigate("/subjects");
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Create Subject
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Name"
          fullWidth
          margin="normal"
          {...register("name")}
        />

        <TextField
          label="Code"
          fullWidth
          margin="normal"
          {...register("code")}
        />

        <TextField
          label="Weekly Hours"
          type="number"
          fullWidth
          margin="normal"
          {...register("weeklyHours")}
        />

        <Button variant="contained" type="submit" sx={{ mt: 2 }}>
          Create
        </Button>
      </form>
    </Container>
  );
};

export default CreateSubjectPage;