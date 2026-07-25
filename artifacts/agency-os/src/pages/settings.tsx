import { useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import type { AgencySettingsUpdate } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useTheme } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Palette, ShieldAlert, BadgeIndianRupee, Sun, Moon } from "lucide-react";
import { useForm, Controller } from "react-hook-form";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: settings, isLoading } = useGetSettings();

  const isSuperAdmin = user?.systemRole === "SUPER_ADMIN";

  const updateMutation = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        toast.success("Settings updated successfully");
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to update settings");
      },
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<AgencySettingsUpdate>();

  useEffect(() => {
    if (settings) {
      reset({
        agencyName: settings.agencyName,
        email: settings.email ?? "",
        phone: settings.phone ?? "",
        address: settings.address ?? "",
        website: settings.website ?? "",
        primaryColor: settings.primaryColor ?? "#6366f1",
        currency: settings.currency ?? "INR",
        taxLabel: settings.taxLabel ?? "GST",
        taxPercent: settings.taxPercent ?? 18,
        workDayStart: settings.workDayStart ?? "09:00",
        workDayEnd: settings.workDayEnd ?? "18:00",
      });
    }
  }, [settings, reset]);

  const onSubmit = (data: AgencySettingsUpdate) => {
    if (!isSuperAdmin) {
      toast.error("Only Super Admins can update settings");
      return;
    }
    // Convert taxPercent to number
    if (data.taxPercent !== undefined) {
      data.taxPercent = Number(data.taxPercent);
    }
    updateMutation.mutate({ data });
  };

  return (
    <div className="p-6 space-y-6 animated-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure agency details, branding, financial preferences, and workspace options
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general" className="gap-2">
                <Building2 className="h-4 w-4" /> General
              </TabsTrigger>
              <TabsTrigger value="branding" className="gap-2">
                <Palette className="h-4 w-4" /> Branding & Theme
              </TabsTrigger>
              <TabsTrigger value="financials" className="gap-2">
                <BadgeIndianRupee className="h-4 w-4" /> Taxes & Currency
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general">
              <Card className="shadow-sm border border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">General Details</CardTitle>
                  <CardDescription>Configure primary contact details and operations schedule.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Agency Name *</Label>
                      <Input
                        {...register("agencyName", { required: "Required" })}
                        disabled={!isSuperAdmin}
                        placeholder="Blink Beyond"
                        data-testid="agency-name-input"
                      />
                      {errors.agencyName && <p className="text-xs text-destructive">{errors.agencyName.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Website URL</Label>
                      <Input
                        {...register("website")}
                        disabled={!isSuperAdmin}
                        placeholder="https://blinkbeyond.com"
                        data-testid="agency-website-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Contact Email</Label>
                      <Input
                        {...register("email")}
                        disabled={!isSuperAdmin}
                        type="email"
                        placeholder="hello@blinkbeyond.com"
                        data-testid="agency-email-input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Contact Phone</Label>
                      <Input
                        {...register("phone")}
                        disabled={!isSuperAdmin}
                        placeholder="+91 98765 43210"
                        data-testid="agency-phone-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Business Address</Label>
                    <Input
                      {...register("address")}
                      disabled={!isSuperAdmin}
                      placeholder="123 Creative Studio, Bangalore, India"
                      data-testid="agency-address-input"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <div className="space-y-1.5">
                      <Label>Work Day Start Time</Label>
                      <Input
                        {...register("workDayStart")}
                        disabled={!isSuperAdmin}
                        type="time"
                        data-testid="agency-work-start"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Work Day End Time</Label>
                      <Input
                        {...register("workDayEnd")}
                        disabled={!isSuperAdmin}
                        type="time"
                        data-testid="agency-work-end"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding & Theme Tab */}
            <TabsContent value="branding">
              <Card className="shadow-sm border border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Branding & System Theme</CardTitle>
                  <CardDescription>Personalize color palettes and system aesthetics.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Color Picker */}
                  <div className="space-y-2">
                    <Label>Brand Accent Color</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        {...register("primaryColor")}
                        disabled={!isSuperAdmin}
                        type="color"
                        className="w-12 h-10 p-0 border cursor-pointer"
                        data-testid="agency-color-picker"
                      />
                      <Controller
                        control={control}
                        name="primaryColor"
                        render={({ field }) => (
                          <div className="flex gap-2">
                            {["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"].map((color) => (
                              <button
                                key={color}
                                type="button"
                                disabled={!isSuperAdmin}
                                onClick={() => field.onChange(color)}
                                className="w-6 h-6 rounded-full border border-border transition-transform hover:scale-110"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* Dark Mode toggle */}
                  <div className="border-t pt-4 space-y-2">
                    <Label>Workspace Theme Mode</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={theme === "light" ? "default" : "outline"}
                        onClick={theme === "dark" ? toggleTheme : undefined}
                        className="gap-2"
                        data-testid="light-theme-btn"
                      >
                        <Sun className="h-4 w-4" /> Light
                      </Button>
                      <Button
                        type="button"
                        variant={theme === "dark" ? "default" : "outline"}
                        onClick={theme === "light" ? toggleTheme : undefined}
                        className="gap-2"
                        data-testid="dark-theme-btn"
                      >
                        <Moon className="h-4 w-4" /> Dark
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financials Tab */}
            <TabsContent value="financials">
              <Card className="shadow-sm border border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Taxes & Currency</CardTitle>
                  <CardDescription>Setup default tax rate structures and currency profiles.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Currency</Label>
                      <Controller
                        control={control}
                        name="currency"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!isSuperAdmin}
                          >
                            <SelectTrigger data-testid="agency-currency-select">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INR">INR (₹)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="AED">AED (Dh)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Tax Label</Label>
                        <Input
                          {...register("taxLabel")}
                          disabled={!isSuperAdmin}
                          placeholder="GST"
                          data-testid="agency-tax-label"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Tax Percent (%)</Label>
                        <Input
                          {...register("taxPercent")}
                          disabled={!isSuperAdmin}
                          type="number"
                          placeholder="18"
                          data-testid="agency-tax-percent"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Footer */}
          {isSuperAdmin ? (
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="btn-micro-anim px-6"
                data-testid="save-settings-btn"
              >
                {updateMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 p-4 flex gap-3 items-center">
              <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                You are viewing settings in read-only mode. Only system Administrators (Super Admin) can update agency settings.
              </p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
