import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ElectionsDisplay from './ElectionsDisplay';
import GridDropdown from './GridDropdown';
import Chart from './Chart';
import './index.css';

function HistoricElectionResults() {
  const [years, setYears] = useState(['2019']);
  const [parties, setParties] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [data, setData] = useState([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [filters, setFilters] = useState({ years: [], parties: [], constituencies: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [alluvialData, setAlluvialData] = useState(null);
  const cache = useRef({});

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
      const response = await axios.get('/electionFilters', { params: { year: years.join(',') } });
      setFilters(response.data);
    } catch (error) {
      console.error('Error fetching election filters:', error);
    }
  };

  const fetchData = async () => {
    const cacheKey = JSON.stringify({ years, parties, constituencies });
    if (cache.current[cacheKey]) {
      setData(cache.current[cacheKey].data);
      setSqlQuery(cache.current[cacheKey].sqlQuery);
      updateAlluvialData(cache.current[cacheKey].data);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/elections', {
        years,
        parties,
        constituencies,
      });
      setData(response.data.data);
      setSqlQuery(response.data.sqlQuery);
      cache.current[cacheKey] = {
        data: response.data.data,
        sqlQuery: response.data.sqlQuery
      };
      updateAlluvialData(response.data.data);
      console.log(cache.current[cacheKey]);
    } catch (error) {
      console.error('Error fetching election results:', error);
    }
    setIsLoading(false);
  };

  const updateAlluvialData = (data) => {
    const alluvialJson = years.map(year => {
      const yearData = data.filter(item => item.Year === parseInt(year));
      const partyData = {};
      
      yearData.forEach(item => {
        Object.entries(item).forEach(([key, value]) => {
          if (key.includes('Votes') && key !== 'Total Votes' && value !== null) {
            const party = key.replace(' Votes', '');
            if (!partyData[party]) {
              partyData[party] = 0;
            }
            partyData[party] += parseInt(value);
          }
        });
      });

      return {
        year: year,
        parties: Object.entries(partyData).map(([party, votes]) => ({
          name: party,
          votes: votes
        }))
      };
    });

    setAlluvialData(JSON.stringify(alluvialJson));
  };

  const capitalize = (str) => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  };

  return (
    <div>
      <h1>Historic Election Results</h1>
      <div className="filters">
        <div>
          <label htmlFor="year"></label>
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
          <label htmlFor="party"></label>
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
          <label htmlFor="constituency"></label>
          <GridDropdown
            id="constituency"
            value={constituencies}
            onChange={setConstituencies}
            options={filters.constituencies.map(c => ({ code: c, name: c }))}
            placeholder="Select Constituencies"
            multiple={true}
          />
        </div>
      </div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          {alluvialData && <Chart data={alluvialData} />}
          <ElectionsDisplay data={data} sqlQuery={sqlQuery} />
        </>
      )}
    </div>
  );
}

export default HistoricElectionResults;