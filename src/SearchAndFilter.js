import React, { useState, useEffect } from 'react';
import tableDetails from './table_details.json';
import TableDisplay from './TableDisplay';
import useFetchData from './hooks/useFetchData';
import useFormState from './hooks/useFormState';
import GeographySelector from './GeographySelector';
import './index.css'; 

const SearchAndFilter = () => {
  const initialState = {
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
  };

  const { formData, handleChange, handleGeographyClick, handleSelectAllClick } = useFormState(initialState);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [selectedLTLAData, setSelectedLTLAData] = useState({});
  const [queryResult, setQueryResult] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { data: columnNames, isLoading: isLoadingColumns } = useFetchData(
    formData.selectedTable ? `${process.env.REACT_APP_API_URL}/columnNames?table=${formData.selectedTable}` : null,
    [formData.selectedTable]
  );

  useEffect(() => {
    if (columnNames && columnNames.length > 0) {
      setSelectedColumns(columnNames);
    }
  }, [columnNames]);

  const { data: largeRegions, isLoading: isLoadingRegions } = useFetchData(
    `${process.env.REACT_APP_API_URL}/largeRegions`,
    []
  );

  useEffect(() => {
    if (formData.geographies.ltla.length > 0) {
      formData.geographies.ltla.forEach(ltla => fetchSOAs(ltla));
    }
  }, [formData.geographies.ltla]);

  const fetchSOAs = async (ltla) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/subregions?ltla=${ltla}`);
      const data = await response.json();
      setSelectedLTLAData((prev) => ({ ...prev, [ltla]: data }));
    } catch (error) {
      console.error('Error fetching geography options for ltla:', ltla, error);
      setSelectedLTLAData((prev) => ({ ...prev, [ltla]: {} }));
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
      columnNames && prevColumns.length === columnNames.length ? [] : columnNames
    );
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
      const response = await fetch(`${process.env.REACT_APP_API_URL}/paramQuery`, {
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

  return (
    <div className="search-and-filter">
      <form onSubmit={handleSubmit}>
        <div className="frame">
          <div className="left-column">
            <div className="section-header">
              <h3>Select the Data</h3>
            </div>
            <button type="button" className="select-all-btn button" onClick={handleSelectAllColumns}>
              {columnNames && selectedColumns.length === columnNames.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="right-column">
            <div className="section-content">
              <div className="table-select">
                <label>
                  <input
                    list="table-options"
                    type="text"
                    name="selectedTable"
                    value={formData.selectedTable}
                    onChange={handleChange}
                    placeholder="Search Datasets"
                    className="table-input"
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
              <div className="column-select">
                {columnNames && columnNames.length > 0 && (
                  <div>
                    <label>Columns:</label>
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
          </div>
        </div>
        {formData.selectedTable && (
          <>
            <hr />
            <div className="frame">
              <div className="left-column">
                <div className="section-header">
                  <h3>Filter by Geography</h3>
                </div>
                <button type="button" className="select-all-btn button" onClick={() => handleSelectAllClick('country', largeRegions ? Object.keys(largeRegions) : [])}>
                  {formData.geographies.country.length === (largeRegions ? Object.keys(largeRegions).length : 0) ? 'Deselect All' : 'Select All'}
                </button>
                </div>
              <div className="right-column">
                <div className="section-content">
                  <GeographySelector
                    type="Country"
                    items={largeRegions ? Object.keys(largeRegions) : []}
                    selectedItems={formData.geographies.country}
                    handleClick={handleGeographyClick}
                  />
                </div>
              </div>
            </div>
            {formData.geographies.country.length > 0 && (
              <div className="frame">
                <div className="left-column">
                  <button type="button" className="select-all-btn button" onClick={() => handleSelectAllClick('region', formData.geographies.country.flatMap((country) => Object.keys(largeRegions[country] || {})))}>
                    {formData.geographies.region.length === formData.geographies.country.flatMap((country) => Object.keys(largeRegions[country] || {})).length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="right-column">
                  <div className="section-content">
                    <GeographySelector
                      type="Region"
                      items={formData.geographies.country.flatMap((country) => Object.keys(largeRegions[country] || {}))}
                      selectedItems={formData.geographies.region}
                      handleClick={handleGeographyClick}
                    />
                  </div>
                </div>
              </div>
            )}
            {formData.geographies.region.length > 0 && (
              <div className="frame">
                <div className="left-column">
                  <button type="button" className="select-all-btn button" onClick={() => handleSelectAllClick('utla', formData.geographies.region.flatMap((region) => formData.geographies.country.flatMap((country) => Object.keys(largeRegions[country]?.[region] || {}))))}>
                    {formData.geographies.utla.length === formData.geographies.region.flatMap((region) => formData.geographies.country.flatMap((country) => Object.keys(largeRegions[country]?.[region] || {}))).length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="right-column">
                  <div className="section-content">
                    <GeographySelector
                      type="UTLA"
                      items={formData.geographies.region.flatMap((region) =>
                        formData.geographies.country.flatMap((country) => Object.keys(largeRegions[country]?.[region] || {}))
                      )}
                      selectedItems={formData.geographies.utla}
                      handleClick={handleGeographyClick}
                    />
                  </div>
                </div>
              </div>
            )}
            {formData.geographies.utla.length > 0 && (
              <div className="frame">
                <div className="left-column">
                  <button type="button" className="select-all-btn button" onClick={() => handleSelectAllClick('ltla', formData.geographies.utla.flatMap((utla) => formData.geographies.region.flatMap((region) => formData.geographies.country.flatMap((country) => largeRegions[country]?.[region]?.[utla] || []))))}>
                    {formData.geographies.ltla.length === formData.geographies.utla.flatMap((utla) => formData.geographies.region.flatMap((region) => formData.geographies.country.flatMap((country) => largeRegions[country]?.[region]?.[utla] || []))).length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="right-column">
                  <div className="section-content">
                    <GeographySelector
                      type="LTLA"
                      items={formData.geographies.utla.flatMap((utla) =>
                        formData.geographies.region.flatMap((region) =>
                          formData.geographies.country.flatMap((country) => largeRegions[country]?.[region]?.[utla] || [])
                        )
                      )}
                      selectedItems={formData.geographies.ltla}
                      handleClick={handleGeographyClick}
                    />
                  </div>
                </div>
              </div>
            )}
            {formData.geographies.ltla.length > 0 && (
              <div className="frame">
                <div className="left-column">
                  <button type="button" className="select-all-btn button" onClick={() => handleSelectAllClick('msoa', formData.geographies.ltla.flatMap((ltla) => Object.keys(selectedLTLAData[ltla] || {})))}>
                    {formData.geographies.msoa.length === formData.geographies.ltla.flatMap((ltla) => Object.keys(selectedLTLAData[ltla] || {})).length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="right-column">
                  <div className="section-content">
                    <GeographySelector
                      type="MSOA"
                      items={formData.geographies.ltla.flatMap((ltla) => Object.keys(selectedLTLAData[ltla] || {}))}
                      selectedItems={formData.geographies.msoa}
                      handleClick={handleGeographyClick}
                    />
                  </div>
                </div>
              </div>
            )}
            {formData.geographies.msoa.length > 0 && (
              <div className="frame">
                <div className="left-column">
                  <button type="button" className="select-all-btn button" onClick={() => handleSelectAllClick('lsoa', formData.geographies.msoa.flatMap((msoa) => formData.geographies.ltla.flatMap((ltla) => Object.entries(selectedLTLAData[ltla]?.[msoa] || {}).flatMap(([lsoa]) => lsoa))))}>
                    {formData.geographies.lsoa.length === formData.geographies.msoa.flatMap((msoa) => formData.geographies.ltla.flatMap((ltla) => Object.entries(selectedLTLAData[ltla]?.[msoa] || {}).flatMap(([lsoa]) => lsoa))).length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="right-column">
                    <div className="section-content">
                      <GeographySelector
                        type="LSOA"
                        items={formData.geographies.msoa.flatMap((msoa) =>
                          formData.geographies.ltla.flatMap((ltla) =>
                            Object.entries(selectedLTLAData[ltla]?.[msoa] || {}).flatMap(([lsoa]) => lsoa)
                          )
                        )}
                        selectedItems={formData.geographies.lsoa}
                        handleClick={handleGeographyClick}
                      />
                    </div>
                  </div>
                </div>
              )}
              {formData.geographies.lsoa.length > 0 && (
                <div className="frame">
                  <div className="left-column">
                    <button type="button" className="select-all-btn button" onClick={() => handleSelectAllClick('oa', formData.geographies.msoa.flatMap((msoa) => formData.geographies.ltla.flatMap((ltla) => formData.geographies.lsoa.flatMap((lsoa) => Object.entries(selectedLTLAData[ltla]?.[msoa]?.[lsoa] || {}).map(([oa]) => oa)))))}>
                      {formData.geographies.oa.length === formData.geographies.msoa.flatMap((msoa) => formData.geographies.ltla.flatMap((ltla) => formData.geographies.lsoa.flatMap((lsoa) => Object.entries(selectedLTLAData[ltla]?.[msoa]?.[lsoa] || {}).map(([oa]) => oa))).length ? 'Deselect All' : 'Select All')}
                    </button>
                  </div>
                  <div className="right-column">
                    <div className="section-content">
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
                    />
                  </div>  
                </div>
              </div>
              )}
          </>
        )}
        <hr />
        <div className="frame">
          <div className="section-header">
            <h3>Load Data</h3>
          </div>
          <div className="section-content">
            <button type="submit">Submit Query</button>
            <TableDisplay 
                data={queryResult.data} 
                query={queryResult.query}
                isLoading={isLoading} 
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchAndFilter;