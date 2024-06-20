import React, { useState, useMemo } from 'react';

function ElectionsDisplay({ data, sqlQuery, userQuestion, isLoading }) {
  const [showQuery, setShowQuery] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Define columns to exclude
  const excludedColumns = ['Counting'];

  // Define column name replacements
  const columnReplacements = { 
    'geocode': 'Geography Code',
    'geoname': 'Geography Name'
  };

  // Function to split long column names into multiple lines
  const splitColumnName = (name) => {
    const maxWordsPerLine = 5; // Maximum number of words per line
    const words = name.split(' ');
    let lines = [];
    let currentLine = [];

    words.forEach(word => {
      if (currentLine.length >= maxWordsPerLine) {
        lines.push(currentLine.join(' '));
        currentLine = [];
      }
      currentLine.push(word);
    });

    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '));
    }

    return lines.join('\n');
  };

  // Function to handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Function to render table headers
  const renderTableHeader = () => {
    if (data.length > 0) {
      return Object.keys(data[0])
        .filter(key => !excludedColumns.includes(key))
        .map((key, index) => {
          const displayName = columnReplacements[key] || key;
          const splitName = splitColumnName(displayName);
          const isSorted = sortConfig.key === key;
          const sortIndicator = isSorted ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '';
          return (
            <th key={index} onClick={() => handleSort(key)}>
              {splitName} {sortIndicator}
            </th>
          );
        });
    }
  };

  // Function to sort data
  const sortedData = useMemo(() => {
    if (sortConfig.key) {
      return [...data].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return data;
  }, [data, sortConfig]);

  // Function to render table rows
  const renderTableRows = () => {
    return sortedData.map((row, index) => {
      return (
        <tr key={index}>
          {Object.entries(row)
            .filter(([key, _]) => !excludedColumns.includes(key))
            .map(([key, cell], idx) => {
              return <td key={idx}>{cell}</td>;
            })}
        </tr>
      );
    });
  };

  // Toggle the visibility of the SQL query
  const toggleQueryVisibility = () => {
    setShowQuery(!showQuery);
  };

  // Function to convert data to CSV and trigger download
  const downloadCSV = () => {
    const csvRows = [];
    const headers = Object.keys(data[0])
      .filter(key => !excludedColumns.includes(key))
      .map(key => columnReplacements[key] || key);
    csvRows.push(headers.join(',')); // Add header row

    for (const row of data) {
      const values = headers.map(header => {
        const originalKey = Object.keys(columnReplacements).find(key => columnReplacements[key] === header) || header;
        const escaped = ('' + row[originalKey]).replace(/"/g, '\\"'); // Escape double quotes
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'download.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return (
    <div>
      <h2>Results</h2>
      <div className="user-query-display">
        {userQuestion}
      </div>
      {data && data.length > 0 && (
        <>
          <button onClick={toggleQueryVisibility}>
            {showQuery ? 'Hide SQL Query' : 'Show SQL Query'}
          </button>
          <button onClick={downloadCSV}>
            Download CSV
          </button>
        </> 
      )}
      {showQuery && (
        <div className="query-display">
          <pre>{sqlQuery}</pre>
        </div>
      )}
      <div className="table-container">
        {isLoading ? (
          <div className="loader"></div>
        ) : (
          <table>
            <thead>
              <tr>
                {renderTableHeader()}
              </tr>
            </thead>
            <tbody>
              {renderTableRows()}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ElectionsDisplay;