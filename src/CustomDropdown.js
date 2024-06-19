import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './index.css';

const CustomDropdown = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(e);
    setFilteredOptions(
      options.filter((option) =>
        option.name.toLowerCase().includes(newValue.toLowerCase()) ||
        option.code.toLowerCase().includes(newValue.toLowerCase())
      )
    );
  };

  const handleOptionClick = (option) => {
    setInputValue(option.name);
    onChange({ target: { name: 'selectedTable', value: option.code } });
    setIsOpen(false);
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="dropdown-input"
      />
      {isOpen && (
        <ul className="dropdown-options">
          {filteredOptions.map((option) => (
            <li
              key={option.code}
              onClick={() => handleOptionClick(option)}
              className="dropdown-option"
            >
              {option.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

CustomDropdown.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

CustomDropdown.defaultProps = {
  placeholder: 'Search Datasets',
};

export default CustomDropdown;