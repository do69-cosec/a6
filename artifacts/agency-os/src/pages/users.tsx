import { useState, useEffect } from "react";
import {
  useListUsers, useCreateUser, useUpdateUser, useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import type { UserInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { Plus, Trash2, UserCog, Mail, Pencil } from "lucide-react";
import { useAuth } from "@/App";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  SUPER_ADMIN: { label: "Super Admin", className: "bg-violet-100 text-violet-700" },
  MANAGER: { label: "Manager", className: "bg-blue-100 text-blue-700" },
  ACCOUNT_MANAGER: { label: "Account Manager", className: "bg-indigo-100 text-indigo-700" },
  DESIGNER: { label: "Designer", className: "bg-pink-100 text-pink-700" },
  SALES_EXECUTIVE: { label: "Sales Executive", className: "bg-emerald-100 text-emerald-700" },
  DEVELOPER: { label: "Developer", className: "bg-cyan-100 text-cyan-700" },
  FINANCE_EXECUTIVE: { label: "Finance", className: "bg-amber-100 text-amber-700" },
  HR: { label: "HR", className: "bg-orange-100 text-orange-700" },
};

const AVAILABLE_MODULES = [
  { id: "clients", label: "Clients & Leads" },
  { id: "sales", label: "Sales & Pipelines" },
  { id: "projects", label: "Projects" },
  { id: "tasks", label: "Tasks" },
  { id: "content", label: "Content Ideation" },
  { id: "invoices", label: "Invoices" },
  { id: "quotations", label: "Quotations" },
  { id: "purchaseOrders", label: "Purchase Orders" },
  { id: "proposals", label: "Proposals" },
  { id: "attendance", label: "Attendance" },
  { id: "leaves", label: "Leaves Management" },
  { id: "team", label: "Team & Roles" },
  { id: "settings", label: "Configuration Settings" },
];

export default function UsersPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.systemRole === "SUPER_ADMIN";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [failedEmail, setFailedEmail] = useState<string | null>(null);

  const { data: users, isLoading } = useListUsers();

  const { register, handleSubmit, control, reset, setValue, watch, setError, clearErrors, formState: { errors } } = useForm<UserInput>({
    defaultValues: { name: "", email: "", password: "", systemRole: "ACCOUNT_MANAGER", allowedModules: [] },
  });

  const emailValue = watch("email");
  useEffect(() => {
    if (errors.email && emailValue !== failedEmail) {
      clearErrors("email");
    }
  }, [emailValue, failedEmail, clearErrors, errors.email]);

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        toast.success("Team member added");
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setDialogOpen(false);
      },
      onError: (err: any) => {
        if (err && err.status === 409) {
          const errorMsg = err.data?.error || err.message || "";
          if (errorMsg.toLowerCase().includes("email")) {
            setFailedEmail(emailValue);
            setError("email", {
              type: "manual",
              message: "This email is already in use. Please use a different email.",
            });
            return;
          }
        }
        toast.error("Failed to add user");
      },
    },
  });

  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        toast.success("User updated");
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setDialogOpen(false);
        setEditId(null);
      },
      onError: (err: any) => {
        if (err && err.status === 409) {
          const errorMsg = err.data?.error || err.message || "";
          if (errorMsg.toLowerCase().includes("email")) {
            setFailedEmail(emailValue);
            setError("email", {
              type: "manual",
              message: "This email is already in use. Please use a different email.",
            });
            return;
          }
        }
        toast.error("Failed to update user");
      },
    },
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        toast.success("User removed");
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
    },
  });

  const toggleActive = (id: string, isActive: boolean) => {
    updateMutation.mutate({ id, data: { isActive } });
  };

  const generateEmail = () => {
    const nameVal = watch("name");
    if (!nameVal) {
      toast.warning("Please enter a full name first");
      return;
    }
    const cleanName = nameVal
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, ".");
    setValue("email", `${cleanName}@blinkbeyond.com`);
    toast.success("Username/Email generated");
  };

  const generatePassword = () => {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const num = "0123456789";
    const special = "@#$!%*?&";
    const all = lower + upper + num + special;

    let pass = [
      lower[Math.floor(Math.random() * lower.length)],
      upper[Math.floor(Math.random() * upper.length)],
      num[Math.floor(Math.random() * num.length)],
      special[Math.floor(Math.random() * special.length)]
    ];

    for (let i = 0; i < 8; i++) {
      pass.push(all[Math.floor(Math.random() * all.length)]);
    }

    // Shuffle
    pass = pass.sort(() => 0.5 - Math.random());

    setValue("password", pass.join(""));
    toast.success("Temporary secure password generated");
  };

  const openAdd = () => {
    setFailedEmail(null);
    reset({ name: "", email: "", password: "", systemRole: "ACCOUNT_MANAGER", allowedModules: [] });
    setEditId(null);
    setDialogOpen(true);
  };

  const openEdit = (u: any) => {
    setFailedEmail(null);
    const freshU = (users ?? []).find((userObj: any) => userObj.id === u.id) || u;
    setEditId(freshU.id);
    reset({
      name: freshU.name,
      email: freshU.email,
      systemRole: freshU.systemRole ?? "ACCOUNT_MANAGER",
      department: freshU.department ?? "",
      allowedModules: freshU.allowedModules ?? []
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: UserInput) => {
    if (editId) {
      updateMutation.mutate({ id: editId, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  return (
    <div className="p-6 animated-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Team & Roles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users?.length ?? 0} team members</p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} className="gap-2 btn-micro-anim" data-testid="add-user-btn">
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-24" /></CardContent></Card>
          ))}
        </div>
      ) : (users ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UserCog className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No team members yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(users ?? []).map((u) => {
            const rc = ROLE_CONFIG[u.systemRole ?? "ACCOUNT_MANAGER"];
            return (
              <Card key={u.id} className="scale-hover">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary uppercase">
                          {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.department ?? "—"}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate({ id: u.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Badge variant="secondary" className={cn("text-[11px] mb-3", rc?.className)}>
                    {rc?.label ?? u.systemRole}
                  </Badge>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Active</span>
                    <Switch
                      checked={u.isActive ?? true}
                      onCheckedChange={(v) => toggleActive(u.id, v)}
                      disabled={!isAdmin || u.id === user?.id}
                      data-testid={`toggle-user-${u.id}`}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input {...register("name", { required: "Required" })} placeholder="Jane Doe" data-testid="user-name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Email / Username</Label>
                <Button type="button" variant="link" className="h-auto p-0 text-xs text-primary" onClick={generateEmail}>
                  Generate Username
                </Button>
              </div>
              <Input
                {...register("email", { required: "Required" })}
                type="email"
                placeholder="jane@blinkbeyond.com"
                data-testid="user-email"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            {!editId && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Password</Label>
                  <Button type="button" variant="link" className="h-auto p-0 text-xs text-primary" onClick={generatePassword}>
                    Generate Password
                  </Button>
                </div>
                <Input {...register("password", { required: !editId ? "Required" : false })} placeholder="••••••••" />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Controller control={control} name="systemRole" render={({ field }) => (
                  <Select value={field.value ?? "ACCOUNT_MANAGER"} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input {...register("department")} placeholder="Design, Sales..." />
              </div>
            </div>

            <div className="space-y-2 border-t pt-3 mt-3">
              <Label className="text-sm font-semibold">Access Permissions</Label>
              <p className="text-xs text-muted-foreground">Select which modules this team member can access</p>
              <Controller
                control={control}
                name="allowedModules"
                render={({ field }) => {
                  const currentModules = field.value || [];
                  const handleToggle = (moduleId: string) => {
                    const next = currentModules.includes(moduleId)
                      ? currentModules.filter((id: string) => id !== moduleId)
                      : [...currentModules, moduleId];
                    field.onChange(next);
                  };

                  return (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
                      {AVAILABLE_MODULES.map((m) => (
                        <div key={m.id} className="flex items-center justify-between border rounded-lg p-2 bg-card hover:bg-accent/40 transition-colors">
                          <Label className="text-xs font-medium cursor-pointer" htmlFor={`permission-${m.id}`}>
                            {m.label}
                          </Label>
                          <Switch
                            id={`permission-${m.id}`}
                            checked={currentModules.includes(m.id)}
                            onCheckedChange={() => handleToggle(m.id)}
                          />
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="save-user-btn">
                {editId ? "Save Changes" : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
