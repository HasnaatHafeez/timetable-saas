import { useForm } from "react-hook-form";
import {
  Container,
  Typography,
  TextField,
  Button,
  MenuItem,
} from "@mui/material";
import { useAppDispatch } from "../app/hooks";
import { createTimeSlotThunk } from "../features/timeslot/timeslotSlice";
import { useNavigate } from "react-router-dom";

interface FormValues {
  day: string;
  startTime: string;
  endTime: string;
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const CreateTimeSlotPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { register, handleSubmit } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    await dispatch(createTimeSlotThunk(data));
    navigate("/timeslots");
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Create Time Slot
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          select
          label="Day"
          fullWidth
          margin="normal"
          {...register("day")}
        >
          {days.map((day) => (
            <MenuItem key={day} value={day}>
              {day}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Start Time"
          type="time"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          {...register("startTime")}
        />

        <TextField
          label="End Time"
          type="time"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          {...register("endTime")}
        />

        <Button variant="contained" type="submit" sx={{ mt: 2 }}>
          Create
        </Button>
      </form>
    </Container>
  );
};

export default CreateTimeSlotPage;