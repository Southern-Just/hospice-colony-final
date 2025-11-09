// lib/server/bedOptimization.middleware.ts
import { Bed } from "@/types";

export const validateBeds = (beds: unknown): beds is Bed[] => {
  if (!Array.isArray(beds)) return false;
  return beds.every((bed: any) =>
      typeof bed?.id === "string" &&
      typeof bed?.status === "string" &&
      typeof bed?.ward === "string" &&
      typeof bed?.bedNumber === "string" &&
      bed?.position &&
      typeof bed.position.x === "number" &&
      typeof bed.position.y === "number"
  );
};
