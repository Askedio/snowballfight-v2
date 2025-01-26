import "./Dropdown.css";

import { useState, useRef, useEffect } from "react";

interface DropdownProps {
  options: { value: string; label: string; image?: string }[]; // Options with optional images
  selected: string; // Currently selected value
  onChange: (value: string) => void; // Callback for selection change
}

export function Dropdown({ options, selected, onChange }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => setIsOpen((prev) => !prev);

  const handleSelect = (value: string) => {
    onChange(value);
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((option) => option.value === selected);

  return (
    <div className="dropdown" ref={dropdownRef}>
      <button type="button" className="dropdown-toggle" onClick={handleToggle}>
        {selectedOption?.image && (
          <img
            src={selectedOption.image}
            alt={selectedOption.label}
            className="dropdown-image"
          />
        )}
        {selectedOption?.label}
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`dropdown-item ${
                option.value === selected ? "active" : ""
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {option.image && (
                <img
                  src={option.image}
                  alt={option.label}
                  className="dropdown-image"
                />
              )}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
