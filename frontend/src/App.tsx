import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import AppSnackbar from "./components/AppSnackbar";

function App() {
  return (
    <>
      <AppRoutes />
      <AppSnackbar />
    </>
  );
}
function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
