import React, { useState, useEffect } from 'react';
import tableDetails from './table_details.json';
import TableDisplay from './TableDisplay';
import './index.css'; 

const SearchAndFilter = () => {
  const [formData, setFormData] = useState({
    date: '2021',
    selectedTable: '',
    geographies: {
      country: [],
      region: [],
      utla: [],
      ltla: [],
      msoa: [],
      lsoa: [],
      oa: []
    }
  });

  const [columnNames, setColumnNames] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [largeRegions, setLargeRegions] = useState({});
  const [selectedLTLAData, setSelectedLTLAData] = useState({});
  const [queryResult, setQueryResult] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCtryRgnLA();
  }, []);

  useEffect(() => {
    if (formData.geographies.ltla.length > 0) {
      formData.geographies.ltla.forEach(ltla => fetchSOAs(ltla));
    }
  }, [formData.geographies.ltla]);

  useEffect(() => {
    if (formData.selectedTable && formData.selectedTable.length > 0) {
      fetchColumnNames(formData.selectedTable);
    }
  }, [formData.selectedTable]);

  const fetchColumnNames = async (table) => {
    try {
      const response = await fetch(`http://localhost:5000/columnNames?table=${table}`);
      const data = await response.json();
      setColumnNames(data);
    } catch (error) {
      console.error('Failed to load column names:', error);
    }
  };

  const handleColumnSelection = (columnName) => {
    setSelectedColumns((prevColumns) =>
      prevColumns.includes(columnName)
        ? prevColumns.filter((col) => col !== columnName)
        : [...prevColumns, columnName]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns((prevColumns) =>
      prevColumns.length === columnNames.length ? [] : columnNames
    );
  };

  const fetchCtryRgnLA = async () => {
    try {
      const response = await fetch('http://localhost:5000/LargeRegions');
      const data = await response.json();
      setLargeRegions(data);
    } catch (error) {
      console.error('Failed to load geography mapping:', error);
    }
  };

  const fetchSOAs = async (ltla) => {
    try {
      const response = await fetch(`http://localhost:5000/subregions?ltla=${ltla}`);
      const data = await response.json();
      setSelectedLTLAData((prev) => ({ ...prev, [ltla]: data }));
    } catch (error) {
      console.error('Error fetching geography options for ltla:', ltla, error);
      setSelectedLTLAData((prev) => ({ ...prev, [ltla]: {} }));
    }
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

  const handleSelectAllClick = (type, items) => {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let geography = {};
    const { geographies } = formData;

    const hierarchy = ['oa', 'lsoa', 'msoa', 'ltla', 'utla', 'region', 'country'];
    for (const level of hierarchy) {
      if (geographies[level].length > 0) {
        geography = { type: level, value: geographies[level].join(',') };
        break;
      }
    }

    try {
      const response = await fetch(`http://localhost:5000/paramQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedTable: formData.selectedTable,
          geography: geography,
          columns: selectedColumns.map((column) => column.replace(/ /g, '_'))
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      setQueryResult({ data: result.data, query: result.query });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const GeographySelector = ({ type, items, selectedItems, handleClick, handleSelectAll }) => (
    <div>
      <h2>{type}</h2>
      <button type="button" className="select-all-btn button" onClick={() => handleSelectAll(type, items)}>
        {selectedItems.length === items.length ? 'Deselect All' : 'Select All'}
      </button>
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

  return (
    <div>
      <h2>Search and Filter</h2>
      <form onSubmit={handleSubmit}>
        <div className="frame">
          <h3>First, select the data you need:</h3>
          <div className="table-select">
            <div>
              <label>
                <input
                  list="table-options"
                  name="selectedTable"
                  value={formData.selectedTable}
                  onChange={handleChange}
                  placeholder="Find a Dataset"
                />
                <datalist id="table-options">
                  {Object.entries(tableDetails)
                    .sort((a, b) => a[1].name.localeCompare(b[1].name))
                    .map(([code, details]) => (
                      <option key={code} value={code}>
                        {details.name}
                      </option>
                    ))}
                </datalist>
              </label>
            </div>
            <div>
              <label>
                <select
                  className="dropdown year-select"
                  type="number"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                >
                  <option value="2016">2001</option>
                  <option value="2011">2011</option>
                  <option value="2021">2021</option>
                </select>
              </label>
            </div>
          </div>
          <div className="column-select">
            {columnNames.length > 0 && (
              <div>
                <label>Columns:</label>
                <button type="button" className="select-all-btn button" onClick={handleSelectAllColumns}>
                  {selectedColumns.length === columnNames.length ? 'Deselect All' : 'Select All'}
                </button>
                {columnNames
                  .filter((columnName) => {
                    const excludeColumns = ['date', 'geography', 'geography code', 'id'];
                    return !excludeColumns.includes(columnName.trim().toLowerCase());
                  })
                  .map((columnName) => {
                    const tableDetailsName = tableDetails[formData.selectedTable]?.name || '';
                    const cleanColumnName = columnName.replace(new RegExp(`^${tableDetailsName}:?`, 'i'), '').trim();
                    return (
                      <button
                        className={selectedColumns.includes(columnName) ? 'selected' : ''}
                        type="button"
                        key={columnName}
                        onClick={() => handleColumnSelection(columnName)}
                      >
                        {cleanColumnName}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
        <div className="frame">
          <h3>Second, select the areas you need:</h3>
          <GeographySelector
            type="Country"
            items={Object.keys(largeRegions)}
            selectedItems={formData.geographies.country}
            handleClick={handleGeographyClick}
            handleSelectAll={handleSelectAllClick}
          />
          {formData.geographies.country.length > 0 && (
            <GeographySelector
              type="Region"
              items={formData.geographies.country.flatMap((country) => Object.keys(largeRegions[country] || {}))}
              selectedItems={formData.geographies.region}
              handleClick={handleGeographyClick}
              handleSelectAll={handleSelectAllClick}
            />
          )}
          {formData.geographies.region.length > 0 && (
            <GeographySelector
              type="UTLA"
              items={formData.geographies.region.flatMap((region) =>
                formData.geographies.country.flatMap((country) => Object.keys(largeRegions[country]?.[region] || {}))
              )}
              selectedItems={formData.geographies.utla}
              handleClick={handleGeographyClick}
              handleSelectAll={handleSelectAllClick}
            />
          )}
          {formData.geographies.utla.length > 0 && (
            <GeographySelector
              type="LTLA"
              items={formData.geographies.utla.flatMap((utla) =>
                formData.geographies.region.flatMap((region) =>
                  formData.geographies.country.flatMap((country) => largeRegions[country]?.[region]?.[utla] || [])
                )
              )}
              selectedItems={formData.geographies.ltla}
              handleClick={handleGeographyClick}
              handleSelectAll={handleSelectAllClick}
            />
          )}
          {formData.geographies.ltla.length > 0 && (
            <GeographySelector
              type="MSOA"
              items={formData.geographies.ltla.flatMap((ltla) => Object.keys(selectedLTLAData[ltla] || {}))}
              selectedItems={formData.geographies.msoa}
              handleClick={handleGeographyClick}
              handleSelectAll={handleSelectAllClick}
            />
          )}
          {formData.geographies.msoa.length > 0 && (
            <GeographySelector
              type="LSOA"
              items={formData.geographies.msoa.flatMap((msoa) =>
                formData.geographies.ltla.flatMap((ltla) =>
                  Object.entries(selectedLTLAData[ltla]?.[msoa] || {}).flatMap(([lsoa]) => lsoa)
                )
              )}
              selectedItems={formData.geographies.lsoa}
              handleClick={handleGeographyClick}
              handleSelectAll={handleSelectAllClick}
            />
          )}
          {formData.geographies.lsoa.length > 0 && (
            <GeographySelector
              type="OA"
              items={formData.geographies.msoa.flatMap((msoa) =>
                formData.geographies.ltla.flatMap((ltla) =>
                  formData.geographies.lsoa.flatMap((lsoa) =>
                    Object.entries(selectedLTLAData[ltla]?.[msoa]?.[lsoa] || {}).map(([oa]) => oa)
                  )
                )
              )}
              selectedItems={formData.geographies.oa}
              handleClick={handleGeographyClick}
              handleSelectAll={handleSelectAllClick}
            />
          )}
        </div>
        <div className="frame">
            <h3>Third, see and download the data:</h3>
            <button type="submit">Submit Query</button>
            <TableDisplay 
                data={queryResult.data} 
                query={queryResult.query}
                isLoading={isLoading} 
            />
        </div>
      </form>
    </div>
  );
};

export default SearchAndFilter;
