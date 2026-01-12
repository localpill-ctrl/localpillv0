'use client';

import { useState, InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, label, error, onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow digits
      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
      onChange?.(digits);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="flex">
          <span className="inline-flex items-center px-4 py-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-500 font-medium">
            +91
          </span>
          <input
            ref={ref}
            type="tel"
            inputMode="numeric"
            value={value}
            onChange={handleChange}
            className={cn(
              'flex-1 px-4 py-3 border rounded-r-xl text-base',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'placeholder:text-gray-400',
              error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200',
              className
            )}
            placeholder="Enter 10-digit number"
            maxLength={10}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
