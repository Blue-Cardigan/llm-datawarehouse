import React, { useState } from 'react';
import TableDisplay from './TableDisplay';

export default function LlmQueryForm({ setActiveTab }) { 
  const [query, setQuery] = useState('');
  const [llmQueryResult, setllmQueryResult] = useState({ data: [], sqlQuery: '', userQuestion: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handlellmQuerySubmit = async (query, e) => {
    e.preventDefault();
    setIsLoading(true); // Set isLoading to true immediately when the form is submitted
    setQuery('');
    
    setActiveTab('llmQuery');
    if (query.trim()) {
      setllmQueryResult(prevState => ({ ...prevState, userQuestion: query }));
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/llmQuery`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: query }),
        });

        if (!response.ok) {
          const result = await response.json();
          if (result.error) {
            setllmQueryResult({ data: [result.error], sqlQuery: '', userQuestion: "Invalid question. Try again. Make sure you're specific" });
          } else {
            throw new Error('Network response was not ok');
          }
        }

        const result = await response.json();
        setllmQueryResult({ data: result.data, sqlQuery: result.sqlQuery, userQuestion: result.details });
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setllmQueryResult({ data: [], sqlQuery: 'No query generated', userQuestion: query });
      } finally {
        setIsLoading(false); // Set isLoading to false once the data fetching process is complete
      }
    } else {
      setIsLoading(false); // Ensure isLoading is set to false if no query is submitted
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
          <h3>Ask the AI a specific question</h3>
          <div className="query-input">
            <input
              type="text"
              id="queryInput"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your query in natural language"
            />
            <button type="submit">Search Database</button>
          </div>
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
          <h3>See the response and query below</h3>
          <TableDisplay 
            data={llmQueryResult.data} 
            sqlQuery={llmQueryResult.sqlQuery} 
            userQuestion={llmQueryResult.userQuestion} 
            isLoading={isLoading}
          />
        </div>
      </form>
    </div>
  );
}