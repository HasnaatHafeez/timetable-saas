import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { useAppDispatch } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Timetable SaaS
        </Typography>

        <Button color="inherit" onClick={handleLogout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;