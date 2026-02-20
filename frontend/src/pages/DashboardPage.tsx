import { useEffect } from "react";
import { Container, Typography, Button } from "@mui/material";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { fetchInstitutionThunk } from "../features/institution/institutionSlice";
import { useNavigate } from "react-router-dom";

const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { user } = useAppSelector((state) => state.auth);
  const { institution, status } = useAppSelector(
    (state) => state.institution
  );

  useEffect(() => {
    dispatch(fetchInstitutionThunk());
  }, [dispatch]);

  return (
    <Container>
      <Typography variant="h4">Dashboard</Typography>
      <Typography>Welcome {user?.name}</Typography>

      {status === "loading" && (
        <Typography>Loading institution...</Typography>
      )}

      {institution ? (
        <Typography>
          Institution: {institution.name}
        </Typography>
      ) : (
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => navigate("/institution/create")}
        >
          Create Institution
        </Button>
      )}
    </Container>
  );
};

export default DashboardPage;