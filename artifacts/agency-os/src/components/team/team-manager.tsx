"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Plus, Pencil, UserX, Shield, Users, UserCheck, Eye, EyeOff,
  Mail, Phone, Building, ChevronDown, Check
} from "lucide-react";
import { toast } from "sonner";
import { createTeamMember, updateTeamMember, deactivateTeamMember } from "@/lib/actions/users";
import type { ActionResult } from "@/lib/validations";
import { ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import type { SystemRole } from "@/generated/prisma/client";

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  systemRole: SystemRole;
  isActive: boolean;
};

const ROLES = Object.keys(ROLE_LABELS).filter((r) => r !== "CUSTOM") as SystemRole[];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400",
  ADMIN: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  ACCOUNT_MANAGER: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400",
  SALES_EXECUTIVE: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  DESIGNER: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400",
  DEVELOPER: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
  CONTENT_CREATOR: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  HR: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400",
  FINANCE_EXECUTIVE: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  VIEW_ONLY: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400",
};

const initial: ActionResult = { ok: false, error: "" };

function TeamForm({ member, onSuccess }: { member?: Member; onSuccess: () => void }) {
  const action = member ? updateTeamMember : createTeamMember;
  const [state, formAction] = useActionState(action, initial);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.ok) { onSuccess(); toast.success(member ? "Team member updated" : "Account created successfully"); }
    else if (!state.ok && state.error) toast.error(state.error);
  }, [state, member, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {member && <input type="hidden" name="id" value={member.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Full Name *</Label>
          <Input name="name" required defaultValue={member?.name} placeholder="Rahul Sharma" />
        </div>
        <div className="space-y-2">
          <Label>Email Address *</Label>
          <Input name="email" type="email" required defaultValue={member?.email} placeholder="rahul@blinkbeyond.com" />
        </div>
        <div className="space-y-2">
          <Label>{member ? "New Password (leave blank to keep)" : "Password *"}</Label>
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              minLength={8}
              required={!member}
              placeholder="Min. 8 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input name="phone" defaultValue={member?.phone ?? ""} placeholder="+91 98765 43210" />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Input name="department" defaultValue={member?.department ?? ""} placeholder="Design, Development, Sales..." />
        </div>
        <div className="space-y-2">
          <Label>System Role *</Label>
          <select
            name="systemRole"
            required
            defaultValue={member?.systemRole ?? "DEVELOPER"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
      </div>

      {!member && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
          <Shield className="h-3.5 w-3.5 inline mr-1" />
          The employee will use this email and password to log in. Role determines their access permissions.
        </div>
      )}

      <SubmitButton label={member ? "Save Changes" : "Create Employee Account"} />
    </form>
  );
}

export function TeamManager({ members, canManage }: { members: Member[]; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");

  const filtered = members.filter(m =>
    filter === "all" ? true :
    filter === "active" ? m.isActive :
    !m.isActive
  );

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate ${name}? They will not be able to log in until reactivated.`)) return;
    const result = await deactivateTeamMember(id);
    if (result.ok) toast.success(`${name} deactivated`);
    else toast.error(result.error);
  }

  const activeCount = members.filter(m => m.isActive).length;
  const inactiveCount = members.filter(m => !m.isActive).length;

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Staff</span>
            </div>
            <p className="text-2xl font-bold">{members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <UserX className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Deactivated</span>
            </div>
            <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-muted/60 p-1 rounded-lg">
          {(["active", "all", "inactive"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f === "active" ? `Active (${activeCount})` : f === "inactive" ? `Inactive (${inactiveCount})` : `All (${members.length})`}
            </button>
          ))}
        </div>

        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="gap-2" />}>
              <Plus className="h-4 w-4" /> Add Employee
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Employee Account</DialogTitle>
              </DialogHeader>
              <TeamForm onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No {filter !== "all" ? filter : ""} team members found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Card key={m.id} className={`transition-all hover:shadow-md ${!m.isActive ? "opacity-60" : ""}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${m.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.department ?? "—"}</p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setEditMember(m)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      {m.isActive && (
                        <button
                          onClick={() => void handleDeactivate(m.id, m.name)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                          title="Deactivate"
                        >
                          <UserX className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </div>
                  {m.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{m.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${ROLE_COLORS[m.systemRole] ?? ""}`}
                  >
                    {ROLE_LABELS[m.systemRole] ?? m.systemRole}
                  </Badge>
                  <Badge variant={m.isActive ? "outline" : "secondary"} className={`text-[10px] ml-auto ${m.isActive ? "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20" : ""}`}>
                    {m.isActive ? <><Check className="h-2.5 w-2.5 mr-0.5" />Active</> : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editMember} onOpenChange={(v) => !v && setEditMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Employee — {editMember?.name}</DialogTitle>
          </DialogHeader>
          {editMember && (
            <TeamForm member={editMember} onSuccess={() => setEditMember(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
