import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type AlertType = "success" | "warning" | "error" | "info";

interface AlertProps {
  type: AlertType;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const config: Record<AlertType, { icon: typeof CheckCircle2; classes: string }> = {
  success: { icon: CheckCircle2, classes: "bg-success/10 text-success border-success/20" },
  warning: { icon: AlertTriangle, classes: "bg-warning/10 text-warning border-warning/20" },
  error: { icon: XCircle, classes: "bg-danger/10 text-danger border-danger/20" },
  info: { icon: Info, classes: "bg-primary/10 text-primary border-primary/20" },
};

export function Alert({ type, message, onDismiss, className }: AlertProps) {
  const { icon: Icon, classes } = config[type];
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
        classes,
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-ink">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-neutral hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
