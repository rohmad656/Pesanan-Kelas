/**
 * Support Email Link Component
 * Provides easy access to support email with Gmail integration
 */

import React from "react";
import { Mail, Copy, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";
import toast from "react-hot-toast";

interface SupportEmailLinkProps {
  email: string;
  fallbackEmail?: string;
  subject?: string;
  body?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "inline" | "block" | "card";
  showIcon?: boolean;
  showFallback?: boolean;
}

export const SupportEmailLink: React.FC<SupportEmailLinkProps> = ({
  email,
  fallbackEmail,
  subject,
  body,
  className,
  size = "md",
  variant = "inline",
  showIcon = true,
  showFallback = true,
}) => {
  const copyToClipboard = (emailToCopy: string) => {
    navigator.clipboard.writeText(emailToCopy);
    toast.success(`Email copied: ${emailToCopy}`);
  };

  const handleEmailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Try Gmail first if available
    const gmailUrl = `https://mail.google.com/mail/?compose=1&to=${encodeURIComponent(email)}${
      subject ? `&subject=${encodeURIComponent(subject)}` : ""
    }${body ? `&body=${encodeURIComponent(body)}` : ""}`;

    // Open in new window with fallback to mailto
    const newWindow = window.open(gmailUrl, "gmail", "width=800,height=600");
    if (!newWindow) {
      // Fallback to mailto if popup blocked
      window.location.href = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
    }
  };

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  if (variant === "card") {
    return (
      <div
        className={cn(
          "bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl p-5",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-[#32324A] flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-brand-600 dark:text-brand-dark-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900 dark:text-[#F5F5F5] text-sm">
              Email Support Kampus
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={handleEmailClick}
                className="text-brand-600 dark:text-brand-dark-accent hover:text-brand-700 dark:hover:text-brand-dark-accent-light hover:underline text-xs font-medium transition-colors flex items-center gap-1"
              >
                {email}
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={() => copyToClipboard(email)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#B4B4C8] rounded hover:bg-slate-100 dark:hover:bg-[#32324A] transition-colors"
                title="Copy email"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            {fallbackEmail && showFallback && (
              <p className="text-[10px] text-slate-500 dark:text-[#B4B4C8] mt-1">
                Alternatif: <span className="font-mono">{fallbackEmail}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "block") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <p className="text-[10px] text-slate-500 dark:text-[#B4B4C8] font-medium">
          Email Support Kampus:
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEmailClick}
            className={cn(
              "text-brand-400 hover:text-brand-300 dark:text-brand-dark-accent dark:hover:text-brand-dark-accent-light font-medium transition-colors underline underline-offset-2 flex items-center gap-1",
              sizeClasses[size],
            )}
          >
            {email}
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={() => copyToClipboard(email)}
            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#B4B4C8] rounded hover:bg-slate-100 dark:hover:bg-[#32324A] transition-colors"
            title="Copy email"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        {fallbackEmail && showFallback && (
          <span className="text-[8px] text-slate-500 dark:text-[#B4B4C8]">
            Alternatif: {fallbackEmail}
          </span>
        )}
      </div>
    );
  }

  // Default: inline
  return (
    <button
      onClick={handleEmailClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 dark:text-brand-dark-accent dark:hover:text-brand-dark-accent-light font-medium transition-colors underline underline-offset-2 hover:scale-105 active:scale-95",
        sizeClasses[size],
        className,
      )}
      title={`Email: ${email} (Click to compose)`}
    >
      {showIcon && <Mail className="w-3 h-3" />}
      {email}
    </button>
  );
};
