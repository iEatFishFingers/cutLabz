import type { ReactNode } from "react";
import { field, label } from "./styles";

export function Field({
  id,
  name,
  text,
  type = "text",
  autoComplete,
  maxLength,
  error,
  hint,
  inputMode,
  defaultValue,
  readOnly,
  required = true,
}: {
  id: string;
  name: string;
  text: string;
  type?: string;
  autoComplete?: string;
  maxLength: number;
  error?: string;
  hint?: ReactNode;
  inputMode?: "tel" | "email" | "text";
  defaultValue?: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        readOnly={readOnly}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={`${field} ${readOnly ? "text-white/50" : ""}`}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-xs text-white/40">
          {hint}
        </p>
      )}
      <p id={`${id}-err`} aria-live="polite" className="text-sm text-red-400 mt-2 empty:hidden">
        {error ?? ""}
      </p>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  return (
    <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-400">
      {message ?? ""}
    </p>
  );
}
