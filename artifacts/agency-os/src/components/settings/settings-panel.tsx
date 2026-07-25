"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateAgencySettings } from "@/lib/actions/settings";
import type { ActionResult } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SubmitButton } from "@/components/forms/submit-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Palette, Globe, Shield, Bell, Plug, CreditCard,
  CheckCircle2, Copy, Eye, EyeOff, Zap
} from "lucide-react";

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

export function SettingsPanel({ settings }: { settings: Settings }) {
  const [state, formAction] = useActionState(updateAgencySettings, initial);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.ok) toast.success("Settings saved successfully!");
    else if (!state.ok && state.error) toast.error(state.error);
  }, [state]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const AYRSHARE_KEY = process.env.NEXT_PUBLIC_AYRSHARE_DISPLAY ?? "Configure in .env file";

  return (
    <Tabs defaultValue="branding">
      <TabsList className="flex flex-wrap gap-1 h-auto">
        <TabsTrigger value="branding" className="gap-1.5">
          <Palette className="h-3.5 w-3.5" /> Branding
        </TabsTrigger>
        <TabsTrigger value="finance" className="gap-1.5">
          <CreditCard className="h-3.5 w-3.5" /> Finance & Tax
        </TabsTrigger>
        <TabsTrigger value="security" className="gap-1.5">
          <Shield className="h-3.5 w-3.5" /> Security
        </TabsTrigger>
        <TabsTrigger value="integrations" className="gap-1.5">
          <Plug className="h-3.5 w-3.5" /> Integrations
        </TabsTrigger>
        <TabsTrigger value="notifications" className="gap-1.5">
          <Bell className="h-3.5 w-3.5" /> Notifications
        </TabsTrigger>
      </TabsList>

      {/* Branding Tab */}
      <TabsContent value="branding" className="mt-4">
        <form action={formAction}>
          <Card>
            <CardHeader>
              <CardTitle>Agency Branding</CardTitle>
              <CardDescription>Customize your agency's visual identity across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input name="companyName" defaultValue={settings.companyName} required />
                  <p className="text-xs text-muted-foreground">Appears on invoices, proposals, and agreements</p>
                </div>
                <div className="space-y-2">
                  <Label>Primary Brand Color</Label>
                  <div className="flex gap-2">
                    <Input name="primaryColor" type="color" defaultValue={settings.primaryColor} className="h-9 w-16 p-1 cursor-pointer" />
                    <Input defaultValue={settings.primaryColor} readOnly className="font-mono text-sm" />
                  </div>
                  <p className="text-xs text-muted-foreground">Updates the sidebar and accent colors instantly</p>
                </div>
                <div className="space-y-2">
                  <Label>Company Domain</Label>
                  <Input name="emailDomain" defaultValue={settings.emailDomain ?? ""} placeholder="blinkbeyond.com" />
                  <p className="text-xs text-muted-foreground">Used in email templates</p>
                </div>
              </div>

              {/* Preview swatch */}
              <div className="border rounded-xl p-4 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Brand preview</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: settings.primaryColor }}>
                    {settings.companyName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{settings.companyName}</p>
                    <p className="text-xs text-muted-foreground">{settings.emailDomain ?? "agency.com"}</p>
                  </div>
                  <Badge className="ml-auto" style={{ backgroundColor: settings.primaryColor + "20", color: settings.primaryColor, borderColor: settings.primaryColor + "40" }}>
                    Active Brand
                  </Badge>
                </div>
              </div>

              <SubmitButton label="Save Branding" />
            </CardContent>
          </Card>
        </form>
      </TabsContent>

      {/* Finance Tab */}
      <TabsContent value="finance" className="mt-4">
        <form action={formAction}>
          <Card>
            <CardHeader>
              <CardTitle>Finance & Tax Settings</CardTitle>
              <CardDescription>GST configuration for invoices and billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label>GST Registration Number</Label>
                <Input name="gstNumber" defaultValue={settings.gstNumber ?? ""} placeholder="27XXXXX1234X1ZX" className="font-mono" />
                <p className="text-xs text-muted-foreground">Appears on all generated invoices automatically</p>
              </div>
              <div className="space-y-2">
                <Label>Default GST Rate (%)</Label>
                <Input name="defaultGstRate" type="number" min={0} max={100} defaultValue={settings.defaultGstRate} />
                <p className="text-xs text-muted-foreground">Standard rate applied to new invoices (can be overridden per invoice)</p>
              </div>

              <div className="border rounded-xl p-4 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                <div className="flex gap-2">
                  <CreditCard className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-400">
                    <p className="font-semibold">GST Compliance</p>
                    <p className="mt-0.5">All invoices will include CGST + SGST breakdown per Indian GST regulations. Ensure your GST number is valid before sending client invoices.</p>
                  </div>
                </div>
              </div>

              <input type="hidden" name="companyName" value={settings.companyName} />
              <input type="hidden" name="primaryColor" value={settings.primaryColor} />
              <input type="hidden" name="sessionTimeoutMin" value={settings.sessionTimeoutMin} />
              <SubmitButton label="Save Finance Settings" />
            </CardContent>
          </Card>
        </form>
      </TabsContent>

      {/* Security Tab */}
      <TabsContent value="security" className="mt-4">
        <form action={formAction}>
          <Card>
            <CardHeader>
              <CardTitle>Security & Access</CardTitle>
              <CardDescription>Session management and attendance controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Input name="sessionTimeoutMin" type="number" min={15} max={1440} defaultValue={settings.sessionTimeoutMin} />
                <p className="text-xs text-muted-foreground">Auto-logout after this period of inactivity (15–1440 min)</p>
              </div>
              <div className="space-y-2">
                <Label>Check-in Deadline (24h format)</Label>
                <Input name="checkInDeadline" defaultValue={settings.checkInDeadline ?? "10:30"} placeholder="10:30" />
                <p className="text-xs text-muted-foreground">Attendance after this time is marked "Late" in the system</p>
              </div>

              <div className="border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Security Status</p>
                {[
                  { label: "Two-factor auth", status: "Recommended", ok: false },
                  { label: "Session management", status: "Active", ok: true },
                  { label: "Role-based access", status: "Configured", ok: true },
                  { label: "Audit logging", status: "Enabled", ok: true },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <Badge variant={item.ok ? "outline" : "secondary"} className={`text-[10px] ${item.ok ? "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20" : "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20"}`}>
                      {item.ok && <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />}
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <input type="hidden" name="companyName" value={settings.companyName} />
              <input type="hidden" name="primaryColor" value={settings.primaryColor} />
              <input type="hidden" name="gstNumber" value={settings.gstNumber ?? ""} />
              <input type="hidden" name="defaultGstRate" value={settings.defaultGstRate} />
              <SubmitButton label="Save Security Settings" />
            </CardContent>
          </Card>
        </form>
      </TabsContent>

      {/* Integrations Tab */}
      <TabsContent value="integrations" className="mt-4">
        <div className="space-y-4">
          {/* Ayrshare Social Publishing */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-violet-500" />
                    Ayrshare Social API
                  </CardTitle>
                  <CardDescription>One-click publishing to LinkedIn, YouTube & Instagram</CardDescription>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value="AYRSHARE_API_KEY_FROM_ENV"
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Set in .env as <code className="bg-muted px-1 rounded">AYRSHARE_API_KEY</code></p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["LinkedIn", "YouTube", "Instagram", "Facebook", "Twitter/X"].map((p) => (
                  <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                ))}
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-semibold mb-1">How one-click publishing works:</p>
                <p>When content is approved in the Content Calendar and you click "Publish to Platforms", the Ayrshare API simultaneously pushes to all selected social accounts. Credentials are managed in your Ayrshare dashboard.</p>
              </div>
            </CardContent>
          </Card>

          {/* AI Template Copilot API Integrations */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-indigo-500" />
                    AI Template Copilot (Gemini / Groq / OpenRouter)
                  </CardTitle>
                  <CardDescription>Configure AI credentials for automated invoice, proposal, and agreement drafting</CardDescription>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-muted-foreground space-y-2">
                <p>The AI Template Copilot reads client descriptions in plain text and generates complete drafts. You can configure your keys either globally in your local environment file (<code className="bg-muted px-1 rounded">.env</code>), or enter them dynamically inside the AI Copilot drawer.</p>
                <div className="bg-muted/40 p-3 rounded-lg border space-y-1.5 font-mono text-[11px] text-foreground">
                  <p># Edit these values in your .env file:</p>
                  <p>GEMINI_API_KEY="your_gemini_api_key"</p>
                  <p>GROQ_API_KEY="your_groq_api_key"</p>
                  <p>OPENROUTER_API_KEY="your_openrouter_api_key"</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {["Gemini 2.5 Flash", "Llama 3.3 70B", "OpenRouter Fallback", "Local Simulation Mode"].map((model) => (
                  <Badge key={model} variant="secondary" className="text-xs">{model}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Other Integration Cards */}
          {[
            { name: "Google Workspace", desc: "Drive file attachments, Gmail sending", status: "Configure", icon: "🔧", available: false },
            { name: "Slack Notifications", desc: "Team alerts for tasks and approvals", status: "Configure", icon: "💬", available: false },
            { name: "Razorpay Payments", desc: "Online invoice payment links", status: "Configure", icon: "💳", available: false },
          ].map((int) => (
            <Card key={int.name} className="opacity-75">
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{int.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{int.name}</p>
                    <p className="text-xs text-muted-foreground">{int.desc}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Coming Soon
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* Notifications Tab */}
      <TabsContent value="notifications" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Control what alerts appear in the notification bell</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-w-md">
              {[
                { label: "New lead assigned to me", desc: "When a sales lead is assigned", enabled: true },
                { label: "Invoice becomes overdue", desc: "Unpaid invoices past due date", enabled: true },
                { label: "Content approved for publishing", desc: "Content gets admin approval", enabled: true },
                { label: "Project deadline approaching", desc: "3 days before project end date", enabled: true },
                { label: "Leave request submitted", desc: "Employee submits leave (HR only)", enabled: false },
                { label: "New client added", desc: "When a lead converts to client", enabled: true },
              ].map((notif, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{notif.label}</p>
                    <p className="text-xs text-muted-foreground">{notif.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={notif.enabled}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                </div>
              ))}
              <Button className="mt-2 w-full" variant="outline">Save Notification Preferences</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
