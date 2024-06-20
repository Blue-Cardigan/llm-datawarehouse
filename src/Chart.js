import React from 'react';
import Plot from 'react-plotly.js';
import './index.css'; // Import the CSS file for styling

const LineChart = ({ data }) => {
  const parsedData = JSON.parse(data);
  console.log("Parsed data:", parsedData);

  const normalizePartyName = (name) => {
    const normalized = name.toLowerCase().replace(/\s+/g, '');
    if (normalized === 'conservativeparty') {
      return 'conservative';
    }
    return normalized;
  };

  const processData = () => {
    const partyVotes = {};
    const years = new Set();

    parsedData.forEach((yearData) => {
      const year = yearData.year;
      years.add(year);
      yearData.parties.forEach((party) => {
        const normalizedPartyName = normalizePartyName(party.name);
        if (normalizedPartyName === 'votesshare') return; // Skip 'vote share'
        if (!partyVotes[normalizedPartyName]) {
          partyVotes[normalizedPartyName] = { 
            x: [], 
            y: [], 
            name: party.name, 
            type: 'scatter', 
            mode: 'lines+markers', 
            line: { dash: getLineStyle(party.name), width: 2 }, 
            marker: { color: getPartyColor(party.name), size: 8, symbol: getMarkerSymbol(party.name) } 
          };
        }
        partyVotes[normalizedPartyName].x.push(year);
        partyVotes[normalizedPartyName].y.push(party.votes);
      });
    });

    return { traces: Object.values(partyVotes), years: Array.from(years).sort() };
  };

  const getPartyColor = (party) => {
    const partyColors = {
      'conservative': '#1f77b4',
      'labour': '#ff7f0e',
      'liberaldemocrats': '#2ca02c',
      'green': '#d62728',
      'brexit': '#9467bd',
      'plaidcymru': '#8c564b',
      'snp': '#e377c2',
      'sdlp': '#7f7f7f',
      'alliance': '#bcbd22',
      'dup': '#17becf',
      'sinnfein': '#1f77b4',
      'uup': '#ff7f0e',
      'other': '#2ca02c',
    };
    return partyColors[normalizePartyName(party)] || '#7f7f7f';
  };

  const getLineStyle = (party) => {
    const lineStyles = {
      'conservative': 'solid',
      'labour': 'dash',
      'liberaldemocrats': 'dot',
      'green': 'dashdot',
      'brexit': 'solid',
      'plaidcymru': 'dash',
      'snp': 'dot',
      'sdlp': 'dashdot',
      'alliance': 'solid',
      'dup': 'dash',
      'sinnfein': 'dot',
      'uup': 'dashdot',
      'other': 'solid',
    };
    return lineStyles[normalizePartyName(party)] || 'solid';
  };

  const getMarkerSymbol = (party) => {
    const markerSymbols = {
      'conservative': 'circle',
      'labour': 'square',
      'liberaldemocrats': 'diamond',
      'green': 'cross',
      'brexit': 'x',
      'plaidcymru': 'triangle-up',
      'snp': 'triangle-down',
      'sdlp': 'triangle-left',
      'alliance': 'triangle-right',
      'dup': 'star',
      'sinnfein': 'hexagram',
      'uup': 'pentagon',
      'other': 'circle',
    };
    return markerSymbols[normalizePartyName(party)] || 'circle';
  };

  const { traces, years } = processData();

  if (parsedData.length === 0) {
    return <div>Please select years and parties to display the chart.</div>;
  }

  // Check if only one year is given
  if (years.length === 1) {
    const year = years[0];
    const barData = traces.map(trace => ({
      x: [trace.name],
      y: trace.y,
      type: 'bar',
      name: trace.name,
      marker: { color: trace.marker.color }
    }));

    return (
      <div className="chart-container">
        <Plot
          data={barData}
          layout={{
            title: `Party Votes in ${year}`,
            xaxis: { title: 'Party', tickfont: { color: '#ffffff' } },
            yaxis: { title: 'Votes', tickfont: { color: '#ffffff' } },
            plot_bgcolor: '#1e1e1e',
            paper_bgcolor: '#1e1e1e',
            font: { color: '#ffffff' },
            legend: { orientation: 'h', x: 0, y: -0.2, font: { color: '#ffffff' } },
            margin: { t: 50, b: 100 },
            height: 600,
            width: 1000
          }}
        />
      </div>
    );
  }

  return (
    <div className="chart-container">
      <Plot
        data={traces}
        layout={{
          title: 'Party Votes Over Time',
          xaxis: { title: 'Year', tickvals: years, tickformat: 'd', showgrid: true, zeroline: false, tickfont: { color: '#ffffff' } },
          yaxis: { title: 'Votes', showgrid: true, zeroline: false, tickfont: { color: '#ffffff' } },
          plot_bgcolor: '#1e1e1e',
          paper_bgcolor: '#1e1e1e',
          font: { color: '#ffffff' },
          legend: { orientation: 'h', x: 0, y: -0.2, font: { color: '#ffffff' } },
          margin: { t: 50, b: 100 },
          height: 600,
          width: 1000
        }}
      />
    </div>
  );
};

export default LineChart;