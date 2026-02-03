"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (address: AddressParts) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
};

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Street address",
  id = "street",
  disabled = false,
  className,
  required = false,
}: AddressAutocompleteProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <Input
      id={id}
      type="text"
      value={localValue}
      onChange={(e) => {
        const v = e.target.value;
        setLocalValue(v);
        onChange(v);
      }}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v) onPlaceSelect({ street: v, city: "", state: "", zip: "" });
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(className)}
      required={required}
      autoComplete="street-address"
      aria-label={placeholder}
    />
  );
}
