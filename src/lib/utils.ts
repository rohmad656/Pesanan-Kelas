import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate Gmail compose URL
 * Opens Gmail with pre-filled recipient
 */
export function getGmailComposeUrl(
  email: string,
  subject?: string,
  body?: string,
): string {
  const params = new URLSearchParams();
  params.append("to", email);
  if (subject) params.append("subject", subject);
  if (body) params.append("body", body);
  return `https://mail.google.com/mail/?compose=1&${params.toString()}`;
}

/**
 * Generate mailto link with Gmail fallback
 * Returns appropriate link for email client
 */
export function getEmailLink(
  email: string,
  subject?: string,
  body?: string,
): string {
  // Use mailto as primary (works with most email clients)
  let link = `mailto:${email}`;
  if (subject) link += `?subject=${encodeURIComponent(subject)}`;
  if (body) {
    const separator = subject ? "&" : "?";
    link += `${separator}body=${encodeURIComponent(body)}`;
  }
  return link;
}

/**
 * Open email in Gmail (web)
 * Useful for click handlers
 */
export function openGmailCompose(
  email: string,
  subject?: string,
  body?: string,
): void {
  const url = getGmailComposeUrl(email, subject, body);
  window.open(url, "gmail", "width=800,height=600");
}
