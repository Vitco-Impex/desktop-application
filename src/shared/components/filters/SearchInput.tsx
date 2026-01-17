/**
 * SearchInput Component - Search input with debounce
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '../ui/Input';
import './SearchInput.css';

export interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value: controlledValue,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className = '',
}) => {
  const [localValue, setLocalValue] = useState(controlledValue || '');

  useEffect(() => {
    setLocalValue(controlledValue || '');
  }, [controlledValue]);

  const debouncedOnChange = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (val: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onChange(val);
        }, debounceMs);
      };
    })(),
    [onChange, debounceMs]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  return (
    <Input
      type="search"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={`search-input ${className}`}
    />
  );
};
