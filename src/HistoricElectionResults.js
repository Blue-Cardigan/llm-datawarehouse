import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ElectionsDisplay from './ElectionsDisplay';
import GridDropdown from './GridDropdown';

function HistoricElectionResults() {
  const [years, setYears] = useState(['2019']);
  const [parties, setParties] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [data, setData] = useState([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [filters, setFilters] = useState({ years: [], parties: [], constituencies: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchFilters();
  }, [years]);

  useEffect(() => {
    if (years.length > 0 || parties.length > 0 || constituencies.length > 0) {
      fetchData();
    }
  }, [years, parties, constituencies]);

  const fetchFilters = async () => {
    try {
      const response = await axios.get('/electionFilters', {
        params: { year: years.join(',') }
      });
      setFilters(response.data);
    } catch (error) {
      console.error('Error fetching election filters:', error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post('/elections', {
        years,
        parties,
        constituencies,
      });
      setData(response.data.data);
      setSqlQuery(response.data.sqlQuery);
    } catch (error) {
      console.error('Error fetching election results:', error);
    }
    setIsLoading(false);
  };

  const capitalize = (str) => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  };

  return (
    <div>
      <h2>Historic Election Results</h2>
      <div>
        <label htmlFor="year">Year:</label>
        <GridDropdown
          id="year"
          value={years}
          onChange={setYears}
          options={filters.years.map(y => ({ code: y.toString(), name: y.toString() }))}
          placeholder="Select Years"
          multiple={true}
        />
      </div>
      <div>
        <label htmlFor="party">Party:</label>
        <GridDropdown
          id="party"
          value={parties}
          onChange={setParties}
          options={filters.parties.map(p => ({ code: p, name: capitalize(p) }))}
          placeholder="Select Parties"
          multiple={true}
        />
      </div>
      <div>
        <label htmlFor="constituency">Constituency:</label>
        <GridDropdown
          id="constituency"
          value={constituencies}
          onChange={setConstituencies}
          options={filters.constituencies.map(c => ({ code: c, name: c }))}
          placeholder="Select Constituencies"
          multiple={true}
        />
      </div>
      <ElectionsDisplay data={data} sqlQuery={sqlQuery} isLoading={isLoading} />
    </div>
  );
}

export default HistoricElectionResults;