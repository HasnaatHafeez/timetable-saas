import { Container, Typography, Button, Box } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";
const navigate = useNavigate();
<Button
  variant="contained"
  sx={{ mr: 2 }}
  onClick={() => navigate("/institution/create")}
>
  Create Institution
</Button>


const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  return (
    <Container maxWidth="md">
      <Box mt={8}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>

        <Typography variant="h6">
          Welcome, {user?.name}
        </Typography>

        <Typography variant="body1" mb={3}>
          Role: {user?.role}
        </Typography>

        <Button
          variant="contained"
          color="error"
          onClick={() => dispatch(logout())}
        >
          Logout
        </Button>
      </Box>
    </Container>
  );
};

export default DashboardPage;
