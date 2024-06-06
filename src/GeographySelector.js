import React from 'react';
import PropTypes from 'prop-types';

const GeographySelector = ({ type, items, selectedItems, handleClick, handleSelectAll }) => (
  <div>
    <h4>{type}</h4>
    {items.map((item) => (
      <button
        type="button"
        key={item}
        onClick={() => handleClick(type, item)}
        className={selectedItems.includes(item) ? 'selected' : ''}
      >
        {item}
      </button>
    ))}
  </div>
);

GeographySelector.propTypes = {
  type: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedItems: PropTypes.arrayOf(PropTypes.string).isRequired,
  handleClick: PropTypes.func.isRequired,
};

export default GeographySelector;