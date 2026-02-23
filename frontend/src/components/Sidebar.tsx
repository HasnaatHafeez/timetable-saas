import { Box, List, ListItemButton, ListItemText } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: "Dashboard", path: "/dashboard" },
    { text: "Create Institution", path: "/institution/create" },
    { text: "Subjects", path: "/subjects" },
    { text: "Teachers", path: "/teachers" },
    { text: "Assign Subjects", path: "/assign" },
    { text: "Sections", path: "/sections" },
    { text: "Time Slots", path: "/timeslots" },
    { text: "Time Slots", path: "/timeslots" },
    { text: "Timetable", path: "/timetable" },
  ];

  return (
    <Box
      sx={{
        width: 240,
        height: "100vh",
        borderRight: "1px solid #ddd",
        paddingTop: 2,
      }}
    >
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          >
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;