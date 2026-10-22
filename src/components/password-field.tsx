"use client";
import { LocalizedContent } from "@/components/localization";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
export function PasswordField({
  label,
  id,
  maxLength = 128,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <LocalizedContent>
      {
        <div className="password-field">
          <label htmlFor={inputId}>{label}</label>
          <div className="password-control">
            <input
              {...props}
              id={inputId}
              type={visible ? "text" : "password"}
              maxLength={maxLength}
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={(visible ? "Ẩn " : "Hiện ") + label.toLowerCase()}
              aria-controls={inputId}
              aria-pressed={visible}
              onClick={() => setVisible((value) => !value)}
            >
              {visible ? (
                <EyeOff size={20} aria-hidden="true" />
              ) : (
                <Eye size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      }
    </LocalizedContent>
  );
}
