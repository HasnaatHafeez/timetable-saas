import { Box } from "@mui/material";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

interface Props {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: Props) => {
  return (
    <Box>
      <Navbar />
      <Box sx={{ display: "flex" }}>
        <Sidebar />
        <Box sx={{ flexGrow: 1, padding: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;