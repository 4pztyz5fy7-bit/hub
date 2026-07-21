import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      duration={3500}
      closeButton
      offset={12}
      mobileOffset={12}
      style={{
        // Ограничиваем ширину, чтобы уведомления не уходили за экран
        // и оставались доступными для закрытия
        ["--width" as any]: "min(360px, calc(100vw - 24px))",
        ["--mobile-width" as any]: "calc(100vw - 24px)",
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:text-xs group-[.toaster]:p-3 group-[.toaster]:gap-2 group-[.toaster]:rounded-lg",
          title: "group-[.toast]:text-xs group-[.toast]:font-semibold",
          description: "group-[.toast]:text-[11px] group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:text-[11px] group-[.toast]:h-7 group-[.toast]:px-2",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:text-[11px] group-[.toast]:h-7 group-[.toast]:px-2",
          closeButton: "group-[.toast]:bg-background group-[.toast]:border-border group-[.toast]:text-foreground",
        },
      }}
      {...props}
    />
  );
};


export { Toaster };
