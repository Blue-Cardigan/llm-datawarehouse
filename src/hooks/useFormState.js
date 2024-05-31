import { useState } from 'react';

const useFormState = (initialState) => {
  const [formData, setFormData] = useState(initialState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGeographyClick = (type, item) => {
    setFormData((prevFormData) => {
      const newGeographies = { ...prevFormData.geographies };
      const hierarchy = ['country', 'region', 'utla', 'ltla', 'msoa', 'lsoa', 'oa'];
      const typeIndex = hierarchy.indexOf(type.toLowerCase());

      if (newGeographies[type.toLowerCase()].includes(item)) {
        newGeographies[type.toLowerCase()] = newGeographies[type.toLowerCase()].filter((i) => i !== item);
        for (let i = typeIndex + 1; i < hierarchy.length; i++) {
          newGeographies[hierarchy[i]] = [];
        }
      } else {
        newGeographies[type.toLowerCase()] = [...newGeographies[type.toLowerCase()], item];
      }

      return { ...prevFormData, geographies: newGeographies };
    });
  };

  const handleSelectAllClick = (type, items = []) => {
    setFormData((prevFormData) => {
      const newGeographies = { ...prevFormData.geographies };
      const hierarchy = ['country', 'region', 'utla', 'ltla', 'msoa', 'lsoa', 'oa'];
      const typeIndex = hierarchy.indexOf(type.toLowerCase());

      newGeographies[type.toLowerCase()] = newGeographies[type.toLowerCase()].length === items.length ? [] : items;

      if (newGeographies[type.toLowerCase()].length === 0) {
        for (let i = typeIndex + 1; i < hierarchy.length; i++) {
          newGeographies[hierarchy[i]] = [];
        }
      }

      return { ...prevFormData, geographies: newGeographies };
    });
  };

  return {
    formData,
    handleChange,
    handleGeographyClick,
    handleSelectAllClick
  };
};

export default useFormState;