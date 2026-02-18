import { useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { createInstitutionThunk } from "../features/institution/institutionSlice";
import { useNavigate } from "react-router-dom";

interface FormValues {
  institutionName: string;
  institutionType: string;
  campusName: string;
  location: string;
}

const CreateInstitutionPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status } = useAppSelector((state) => state.institution);

  const { register, handleSubmit } = useForm<FormValues>();

  const onSubmit = (data: FormValues) => {
    dispatch(createInstitutionThunk(data));
  };

  useEffect(() => {
    if (status === "succeeded") {
      navigate("/dashboard");
    }
  }, [status, navigate]);

  return (
    <Container maxWidth="sm">
      <Box mt={8} p={4} boxShadow={3} borderRadius={2}>
        <Typography variant="h4" mb={3}>
          Create Institution
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            label="Institution Name"
            margin="normal"
            {...register("institutionName")}
          />

          <TextField
            select
            fullWidth
            label="Institution Type"
            margin="normal"
            {...register("institutionType")}
          >
            <MenuItem value="School">School</MenuItem>
            <MenuItem value="College">College</MenuItem>
            <MenuItem value="University">University</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="Campus Name"
            margin="normal"
            {...register("campusName")}
          />

          <TextField
            fullWidth
            label="Location"
            margin="normal"
            {...register("location")}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Create Institution"
            )}
          </Button>
        </form>
      </Box>
    </Container>
  );
};

export default CreateInstitutionPage;
