import React, { useState } from 'react';
import TableDisplay from './TableDisplay';

export default function LlmQueryForm({ setActiveTab }) { 
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmQueryResult, setllmQueryResult] = useState({ data: [], llmQuery: '', userllmQuery: '' });
  
  const handlellmQuerySubmit = async (llmQuery, e) => {
    e.preventDefault();
    setIsLoading(true);
    setQuery('');
    setActiveTab('llmQuery'); // Ensure the tab remains on LLM Query
    if (llmQuery.trim()) {
      setllmQueryResult(prevState => ({ ...prevState, userllmQuery: llmQuery }));
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/llmQuery`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: llmQuery }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const result = await response.json();
        setllmQueryResult({ data: result.data, llmQuery: result.llmQuery, userllmQuery: llmQuery });
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setllmQueryResult({ data: [], llmQuery: '', userllmQuery: llmQuery });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const exampleQueries = [
    "How many households in the North East region are composed of single family households with dependent children as of 2021?",
    "List the total number of residents holding British passports in London boroughs in the year 2021.",
    "Retrieve the number of one-person households aged 66 years and over in County Durham during 2021.",
    "Provide the number of people with Irish passports in Middle layer Super Output Areas of Liverpool for 2021.",
    "What is the number of Asian British or Asian Welsh individuals in the Upper-Tier Local Authorities of Manchester as reported in 2021?",
    "How many households in the West Midlands region are deprived in three dimensions as of the latest census data?",
    "Determine the total number of usual residents in households in Hartlepool's Lower layer Super Output Areas as of 2021.",
    "Calculate the number of individuals who identify as having a Scottish only national identity in Scotland for 2021.",
    "Show the age distribution of the population in five-year age bands within the East Midlands region for the year 2021.",
    "What are the population density figures for each Metropolitan District within the West Yorkshire area as per the latest census?"
  ]

  const handleExampleQueryClick = (query) => {
    setQuery(query);
  };

  return (
    <div className="query-form">
      <form onSubmit={(e) => handlellmQuerySubmit(query, e)}>
        <div className="frame">
          <h3>Ask the AI your question:</h3>
          <input
            type="text"
            id="queryInput"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your query in natural language"
          />
          <div>
            <ul>
              {exampleQueries.map((exampleQuery, index) => (
                <li key={index} onClick={() => handleExampleQueryClick(exampleQuery)}>
                  {exampleQuery}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="frame">
          <h3>See the response and query below:</h3>
          <button type="submit">Search Database</button>
          <TableDisplay 
            data={llmQueryResult.data} 
            query={llmQueryResult.llmQuery} 
            userQuery={llmQueryResult.userllmQuery} 
            isLoading={isLoading} 
          />
        </div>
      </form>
    </div>
  );
}