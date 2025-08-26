import { cn } from '@/lib/utils';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'dark' | 'light';
}

export function GlassPanel({ 
  className, 
  variant = 'default',
  ...props 
}: GlassPanelProps) {
  const variants = {
    default: 'bg-white/10 backdrop-blur-md border-white/20',
    dark: 'bg-black/20 backdrop-blur-md border-black/20',
    light: 'bg-white/30 backdrop-blur-sm border-white/40',
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-6",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}