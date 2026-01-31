"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  required?: boolean;
  id?: string;
  name?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  icon,
  className,
  required,
  id,
  name,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden native select for form submission */}
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="sr-only"
        tabIndex={-1}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Custom styled button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border-2 border-input bg-background px-3 py-2 text-sm transition-all",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          "hover:border-primary/50",
          icon && "pl-10",
          className
        )}
      >
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <span className={cn("truncate text-left flex-1", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform ml-2 flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Custom dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border-2 border-border bg-background shadow-lg overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  style={{
                    transition: "all 0.15s ease-in-out",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "hsl(var(--primary))";
                      e.currentTarget.style.color = "hsl(var(--primary-foreground))";
                      const icon = e.currentTarget.querySelector('.check-icon');
                      if (icon) {
                        (icon as HTMLElement).style.color = "hsl(var(--primary-foreground))";
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "";
                      const icon = e.currentTarget.querySelector('.check-icon');
                      if (icon) {
                        (icon as HTMLElement).style.color = "";
                      }
                    }
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-2.5 text-sm text-left cursor-pointer",
                    isSelected && "bg-primary/20 font-medium"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0 check-icon" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
