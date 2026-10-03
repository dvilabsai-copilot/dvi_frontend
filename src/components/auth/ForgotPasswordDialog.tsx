import {
  useEffect,
  useState,
} from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import {
  resetPasswordWithOtp,
  sendPasswordResetOtp,
} from "@/services/auth";

type ForgotPasswordDialogProps = {
  open: boolean;
  onOpenChange: (
    open: boolean,
  ) => void;
  defaultEmail?: string;
};

export default function ForgotPasswordDialog({
  open,
  onOpenChange,
  defaultEmail = "",
}: ForgotPasswordDialogProps) {
  const [email, setEmail] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [codeSent, setCodeSent] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      return;
    }

    setEmail(
      defaultEmail.trim(),
    );

    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setCodeSent(false);
  }, [
    open,
    defaultEmail,
  ]);

  const sendCode = async () => {
    const normalizedEmail =
      email.trim();

    if (
      !normalizedEmail ||
      !normalizedEmail.includes("@")
    ) {
      toast({
        title: "Email required",
        description:
          "Enter your registered Agent email address.",
        variant: "destructive",
      });

      return;
    }

    try {
      setLoading(true);

      await sendPasswordResetOtp(
        normalizedEmail,
      );

      setEmail(
        normalizedEmail,
      );

      setCodeSent(true);

      toast({
        title:
          "Password reset code sent",
        description:
          "Check your registered email.",
      });
    } catch (error: unknown) {
      toast({
        title:
          "Unable to send code",
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (
    event:
      React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      toast({
        title: "Invalid code",
        description:
          "Enter the six-digit code sent to your email.",
        variant: "destructive",
      });

      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Invalid password",
        description:
          "Password must be at least 6 characters.",
        variant: "destructive",
      });

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      toast({
        title:
          "Passwords do not match",
        variant: "destructive",
      });

      return;
    }

    try {
      setLoading(true);

      await resetPasswordWithOtp({
        email,
        otp,
        newPassword,
        confirmPassword,
      });

      toast({
        title:
          "Password reset successfully",
        description:
          "You can now sign in with your new password.",
      });

      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title:
          "Unable to reset password",
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Forgot Password
          </DialogTitle>

          <DialogDescription>
            {!codeSent
              ? "Enter your registered Agent email address."
              : "Enter the code from your email and choose a new password."}
          </DialogDescription>
        </DialogHeader>

        {!codeSent ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">
                Email
              </Label>

              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                disabled={loading}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={sendCode}
                disabled={loading}
              >
                {loading
                  ? "Sending..."
                  : "Send Reset Code"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={resetPassword}
            className="space-y-4"
          >
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) =>
                setOtp(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6),
                )
              }
              placeholder="6-digit code"
            />

            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value,
                )
              }
              placeholder="New password"
            />

            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              placeholder="Confirm new password"
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Resetting..."
                  : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}