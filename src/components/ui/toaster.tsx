import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {/* ARIA-Live Region for Screen Readers */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        role="status"
      >
        {toasts.map(({ id, title, description }) => (
          <div key={id}>
            {title && `${title}. `}
            {description}
          </div>
        ))}
      </div>
      
      {/* Visual Toasts */}
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isError = props.variant === 'destructive';
        return (
          <Toast key={id} {...props} role={isError ? 'alert' : 'status'}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
