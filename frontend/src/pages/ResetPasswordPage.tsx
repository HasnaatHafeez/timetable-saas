import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Lock, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: "Invalid reset link",
        description: "The reset token is missing. Please request a new reset link.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please re-enter your password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setCompleted(true);
      toast({ title: "Password reset successful", description: "You can now sign in with your new password." });
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err.response?.data?.message || "Your reset link may have expired. Request a new one.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-foreground">Leverage Timetrix</span>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">Create a new password</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          {completed
            ? "Password updated. Redirecting to sign in."
            : "Choose a strong password and confirm it below."}
        </p>

        {!completed ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="pl-9"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="pl-9"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set new password
            </Button>
          </form>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6 text-center card-shadow">
            <p className="text-sm text-muted-foreground">Your password was updated successfully.</p>
          </div>
        )}

        <Link to="/login" className="mt-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
