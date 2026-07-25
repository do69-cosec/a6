export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { getGetTodayAttendanceQueryKey, getListAttendanceQueryKey } from "./generated/api";

export const overtimeCheckIn = async (options?: RequestInit): Promise<any> => {
  return customFetch<any>("/api/attendance/overtime-check-in", {
    ...options,
    method: "POST",
  });
};

export const overtimeCheckOut = async (options?: RequestInit): Promise<any> => {
  return customFetch<any>("/api/attendance/overtime-check-out", {
    ...options,
    method: "POST",
  });
};

export const useOvertimeCheckIn = (options?: { mutation?: any }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: overtimeCheckIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
      qc.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess();
      }
    },
    onError: (err: any) => {
      if (options?.mutation?.onError) {
        options.mutation.onError(err);
      }
    },
    ...options?.mutation,
  });
};

export const useOvertimeCheckOut = (options?: { mutation?: any }) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: overtimeCheckOut,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
      qc.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess();
      }
    },
    onError: (err: any) => {
      if (options?.mutation?.onError) {
        options.mutation.onError(err);
      }
    },
    ...options?.mutation,
  });
};

