import { Snackbar, Alert } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { clearNotification } from "../features/ui/uiSlice";

const AppSnackbar = () => {
  const dispatch = useAppDispatch();
  const { open, message, severity } = useAppSelector(
    (state) => state.ui
  );

  const handleClose = () => {
    dispatch(clearNotification());
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={3000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default AppSnackbar;