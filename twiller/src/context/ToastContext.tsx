"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

const TOAST_STYLES = {
  success: {
    border: "border-emerald-500/40",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    icon: CheckCircle2,
  },
  error: {
    border: "border-red-500/40",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    icon: XCircle,
  },
  info: {
    border: "border-blue-500/40",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    icon: Info,
  },
} as const;

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  const style = TOAST_STYLES[toast.type];
  const Icon = style.icon;
  return (
    <div
      role="status"
      className={`toast-enter flex items-start gap-3 rounded-xl border ${style.border} bg-gray-900/95 backdrop-blur-md px-4 py-3 shadow-lg shadow-black/40`}
    >
      <div
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.iconBg} ${style.iconColor}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="flex-1 text-sm leading-snug text-white">{toast.message}</p>
      <button
        onClick={onClose}
        className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = {
    toast,
    success: (message: string) => toast(message, "success"),
    error: (message: string) => toast(message, "error"),
    info: (message: string) => toast(message, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onClose={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
