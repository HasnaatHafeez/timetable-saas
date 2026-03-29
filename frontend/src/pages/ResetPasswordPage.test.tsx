import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResetPasswordPage from "@/pages/ResetPasswordPage";

const resetPasswordMock = vi.fn();
const toastMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    resetPassword: resetPasswordMock,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderPage(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ResetPasswordPage />
    </MemoryRouter>
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows validation error when token is missing", async () => {
    renderPage("/reset-password");

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "new-password-123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /set new password/i }));

    await waitFor(() => {
      expect(resetPasswordMock).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Invalid reset link",
        })
      );
    });
  });

  it("shows validation error when passwords do not match", async () => {
    renderPage("/reset-password?token=abc-token");

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "different-password" },
    });

    fireEvent.click(screen.getByRole("button", { name: /set new password/i }));

    await waitFor(() => {
      expect(resetPasswordMock).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Passwords do not match",
        })
      );
    });
  });

  it("submits token and password on success", async () => {
    resetPasswordMock.mockResolvedValue(undefined);

    renderPage("/reset-password?token=abc-token");

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "new-password-123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /set new password/i }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith("abc-token", "new-password-123");
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Password reset successful",
        })
      );
    });

    expect(screen.getByText(/password updated\. redirecting to sign in\./i)).toBeInTheDocument();
  });
});
