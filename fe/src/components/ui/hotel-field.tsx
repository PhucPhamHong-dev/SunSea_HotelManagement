'use client';

import { Input, Label, TextArea, TextField } from '@heroui/react';
import type { HTMLInputTypeAttribute } from 'react';

interface HotelFieldProps {
  label: string;
  value?: string | null;
  name?: string;
  type?: HTMLInputTypeAttribute;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  wide?: boolean;
  min?: string;
  step?: string;
  inputMode?: 'decimal' | 'email' | 'none' | 'numeric' | 'search' | 'tel' | 'text' | 'url';
  pattern?: string;
  autoComplete?: string;
  onValueChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Shared HeroUI field for SUNSEA hotel forms and stay details.
 * It only owns presentation and native field events; feature components keep
 * their API calls, validation flow and autosave behavior.
 */
export function HotelField({
  label,
  value,
  name,
  type = 'text',
  required = false,
  readOnly = false,
  disabled = false,
  multiline = false,
  rows = 2,
  wide = false,
  min,
  step,
  inputMode,
  pattern,
  autoComplete,
  onValueChange,
  onFocus,
  onBlur,
}: HotelFieldProps) {
  const fieldValue = readOnly ? value || '—' : value || '';
  const className = [
    'hotel-field',
    multiline ? 'hotel-field--textarea' : '',
    readOnly ? 'hotel-field--read-only' : '',
    wide ? 'hotel-field--wide' : '',
  ].filter(Boolean).join(' ');

  return (
    <TextField className={className} name={name}>
      <Label className="hotel-field__label">
        {label}{required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {multiline ? (
        <TextArea
          className="hotel-field__control"
          value={fieldValue}
          rows={rows}
          readOnly={readOnly}
          disabled={disabled}
          onFocus={onFocus}
          onChange={(event) => onValueChange?.(event.target.value)}
          onBlurCapture={onBlur}
        />
      ) : (
        <Input
          className="hotel-field__control"
          type={type}
          value={fieldValue}
          required={required}
          readOnly={readOnly}
          disabled={disabled}
          min={min}
          step={step}
          inputMode={inputMode}
          pattern={pattern}
          autoComplete={autoComplete}
          onFocus={onFocus}
          onChange={(event) => onValueChange?.(event.target.value)}
          onBlurCapture={onBlur}
        />
      )}
    </TextField>
  );
}
