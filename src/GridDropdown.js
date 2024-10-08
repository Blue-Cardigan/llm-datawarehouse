import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const GridDropdown = ({ id, value, onChange, options, placeholder, multiple }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Initialize with empty selection instead of all options
    onChange([]);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleOption = (option) => {
    let newSelectedValues;
    if (multiple) {
      newSelectedValues = selectedValues.includes(option.code)
        ? selectedValues.filter(v => v !== option.code)
        : [...selectedValues, option.code];
    } else {
      newSelectedValues = [option.code];
    }
    setSelectedValues(newSelectedValues);
    onChange(multiple ? newSelectedValues : newSelectedValues[0]);
    if (!multiple) setIsOpen(false);
  };

  const toggleAll = () => {
    const newSelectedValues = selectedValues.length === options.length ? [] : options.map(option => option.code);
    setSelectedValues(newSelectedValues);
    onChange(newSelectedValues);
  };

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid-dropdown" ref={dropdownRef}>
      <div className="grid-dropdown-header" onClick={() => setIsOpen(!isOpen)}>
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        />
      </div>
      {isOpen && (
        <div className="grid-dropdown-content">
          <div className="grid-dropdown-item toggle-all" onClick={toggleAll}>
            {selectedValues.length === options.length ? 'Deselect All' : 'Select All'}
          </div>
          {filteredOptions.map((option) => (
            <div
              key={option.code}
              className={`grid-dropdown-item ${selectedValues.includes(option.code) ? 'selected' : ''}`}
              onClick={() => toggleOption(option)}
            >
              {option.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GridDropdown;