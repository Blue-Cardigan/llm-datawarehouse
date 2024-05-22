import React, { useState, useEffect } from 'react';

function TableDisplay({ data, sqlQuery, userQuestion, isLoading }) {
  const [showQuery, setShowQuery] = useState(false);

  if (!data || data.length === 0) {
    return null;
  }

  // Function to render table headers
  const renderTableHeader = () => {
    if (data.length > 0) {
      return Object.keys(data[0]).map((key, index) => {
        return <th key={index}>{key.toUpperCase()}</th>;
      });
    }
  };

  // Function to render table rows
  const renderTableRows = () => {
    return data.map((row, index) => {
      return (
        <tr key={index}>
          {Object.values(row).map((cell, idx) => {
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
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(',')); // Add header row

    for (const row of data) {
      const values = headers.map(header => {
        const escaped = ('' + row[header]).replace(/"/g, '\\"'); // Escape double quotes
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