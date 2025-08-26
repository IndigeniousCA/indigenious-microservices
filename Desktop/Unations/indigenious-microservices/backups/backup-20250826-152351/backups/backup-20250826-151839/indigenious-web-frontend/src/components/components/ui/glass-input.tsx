import { cn } from '@/lib/utils';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function GlassInput({ 
  className,
  label,
  ...props 
}: GlassInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent",
          "placeholder:text-gray-500",
          className
        )}
        {...props}
      />
    </div>
  );
}