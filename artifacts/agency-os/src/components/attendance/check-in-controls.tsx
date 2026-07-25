"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CheckInControls({
  isCheckedIn,
}: {
  isCheckedIn: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(isCheckedIn);

  async function checkIn() {
    setLoading(true);
    let coords: { latitude: number; longitude: number } | null = null;

    if (typeof window !== "undefined" && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: true,
          });
        });
        coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      } catch (err) {
        console.warn("Geolocation failed or denied:", err);
      }
    }

    const res = await fetch("/api/attendance/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coords ?? {}),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Check-in failed");
      return;
    }
    setCheckedIn(true);
    toast.success(
      coords
        ? "Checked in successfully with location"
        : "Checked in successfully (location unavailable)"
    );
  }

  async function checkOut() {
    setLoading(true);
    const res = await fetch("/api/attendance/check-out", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Check-out failed");
      return;
    }
    setCheckedIn(false);
    toast.success("Checked out — have a great evening!");
  }

  return (
    <div className="flex gap-3">
      {!checkedIn ? (
        <Button onClick={checkIn} disabled={loading}>
          Check In
        </Button>
      ) : (
        <Button variant="outline" onClick={checkOut} disabled={loading}>
          Check Out
        </Button>
      )}
    </div>
  );
}
