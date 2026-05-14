/**
 * Account Status Alert Component
 * User-friendly display for account-related messages
 */

import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  LogIn,
  UserPlus,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "./utils";

interface AccountStatusAlertProps {
  status: "error" | "warning" | "success" | "info";
  title: string;
  message: string;
  suggestion?: string;
  actionText?: string;
  actionUrl?: string;
  onDismiss?: () => void;
  className?: string;
}

export const AccountStatusAlert: React.FC<AccountStatusAlertProps> = ({
  status,
  title,
  message,
  suggestion,
  actionText,
  actionUrl,
  onDismiss,
  className,
}) => {
  const navigate = useNavigate();

  const statusConfig = {
    error: {
      icon: AlertCircle,
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-red-200 dark:border-red-800/50",
      titleColor: "text-red-900 dark:text-red-200",
      messageColor: "text-red-800 dark:text-red-300",
      buttonColor:
        "bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700",
    },
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      borderColor: "border-amber-200 dark:border-amber-800/50",
      titleColor: "text-amber-900 dark:text-amber-200",
      messageColor: "text-amber-800 dark:text-amber-300",
      buttonColor:
        "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700",
    },
    success: {
      icon: CheckCircle2,
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-200 dark:border-green-800/50",
      titleColor: "text-green-900 dark:text-green-200",
      messageColor: "text-green-800 dark:text-green-300",
      buttonColor:
        "bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700",
    },
    info: {
      icon: Info,
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800/50",
      titleColor: "text-blue-900 dark:text-blue-200",
      messageColor: "text-blue-800 dark:text-blue-300",
      buttonColor:
        "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const handleAction = () => {
    if (actionUrl) {
      navigate(actionUrl);
    }
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4 md:p-6",
        config.bgColor,
        config.borderColor,
        className,
      )}
      role="alert"
    >
      <div className="flex gap-4">
        <Icon
          className={cn("h-6 w-6 flex-shrink-0 mt-0.5", config.titleColor)}
        />

        <div className="flex-1">
          <h3 className={cn("font-bold text-lg", config.titleColor)}>
            {title}
          </h3>

          <p className={cn("mt-2 text-sm", config.messageColor)}>{message}</p>

          {suggestion && (
            <p className={cn("mt-3 text-sm italic", config.messageColor)}>
              💡 {suggestion}
            </p>
          )}

          {actionText && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleAction}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                  config.buttonColor,
                )}
              >
                {actionText}
              </button>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                    "bg-gray-200 hover:bg-gray-300 text-gray-900",
                    "dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100",
                  )}
                >
                  Tutup
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Account Registration Helper Component
 * Guides users through the registration process
 */
interface RegistrationHelperProps {
  showFor?: "first-time-user" | "account-deleted" | "wrong-credentials";
  onActionClick?: () => void;
  className?: string;
}

export const RegistrationHelper: React.FC<RegistrationHelperProps> = ({
  showFor = "first-time-user",
  onActionClick,
  className,
}) => {
  const navigate = useNavigate();

  const helpers = {
    "first-time-user": {
      icon: UserPlus,
      title: "Pertama Kali Menggunakan?",
      message: "Selamat datang! Silakan daftar untuk membuat akun baru.",
      steps: [
        "Masukkan email atau NIM Anda",
        "Buat password yang kuat",
        "Lengkapi informasi profil",
        "Verifikasi email Anda",
      ],
      buttonText: "Mulai Daftar",
      buttonAction: () => navigate("/daftar"),
    },
    "account-deleted": {
      icon: AlertTriangle,
      title: "Akun Anda Telah Dihapus",
      message:
        "Akun Anda tidak lagi aktif, tetapi Anda dapat membuat yang baru.",
      steps: [
        'Klik tombol "Buat Akun Baru" di bawah',
        "Daftar dengan email baru atau yang sama",
        "Verifikasi akun Anda",
        "Mulai menggunakan aplikasi",
      ],
      buttonText: "Buat Akun Baru",
      buttonAction: () => navigate("/daftar"),
    },
    "wrong-credentials": {
      icon: AlertCircle,
      title: "Kredensial Tidak Cocok",
      message: "Email/NIM atau password yang Anda masukkan tidak benar.",
      steps: [
        "Periksa kembali email atau NIM Anda",
        "Pastikan password ditulis dengan benar (perhatian pada huruf besar/kecil)",
        'Jika lupa password, gunakan "Lupa Password?"',
        "Hubungi dukungan jika masalah berlanjut",
      ],
      buttonText: "Coba Lagi",
      buttonAction: () => {
        onActionClick?.();
      },
    },
  };

  const helper = helpers[showFor];
  const Icon = helper.icon;

  return (
    <div
      className={cn(
        "bg-white dark:bg-[#27273A] rounded-lg border border-slate-200 dark:border-[#3F3F5A]/30 p-6 md:p-8",
        className,
      )}
    >
      <div className="flex gap-4 mb-6">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">
            {helper.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-[#B4B4C8] mt-1">
            {helper.message}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-[#F5F5F5] mb-3">
          Langkah-langkah:
        </h4>
        <ul className="space-y-2">
          {helper.steps.map((step, index) => (
            <li
              key={index}
              className="flex items-start gap-3 text-sm text-slate-600 dark:text-[#B4B4C8]"
            >
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={helper.buttonAction}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
      >
        {helper.buttonText}
      </button>
    </div>
  );
};

/**
 * Support Contact Component
 * Display contact information for getting help
 */
export const SupportContact: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-slate-50 dark:bg-[#32324A] rounded-lg border border-slate-200 dark:border-[#3F3F5A]/50 p-4 md:p-6",
        className,
      )}
    >
      <div className="flex gap-3 mb-4">
        <HelpCircle className="w-5 h-5 text-slate-600 dark:text-[#B4B4C8] flex-shrink-0 mt-0.5" />
        <h3 className="font-semibold text-slate-900 dark:text-[#F5F5F5]">
          Butuh Bantuan?
        </h3>
      </div>
      <p className="text-sm text-slate-600 dark:text-[#B4B4C8] mb-4">
        Tim dukungan kami siap membantu Anda. Hubungi kami melalui salah satu
        saluran berikut:
      </p>
      <div className="space-y-2 text-sm">
        <p className="text-slate-700 dark:text-[#B4B4C8]">
          📧 Email: <span className="font-medium">support@kampus.ac.id</span>
        </p>
        <p className="text-slate-700 dark:text-[#B4B4C8]">
          💬 WhatsApp: <span className="font-medium">+62 812-3456-7890</span>
        </p>
        <p className="text-slate-700 dark:text-[#B4B4C8]">
          🕐 Jam Operasional: Senin - Jumat, 08:00 - 17:00 WIB
        </p>
      </div>
    </div>
  );
};
