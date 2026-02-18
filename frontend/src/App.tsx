import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";

function App() {

  return (
    <>
    <div>Hello World</div>;
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
    </>
  );
}

export default App;
