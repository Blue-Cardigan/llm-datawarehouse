import React, { useState, useEffect } from 'react';
import tableDetails from './table_details.json';
import TableDisplay from './TableDisplay';
import useFetchData from './hooks/useFetchData';
import useFormState from './hooks/useFormState';
import GeographySelector from './GeographySelector';
import CustomDropdown from './CustomDropdown';
import './index.css'; 

const SearchAndFilter = () => {
  const initialState = {
    selectedTable: '',
    geographies: {
      country: [],
      region: [],
      izn: [],
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
  const [selectedRegionData, setSelectedRegionData] = useState({});
  const [errorMessage, setErrorMessage] = useState(''); // State variable for error message

  const geographyHierarchy = {
    default: ['oa', 'lsoa', 'msoa', 'ltla', 'utla', 'region', 'country'],
    scotland: ['oa', 'izn', 'region', 'country'],
  };

  const { data: largeRegions, isLoading: isLoadingRegions } = useFetchData(
    `${process.env.REACT_APP_API_URL}/largeRegions`,
    []
  );

  const { data: columnNames, isLoading: isLoadingColumns } = useFetchData(
    formData.selectedTable ? `${process.env.REACT_APP_API_URL}/columnNames?table=${formData.selectedTable}` : null,
    [formData.selectedTable]
  );

  useEffect(() => {
    if (columnNames && columnNames.length > 0) {
      setSelectedColumns(columnNames);
    }
  }, [columnNames]);

  useEffect(() => {
    if (formData.geographies.ltla.length > 0) {
      formData.geographies.ltla.forEach(ltla => fetchSOAs(ltla));
    }
  }, [formData.geographies.ltla]);

  useEffect(() => {
    if (formData.geographies.country.includes('Scotland') && formData.geographies.region.length > 0) {
      formData.geographies.region.forEach(region => fetchOAsForScotland(region));
    } else if (formData.geographies.ltla.length > 0) {
      formData.geographies.ltla.forEach(ltla => fetchSOAs(ltla));
    }
  }, [formData.geographies.ltla, formData.geographies.region]);

  useEffect(() => {
    if (formData.geographies.country.includes('Scotland') && formData.geographies.region.length > 0) {
      formData.geographies.region.forEach(region => fetchIZNsForScotland(region));
    }
  }, [formData.geographies.region]);

  const getSelectedGeographyLevel = (geographies) => {
    const { country } = geographies;
    const hierarchy = country.includes('Scotland') ? geographyHierarchy.scotland : geographyHierarchy.default;

    for (const level of hierarchy) {
      if (geographies[level].length > 0) {
        return { type: level, value: geographies[level].join(',') };
      }
    }

    return {};
  };
  
  const fetchIZNsForScotland = async (region) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/subregions?region=${region}`);
      const data = await response.json();
      setSelectedRegionData((prev) => ({ ...prev, [region]: data }));
    } catch (error) {
      console.error('Error fetching IZNs for region:', region, error);
      setSelectedRegionData((prev) => ({ ...prev, [region]: {} }));
    }
  };

  const fetchOAsForScotland = async (region) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/subregions?region=${region}`);
      const data = await response.json();
      setSelectedLTLAData((prev) => ({ ...prev, [region]: data }));
    } catch (error) {
      console.error('Error fetching OAs for region:', region, error);
      setSelectedLTLAData((prev) => ({ ...prev, [region]: {} }));
    }
  };

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
    const { geographies } = formData;
  
    const selectedGeography = getSelectedGeographyLevel(geographies);
  
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/paramQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedTable: formData.selectedTable,
          geography: selectedGeography,
          columns: selectedColumns.map((column) => column.replace(/ /g, '_')),
          isScotland: geographies.country.includes('Scotland'),
        }),
      });
  
      if (!response.ok) {
        const errorResponse = await response.json();
        setErrorMessage(errorResponse.error || 'Network response was not ok');
        throw new Error(errorResponse.error || 'Network response was not ok');
      }
  
      const result = await response.json();
      setQueryResult({ data: result.data, query: result.query });
      setErrorMessage(''); // Clear any previous error message
    } catch (error) {
      console.error('Failed to fetch data:', error.message);
    }
  };

  const tableOptions = Object.entries(tableDetails).map(([code, details]) => ({
    code,
    name: details.name,
  }));

  const preprocessColumnNames = (columns) => {
    if (columns.length === 0) return columns;

    const excludeColumns = ['counting', 'geoname', 'geocode'];
    const filteredColumns = columns.filter(
      (col) => !excludeColumns.map(excludeCol => excludeCol.toLowerCase()).includes(col.trim().toLowerCase())
    );

    // Ensure 'Total' appears as the first column
    const totalIndex = filteredColumns.findIndex(col => col.toLowerCase() === 'total');
    if (totalIndex > -1) {
      const [totalColumn] = filteredColumns.splice(totalIndex, 1);
      filteredColumns.unshift(totalColumn);
    }

    return filteredColumns;
  };

  const processedColumnNames = preprocessColumnNames(columnNames || []);

  return (
    <div>
      <div className="search-and-filter">
        <form onSubmit={handleSubmit}>
          <div className="frame">
            <div className="left-column">
              <div className="section-header">
                <h3>Select a Table</h3>
              </div>
              {formData.selectedTable && (
                <button type="button" className="column-select-all-btn select-all-btn button" onClick={handleSelectAllColumns}>
                  {columnNames && selectedColumns.length === columnNames.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            <div className="right-column">
              <div className="section-content">
                <div className="table-select">
                  <label>
                    <CustomDropdown
                      options={tableOptions}
                      value={formData.selectedTable}
                      onChange={handleChange}
                      placeholder="Search Datasets"
                    />
                  </label>
                </div>
                <div className="column-select">
                  {processedColumnNames.length > 0 && (
                    <div>
                      <label><h4>Columns:</h4></label>
                      <div className="column-buttons">
                        {processedColumnNames
                          .filter((columnName) => {
                            const excludeColumns = ['counting', 'geoname', 'geocode'];
                            return !excludeColumns.map(excludeCol => excludeCol.toLowerCase()).includes(columnName.trim().toLowerCase());
                          })
                          .map((processedColumnName, index) => {
                            const originalColumnName = columnNames[index];
                            return (
                              <button
                                className={selectedColumns.includes(originalColumnName) ? 'selected' : ''}
                                type="button"
                                key={originalColumnName}
                                onClick={() => handleColumnSelection(originalColumnName)}
                              >
                                {processedColumnName}
                              </button>
                            );
                          })}
                      </div>
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
                <div className="section-header">
                  <h3>Filter by Geography</h3>
                </div>
              </div>
              <div className="frame">
                <div className="left-column">
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
                    <button type="button" className="select-all-btn button" onClick={() => handleSelectAllClick('region', formData.geographies.country.flatMap((country) => largeRegions[country] ? Object.keys(largeRegions[country]) : []))}>
                      {formData.geographies.region.length === formData.geographies.country.flatMap((country) => largeRegions[country] ? Object.keys(largeRegions[country]) : []).length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="right-column">
                    <div className="section-content">
                      <GeographySelector
                        type="Region"
                        items={formData.geographies.country.flatMap((country) => largeRegions[country] ? Object.keys(largeRegions[country]) : [])}
                        selectedItems={formData.geographies.region}
                        handleClick={handleGeographyClick}
                      />
                    </div>
                  </div>
                </div>
              )}
              {formData.geographies.region.length > 0 && !formData.geographies.country.includes('Scotland') && (
                <div className="frame">
                  <div className="left-column">
                    <button type="button" className="select-all-btn button" onClick={() => handleSelectAllClick('utla', formData.geographies.region.flatMap((region) => formData.geographies.country.flatMap((country) => largeRegions[country]?.[region] ? Object.keys(largeRegions[country][region]) : [])))}>
                      {formData.geographies.utla.length === formData.geographies.region.flatMap((region) => formData.geographies.country.flatMap((country) => largeRegions[country]?.[region] ? Object.keys(largeRegions[country][region]) : [])).length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="right-column">
                    <div className="section-content">
                      <GeographySelector
                        type="UTLA"
                        items={formData.geographies.region.flatMap((region) =>
                          formData.geographies.country.flatMap((country) => largeRegions[country]?.[region] ? Object.keys(largeRegions[country][region]) : [])
                        )}
                        selectedItems={formData.geographies.utla}
                        handleClick={handleGeographyClick}
                      />
                    </div>
                  </div>
                </div>
              )}
              {formData.geographies.region.length > 0 && formData.geographies.country.includes('Scotland') && (
              <div className="frame">
                                <div className="left-column">
                  <button type="button" className="select-all-btn button" onClick={() => handleSelectAllClick('izn', formData.geographies.region.flatMap((region) => Object.keys(selectedRegionData[region] || {})))}>
                    {formData.geographies.izn.length === formData.geographies.region.flatMap((region) => Object.keys(selectedRegionData[region] || {})).length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="right-column">
                  <div className="section-content">
                    <GeographySelector
                      type="IZN"
                      items={formData.geographies.region.flatMap((region) => Object.keys(selectedRegionData[region] || {}))}
                      selectedItems={formData.geographies.izn}
                      handleClick={handleGeographyClick}
                    />
                  </div>
                </div>
              </div>
              )}
              {formData.geographies.izn.length > 0 && (
                <div className="frame">
                  <div className="left-column">
                    <button type="button" className="select-all-btn button" onClick={() => handleSelectAllClick('oa', formData.geographies.izn.flatMap((izn) => formData.geographies.region.flatMap((region) => Object.values(selectedRegionData[region]?.[izn] || {}))))}>
                      {formData.geographies.oa.length === formData.geographies.izn.flatMap((izn) => formData.geographies.region.flatMap((region) => Object.values(selectedRegionData[region]?.[izn] || {}))).length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="right-column">
                    <div className="section-content">
                      <GeographySelector
                        type="OA"
                        items={formData.geographies.izn.flatMap((izn) =>
                          formData.geographies.region.flatMap((region) =>
                            Object.values(selectedRegionData[region]?.[izn] || {})
                          )
                        )}
                        selectedItems={formData.geographies.oa}
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
                    {formData.geographies.oa.length === formData.geographies.msoa.flatMap((msoa) => formData.geographies.ltla.flatMap((ltla) => formData.geographies.lsoa.flatMap((lsoa) => Object.entries(selectedLTLAData[ltla]?.[msoa]?.[lsoa] || {}).map(([oa]) => oa)))).length ? 'Deselect All' : 'Select All'}
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
              {errorMessage && <p className="error-message">{errorMessage}</p>}
            </div>
          </div>
        </form>
      </div>
      <div>
        <TableDisplay 
          data={queryResult.data} 
          sqlQuery={queryResult.query}
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
};

export default SearchAndFilter;