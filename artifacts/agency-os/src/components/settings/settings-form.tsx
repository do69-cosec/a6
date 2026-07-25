"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateAgencySettings } from "@/lib/actions/settings";
import type { ActionResult } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/forms/submit-button";

const initial: ActionResult = { ok: false, error: "" };

type Settings = {
  companyName: string;
  primaryColor: string;
  emailDomain: string | null;
  gstNumber: string | null;
  defaultGstRate: number;
  sessionTimeoutMin: number;
  checkInDeadline: string | null;
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction] = useActionState(updateAgencySettings, initial);

  useEffect(() => {
    if (state.ok) toast.success("Settings saved");
    else if (!state.ok && state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Agency configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Company name</Label>
            <Input name="companyName" defaultValue={settings.companyName} required />
          </div>
          <div className="space-y-2">
            <Label>Primary brand color</Label>
            <Input name="primaryColor" type="color" defaultValue={settings.primaryColor} />
          </div>
          <div className="space-y-2">
            <Label>Email domain</Label>
            <Input name="emailDomain" defaultValue={settings.emailDomain ?? ""} placeholder="blinkbeyond.com" />
          </div>
          <div className="space-y-2">
            <Label>GST number</Label>
            <Input name="gstNumber" defaultValue={settings.gstNumber ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default GST %</Label>
              <Input name="defaultGstRate" type="number" defaultValue={settings.defaultGstRate} />
            </div>
            <div className="space-y-2">
              <Label>Session timeout (min)</Label>
              <Input name="sessionTimeoutMin" type="number" defaultValue={settings.sessionTimeoutMin} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Check-in deadline (HH:mm)</Label>
            <Input name="checkInDeadline" defaultValue={settings.checkInDeadline ?? "10:30"} />
          </div>
          <SubmitButton label="Save settings" />
        </CardContent>
      </Card>
    </form>
  );
}
