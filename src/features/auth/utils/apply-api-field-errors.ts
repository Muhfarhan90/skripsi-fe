import type { Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api/client";

export function applyApiFieldErrors<T extends Record<string, unknown>>(
  error: unknown,
  setError: UseFormSetError<T>,
) {
  if (!(error instanceof ApiError) || !error.errors) return;

  // Laravel validation errors are returned as { fieldName: ["message"] }.
  for (const [field, messages] of Object.entries(error.errors)) {
    const firstMessage =
      Array.isArray(messages) && messages.length > 0
        ? String(messages[0])
        : "Input tidak valid";
    setError(field as Path<T>, {
      type: "server",
      message: firstMessage,
    });
  }
}
