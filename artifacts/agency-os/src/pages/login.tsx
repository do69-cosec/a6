import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/App";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const expiredMsg = localStorage.getItem("session_expired_message");
    if (expiredMsg) {
      toast.error(expiredMsg);
      localStorage.removeItem("session_expired_message");
    }
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast.success(`Welcome back, ${data.user.name}!`);
        navigate("/dashboard");
      },
      onError: (err: any) => {
        const backendMessage =
          err?.data && typeof err.data === "object"
            ? err.data?.error
            : undefined;

        if (backendMessage) {
          toast.error(backendMessage);
        } else if (
          err?.status === 403 &&
          typeof err?.data === "string" &&
          err.data.includes("<html")
        ) {
          toast.error("Your account has been deactivated. Please contact your administrator.");
        } else {
          toast.error("Invalid email or password.");
        }
      },
    },
  });

  const onSubmit = (values: LoginForm) => {
    loginMutation.mutate({ data: values });
  };

  return (
    <div className="min-h-screen flex items-center justify-center premium-gradient-bg p-4">
      <div className="w-full max-w-md space-y-6 animated-fade-in">
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-transparent flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/logo.png" className="h-full w-full object-cover" alt="Blink Beyond" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Blink Beyond</h1>
            <p className="text-sm text-muted-foreground">Agency OS</p>
          </div>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@agency.com"
                  data-testid="email-input"
                  {...register("email", { required: "Email is required" })}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    data-testid="password-input"
                    {...register("password", { required: "Password is required" })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                className="w-full btn-micro-anim"
                data-testid="login-button"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="font-medium text-primary hover:underline"
              >
                Create account
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
