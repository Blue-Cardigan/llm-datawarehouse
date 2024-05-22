const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { Client } = require('pg');
const { OpenAI } = require("openai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();
process.env.OPENAI_API_KEY = 'sk-proj-ZoaaVV0YvbIKJXwteiNDT3BlbkFJ04nNFE005MpoksRMN7TS';

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../build')));

const secretKey = 'secretkey';

// PostgreSQL client setup (remote)
const isProduction = process.env.NODE_ENV === 'production';
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
        require: true,
        rejectUnauthorized: false 
      }
});

client.connect().catch(err => console.error('Connection error', err.stack));
console.log(`connected to, ${client}`);
// OpenAI API setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tableNameMappings = JSON.parse(fs.readFileSync(path.join(__dirname, 'file-table-map.json'), 'utf8')).filenames;

app.get('/largeRegions', (req, res) => {
  try {
    const largeRegions = require('./geography_mapping.json');
    res.json(largeRegions);
  } catch (error) {
    console.error('Error in /largeRegions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Select relevant datasets using natural language query
async function returnSchemas(query) {
  const datasetsPath = path.join(__dirname, 'datasets.json');
  const datasetsJson = JSON.parse(fs.readFileSync(datasetsPath, 'utf8'));
  const datasetDescriptions = datasetsJson.datasets; // Access the 'datasets' property of the JSON object

  // Format the dataset descriptions into a readable string
  let descriptionsText = "";
  for (const [key, description] of Object.entries(datasetDescriptions)) {
    descriptionsText += `${key}: ${description}\n`;
  }

  const prompt = `Select the relevant dataset codes using the descriptions below, that can be used to answer the provided query. Return only the dataset codes as a comma separated list, without descriptions. \n\nQuery: ${query}\n\nDataset Codes with Descriptions:\n${descriptionsText}`;
  console.log("selecting datasets");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const regex = /TS\d+[A-Z]?/g;
    const matches = completion.choices[0].message.content.match(regex);
    const dataset_list = matches ? matches.map(title => title.trim().toLowerCase().replace(/\s/g, '')) : [];

    // Map dataset_list items to their correct table names
    const tableNames = dataset_list.map(dataset => `census2021-${dataset.toLowerCase()}-ctry`);
    // Query for column names, datatype, and the first row item as an example
    let schemaDescriptions = [];
    for (const tableName of tableNames) {
      // Fetch column names and data types
      const queryText = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name != 'id';
      `;
      const result = await client.query(queryText, [tableName]);
    
      // For each column, fetch an example value
      const descriptions = await Promise.all(result.rows.map(async (row) => {
        const exampleQuery = `SELECT "${row.column_name}" FROM "${tableName}" LIMIT 1;`;
        const exampleResult = await client.query(exampleQuery);
        const exampleValue = exampleResult.rows.length > 0 ? exampleResult.rows[0][row.column_name] : 'No data';
        return `${row.column_name} (${row.data_type}) | Example value: ${exampleValue}`;
      }));
    
      const description = descriptions.join('\n');
      const datasetKey = tableName.replace('census2021-', '').replace('-ctry', '');
      const datasetDescription = datasetDescriptions[datasetKey.toUpperCase()];
      schemaDescriptions.push(`*${datasetKey} - ${datasetDescription}:*\n${description}\n\n`);
    }

    return schemaDescriptions;
  } catch (error) {
    console.error('Error generating text:', error);
    throw new Error('Failed to generate SQL query'); // Changed to throw to propagate the error correctly
  }
}

// Convert natural language to SQL using OpenAI's GPT
async function convertToSQL(query, schemas) {
  try {
    // Load meta.txt asynchronously
    const meta = await fs.promises.readFile(path.join(__dirname, 'meta.txt'), 'utf8');
    const prompt = `Use the provided question to write an SQL query for a PostgreSQL database using the schema(s) and Geography Codes below. 
    - Return only the SQL query as a string. 
    - Ensure to match the column name exactly. 
    - Wrap column names in double quotes.
    - Always include "geography" and "geography_code", even if they are not explicitly mentioned in the statement. 
    - If the question is not valid, return "invalid question".
    
    ###Question###
    ${query}
    ###
    
    ###Schemas###
    ${schemas.join("\n")}
    
    ###Geography Codes###
    ${meta}   

    Use the {table code}-{geography code} pair in your query, for example "ts0001-oa", "ts0002-ltla" etc.
    ###
    `
    console.log("Generating SQL query");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `${prompt}`,
        },
      ],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating text:', error);
    throw new Error('Failed to generate SQL query'); // Use throw to propagate the error
  }
}

// Function to fetch column name mappings from the database
async function mapOriginalToHashed() {
  const query = 'SELECT original_name, hashed_name FROM column_name_mappings';
  const result = await client.query(query);
  return result.rows.reduce((acc, row) => {
    acc[row.original_name] = row.hashed_name;
    return acc;
  }, {});
}

// Function to fetch column name mappings from the database and map hashed names to original names
async function mapHashedToOriginal() {
  const query = 'SELECT original_name, hashed_name FROM column_name_mappings';
  const result = await client.query(query);
  return result.rows.reduce((acc, row) => {
    acc[row.hashed_name] = row.original_name; // Reverse the mapping here
    return acc;
  }, {});
}

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const user = result.rows[0];
  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: '1h' });
  res.json({ token });
});

// Endpoint to fetch hierarchical geography options based on UTLA name
app.get('/subregions', async (req, res) => {
  const { ltla } = req.query;

  if (!ltla) {
    return res.status(400).json({ error: 'LTLA is required' });
  }

  // SQL query to fetch msoa, lsoa, and oa based on ltla
  const sqlQuery = `
    SELECT DISTINCT msoa, lsoa, oa
    FROM geography_mappings 
    WHERE ltla = $1;
  `;

  try {
    const result = await client.query(sqlQuery, [ltla]);
    const nestedOptions = {};

    result.rows.forEach(row => {
      if (!nestedOptions[row.msoa]) {
        nestedOptions[row.msoa] = {};
      }
      if (!nestedOptions[row.msoa][row.lsoa]) {
        nestedOptions[row.msoa][row.lsoa] = {};
      }
      // Ensure that oa is not undefined or null before adding it
      if (row.oa && !nestedOptions[row.msoa][row.lsoa][row.oa]) {
        nestedOptions[row.msoa][row.lsoa][row.oa] = [];
      }
      // Only push oa if it exists
      if (row.oa) {
        nestedOptions[row.msoa][row.lsoa][row.oa].push(row.oa);
      }
    });

    // Filter out any empty arrays at the most deeply nested layer
    Object.keys(nestedOptions).forEach(msoa => {
      Object.keys(nestedOptions[msoa]).forEach(lsoa => {
        Object.keys(nestedOptions[msoa][lsoa]).forEach(oa => {
          if (nestedOptions[msoa][lsoa][oa].length === 0) {
            delete nestedOptions[msoa][lsoa][oa];
          }
        });
        // Clean up any empty lsoa objects
        if (Object.keys(nestedOptions[msoa][lsoa]).length === 0) {
          delete nestedOptions[msoa][lsoa];
        }
      });
      // Clean up any empty msoa objects
      if (Object.keys(nestedOptions[msoa]).length === 0) {
        delete nestedOptions[msoa];
      }
    });

    res.json(nestedOptions);
  } catch (error) {
    console.error('Error executing SQL query:', error);
    res.status(500).json({ error: 'Failed to execute query', details: error.message });
  }
});

app.get('/outputAreas', async (req, res) => {
  const { lsoa } = req.query;

  if (!lsoa) {
    return res.status(400).json({ error: 'LSOA is required' });
  }

  // SQL query to fetch ltla, lsoa, and lsoa based on utla
  const sqlQuery = `
    SELECT DISTINCT oa 
    FROM geography_mappings 
    WHERE lsoa = $1;
  `;
  try {
    const result = await client.query(sqlQuery, [lsoa]);
    const outputAreas = result.rows.map(row => row.oa);
    res.json(outputAreas);
  } catch (error) {
    console.error('Error executing SQL query:', error);
    res.status(500).json({ error: 'Failed to execute query', details: error.message });
  }
});

app.get('/columnNames', async (req, res) => {
  const { table } = req.query;
  const tableName = `census2021-${table.toLowerCase()}-ctry`;

  // SQL query to fetch distinct column names from the specified table
  const sqlQuery = `
    SELECT DISTINCT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1;
  `;

  try {
    // Fetch column names from the database
    const result = await client.query(sqlQuery, [tableName]);
    const columnNames = result.rows.map(row => row.column_name);
    const columnNameMappings = await mapHashedToOriginal();
    const mappedColumnNames = columnNames.map(columnName => columnNameMappings[columnName] || columnName);
    const mappedColumnNamesReplaced = mappedColumnNames.map(columnName => columnName.replace(/_/g, ' '));

    res.json(mappedColumnNamesReplaced);
  } catch (error) {
    console.error('Error executing SQL query:', error);
    res.status(500).json({ error: 'Failed to execute query', details: error.message });
  }
});

app.post('/paramQuery', async (req, res) => {
  const { selectedTable, geography, columns } = req.body;

  // Replace 'country' and 'region' with 'ctry' and 'rgn' respectively in the geography type
  const geographyType = geography.type.replace('country', 'ctry').replace('region', 'rgn');
  const geographyValues = geography.value.split(',');

  const tableName = `census2021-${selectedTable}-${geographyType}`;

  try {
    const columnNameMappings = await mapOriginalToHashed();
    const alwaysIncludeColumns = ['geography', 'geography code'];
    const allColumns = Array.from(new Set([...alwaysIncludeColumns, ...columns]));
    const columnsList = allColumns.map(column => {
      const originalName = column.replace(/_/g, ' '); // Replace underscores back to spaces for mapping
      const hashedName = columnNameMappings[originalName] || originalName; // Use the original name if no mapping is found
      const finalName = hashedName.replace(/ /g, '_'); // Ensure all spaces are replaced with underscores
      return `"${finalName}"`; // Quote the final column name to handle any special characters
    }).join(', ');

    const sqlQuery = `
      SELECT ${columnsList}
      FROM "${tableName.toLowerCase()}"
      WHERE geography = ANY($1);
    `;

    const result = await client.query(sqlQuery, [geographyValues]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified parameters' });
    }
    const transformedResults = result.rows.map(row => {
      const transformedRow = {};
      Object.keys(row).forEach(key => {
        const originalName = key.replace(/_/g, ' '); // Replace underscores back to spaces
        transformedRow[originalName] = row[key];
      });
      return transformedRow;
    });
    
    res.json({ query: sqlQuery, data: transformedResults });
  } catch (error) {
    console.error('Error executing SQL query:', error);
    res.status(500).json({ error: 'Failed to execute query', details: error.message });
  }
});

app.post('/llmQuery', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  let sqlQuery = "";
  let attempt = 0;
  const maxAttempts = 2;

  const columnNameMappings = await mapOriginalToHashed();
  const schemas = await returnSchemas(query);
  sqlQuery = await convertToSQL(query, schemas);
  sqlQuery = sqlQuery.replace(/```sql/g, '').replace(/```/g, '').trim();
  sqlQuery = sqlQuery.replace(/^"(.*)"$/, '$1');
  if (sqlQuery.toLowerCase().includes("invalid question")) {
    res.status(400).json({ error: 'Invalid question' });
    return;
  }

  // Replace short table names with full names
  Object.keys(tableNameMappings).forEach(shortName => {
    const fullName = `${tableNameMappings[shortName]}`;
    sqlQuery = sqlQuery.replace(new RegExp(`\\b${shortName}\\b`, 'g'), fullName);
  });

  // Replace long column names with hashed names
  Object.keys(columnNameMappings).forEach(originalName => {
    const hashedName = `${columnNameMappings[originalName]}`;
    sqlQuery = sqlQuery.replace(new RegExp(`\\b${originalName}\\b`, 'g'), hashedName);
  });

  let dbResponse;
  // if dbresponse returns an error, return the error
  while (attempt < maxAttempts) {
    try {
      dbResponse = await client.query(sqlQuery);

      const transformedData = dbResponse.rows.map(row => {
        const transformedRow = {};
        Object.keys(row).forEach(key => {
          const transformedKey = key.replace(/_/g, ' ');
          transformedRow[transformedKey] = row[key];
        });
        return transformedRow;
      });
      console.log('Generated SQL Query:', sqlQuery);
      res.json({ data: transformedData, sqlQuery: sqlQuery });
      return
    } catch (error) {
      console.error('Error executing SQL query:', error);
      attempt++;
      if (attempt >= maxAttempts) {
        res.status(500).json({ error: 'Failed to execute SQL query after multiple attempts', sqlQuery: sqlQuery, details: error.message });
        return; // Exit after max attempts
      }
      const prompt = `Correct the provided SQL query based on the provided error. 
        - Return only the SQL query as a string. 
        - Wrap column names in double quotes.
        
        SQL Query: ${sqlQuery}
        Error: ${error}`    
        console.log(`Error, reprompting: ${prompt}`)
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: `${prompt}`,
            },
          ],
        });
      sqlQuery = completion.choices[0].message.content;
      attempt++;
    }
  // } catch (error) {
  //   console.error('Error processing request:', error);
  //   if (error.response) {
  //     res.status(500).json({ query: sqlQuery, error: 'OpenAI API error', details: error.response });
  //   } else if (error.code === 'ECONNREFUSED') {
  //     res.status(500).json({ query: sqlQuery, error: 'Database connection error', details: error.message });
  //   } else {
  //     res.status(500).json({ query: sqlQuery, error: 'Internal server error', details: error.message });
  //   }
  }
});

app.get('*', (req, res) => {
  console.log('Request received for', req.originalUrl);
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});