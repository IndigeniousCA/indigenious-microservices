'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface ImpactCounterProps {
  value: number;
  duration?: number;
  format?: 'number' | 'compact' | 'currency';
  prefix?: string;
  suffix?: string;
  className?: string;
  onComplete?: () => void;
}

export default function ImpactCounter({
  value,
  duration = 2,
  format = 'number',
  prefix = '',
  suffix = '',
  className = '',
  onComplete,
}: ImpactCounterProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const spring = useSpring(0, { duration: duration * 1000 });
  const display = useTransform(spring, (current) => {
    const rounded = Math.round(current);
    return formatNumber(rounded, format);
  });

  useEffect(() => {
    if (!hasAnimated) {
      spring.set(value);
      setHasAnimated(true);
      
      if (onComplete) {
        const timeout = setTimeout(onComplete, duration * 1000);
        return () => clearTimeout(timeout);
      }
    }
  }, [value, spring, hasAnimated, onComplete, duration]);

  // Update value if it changes after initial animation
  useEffect(() => {
    if (hasAnimated) {
      spring.set(value);
    }
  }, [value, spring, hasAnimated]);

  function formatNumber(num: number, formatType: string): string {
    switch (formatType) {
      case 'compact':
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toString();
      
      case 'currency':
        return new Intl.NumberFormat('en-CA', {
          style: 'currency',
          currency: 'CAD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(num);
      
      default:
        return num.toLocaleString();
    }
  }

  return (
    <motion.span className={className}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  );
}