import { cn } from '@/lib/utils';

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function GlassButton({ 
  className, 
  variant = 'default',
  size = 'md',
  ...props 
}: GlassButtonProps) {
  const variants = {
    default: 'bg-white/10 hover:bg-white/20 text-gray-900',
    primary: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-900',
    secondary: 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-900',
    ghost: 'bg-transparent hover:bg-white/10 text-gray-900',
  };

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(
        "backdrop-blur-md border border-white/20 rounded-lg font-medium transition-all",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}