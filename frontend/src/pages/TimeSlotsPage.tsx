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
import { fetchTimeSlotsThunk } from "../features/timeslot/timeslotSlice";
import { useNavigate } from "react-router-dom";

const TimeSlotsPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { timeslots, status } = useAppSelector(
    (state) => state.timeslot
  );

  useEffect(() => {
    dispatch(fetchTimeSlotsThunk());
  }, [dispatch]);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Time Slots
      </Typography>

      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => navigate("/timeslots/create")}
      >
        Create Time Slot
      </Button>

      {status === "loading" && <Typography>Loading...</Typography>}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Day</TableCell>
            <TableCell>Start Time</TableCell>
            <TableCell>End Time</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {timeslots.map((slot) => (
            <TableRow key={slot.id}>
              <TableCell>{slot.day}</TableCell>
              <TableCell>{slot.startTime}</TableCell>
              <TableCell>{slot.endTime}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
};

export default TimeSlotsPage;