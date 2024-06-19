import React, { useState } from 'react';

function TableDisplay({ data, sqlQuery, userQuestion, isLoading }) {
  const [showQuery, setShowQuery] = useState(false);

  // Define columns to exclude
  const excludedColumns = ['Counting'];

  // Define column name replacements
  const columnReplacements = { 
    'geocode': 'Geography Code',
    'geoname': 'Geography Name'
  };

  if (!data || data.length === 0) {
    return null;
  }

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

  // Function to render table headers
  const renderTableHeader = () => {
    if (data.length > 0) {
      return Object.keys(data[0])
        .filter(key => !excludedColumns.includes(key))
        .map((key, index) => {
          const displayName = columnReplacements[key] || key;
          const splitName = splitColumnName(displayName);
          return <th key={index}>{splitName}</th>;
        });
    }
  };

  // Function to render table rows
  const renderTableRows = () => {
    return data.map((row, index) => {
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

export default TableDisplay;