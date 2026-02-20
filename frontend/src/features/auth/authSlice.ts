import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { AuthState, LoginPayload, SignupPayload } from "./types";
import { loginUser, signupUser } from "./authService";

const tokenFromStorage = localStorage.getItem("token");

const initialState: AuthState = {
  user: null,
  token: tokenFromStorage || null,
  isAuthenticated: !!tokenFromStorage,
  status: "idle",
  error: null,
};

export const login = createAsyncThunk(
  "auth/login",
  async (data: LoginPayload, thunkAPI) => {
    try {
      const response = await loginUser(data);
      return response;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Login failed"
      );
    }
  }
);

export const signup = createAsyncThunk(
  "auth/signup",
  async (data: SignupPayload, thunkAPI) => {
    try {
      const response = await signupUser(data);
      return response;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Signup failed"
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
    },
  },
  extraReducers: (builder) => {
    builder

      // LOGIN
      .addCase(login.pending, (state) => {
        state.status = "loading";
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        localStorage.setItem("token", action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })

      // SIGNUP
      .addCase(signup.pending, (state) => {
        state.status = "loading";
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        localStorage.setItem("token", action.payload.token);
      })
      .addCase(signup.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;