// api/controllers.js
const { pool } = require('./server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { OpenAI } = require("openai");
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
require('dotenv').config();

// Load prompts and metadata from YAML file
const promptsPath = path.join(__dirname, 'config', 'prompts.yaml');
const promptsData = yaml.load(fs.readFileSync(promptsPath, 'utf8'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const secretKey = process.env.SECRET_KEY;

async function getLargeRegions(req, res, next) {
  try {
    const client = await pool.connect();
    
    const partitions = 10; // Number of partitions
    const queries = [];
    
    for (let i = 1; i <= partitions; i++) {
      queries.push(`
        SELECT DISTINCT
          ctry22nm,
          rgn22nm,
          utla22nm,
          ltla22nm
        FROM ew_geographies_region${i}
      `);
    }
    
    const query = queries.join(' UNION ALL ');
    const result = await client.query(query);
    client.release();
    
    const largeRegions = {};
    
    result.rows.forEach(row => {
      if (!largeRegions[row.ctry22nm]) {
        largeRegions[row.ctry22nm] = {};
      }
      if (!largeRegions[row.ctry22nm][row.rgn22nm]) {
        largeRegions[row.ctry22nm][row.rgn22nm] = {};
      }
      if (!largeRegions[row.ctry22nm][row.rgn22nm][row.utla22nm]) {
        largeRegions[row.ctry22nm][row.rgn22nm][row.utla22nm] = [];
      }
      largeRegions[row.ctry22nm][row.rgn22nm][row.utla22nm].push(row.ltla22nm);
    });
    
    res.json(largeRegions);
  } catch (error) {
    console.error('Error in /largeRegions:', error);
    next(error);
  }
}

async function returnSchemas(query) {
  const datasetsPath = path.join(__dirname, 'table_titles.json');
  const datasetsJson = JSON.parse(fs.readFileSync(datasetsPath, 'utf8'));
  const datasetDescriptions = datasetsJson.EW;

  let descriptionsText = "";
  for (const [key, description] of Object.entries(datasetDescriptions)) {
    descriptionsText += `${key}: ${description}\n`;
  }

  const prompt = `${promptsData.prompts.dataset_selection.description}\n\nQuery: ${query}\n\nDataset Codes with Descriptions:\n${descriptionsText}`;
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

    const tableNames = dataset_list.map(dataset => `census2021-${dataset.toLowerCase()}-ltla`);
    let schemaDescriptions = [];
    for (const tableName of tableNames) {
      const queryText = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1;
      `;
      const client = await pool.connect();
      const result = await client.query(queryText, [tableName]);
      client.release();

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
    throw new Error('Failed to generate SQL query');
  }
}

async function convertToSQL(query, schemas) {
  try {
    const meta = Object.entries(promptsData.geography_codes)
       .map(([key, desc]) => `${key}: ${desc}`)
       .join('\n');

     const prompt = `${promptsData.prompts.sql_generation.description}\n\n###Question###\n${query}\n###\n\n###Schemas###\n${schemas.join("\n")}\n\n###Geography Codes###\n${meta}`;
     console.log("Generating SQL query with prompt: ", prompt);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `${prompt}`,
        },
      ],
    });

    if (completion.choices[0].message.content.includes("invalid question")) {
      console.log("invalid question");
      return "Invalid question, try to be specific.";
    }

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating text:', error);
    throw new Error('Failed to generate SQL query');
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
    client.release();

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
  } catch (error) {
    next(error);
  }
}

async function getSubregions(req, res, next) {
  const { ltla, region } = req.query;

  if (!ltla && !region) {
    return res.status(400).json({ error: 'LTLA or region is required' });
  }

  let sqlQuery;
  let queryParams;

  if (region) {
    sqlQuery = `
      SELECT DISTINCT iz_nm, oa
      FROM sc_geographies
      WHERE ca_nm = $1;
    `;
    queryParams = [region];
  } else {
    sqlQuery = `
      SELECT DISTINCT msoa, lsoa, oa
      FROM ew_geonames
      WHERE ltla = $1;
    `;
    queryParams = [ltla];
  }

  try {
    const client = await pool.connect();
    const result = await client.query(sqlQuery, queryParams);
    client.release();

    if (region) {
      const nestedOptions = {};

      result.rows.forEach(row => {
        if (!nestedOptions[row.iz_nm]) {
          nestedOptions[row.iz_nm] = [];
        }
        if (row.oa) {
          nestedOptions[row.iz_nm].push(row.oa);
        }
      });

      res.json(nestedOptions);
    } else {
      const nestedOptions = {};

      result.rows.forEach(row => {
        if (!nestedOptions[row.msoa]) {
          nestedOptions[row.msoa] = {};
        }
        if (!nestedOptions[row.msoa][row.lsoa]) {
          nestedOptions[row.msoa][row.lsoa] = [];
        }
        if (row.oa) {
          nestedOptions[row.msoa][row.lsoa].push(row.oa);
        }
      });

      res.json(nestedOptions);
    }
  } catch (error) {
    console.error('Error executing SQL query:', error);
    next(error);
  }
}

async function getOutputAreas(req, res, next) {
  const { lsoa } = req.query;

  if (!lsoa) {
    return res.status(400).json({ error: 'LSOA is required' });
  }

  const sqlQuery = `
    SELECT DISTINCT oa 
    FROM geography_mappings 
    WHERE lsoa = $1;
  `;
  try {
    const client = await pool.connect();
    const result = await client.query(sqlQuery, [lsoa]);
    client.release();
    const outputAreas = result.rows.map(row => row.oa);
    res.json(outputAreas);
  } catch (error) {
    console.error('Error executing SQL query:', error);
    next(error);
  }
}

// Utility function to map original column names to hashed names
async function mapOriginalToHashed() {
  const query = 'SELECT original_name, shortened_name FROM column_name_mappings';
  const client = await pool.connect();
  const result = await client.query(query);
  client.release();
  return result.rows.reduce((acc, row) => {
    acc[row.original_name] = row.shortened_name;
    return acc;
  }, {});
}

// Utility function to map hashed column names to original names
async function mapHashedToOriginal() {
  const query = 'SELECT original_name, shortened_name FROM column_name_mappings';
  const client = await pool.connect();
  const result = await client.query(query);
  client.release();
  return result.rows.reduce((acc, row) => {
    if (row.shortened_name.startsWith('hashed_')) {
      acc[row.shortened_name] = row.original_name;
    }
    return acc;
  }, {});
}

// Function to handle parameterized queries
async function paramQuery(req, res, next) {
  const { selectedTable, geography, columns, isScotland } = req.body;
  const geographyValues = geography.value.split(',');

  // Determine table name based on geography type
  const geographyType = isScotland
    ? geography.type.replace('region', 'ca')
    : geography.type.replace('country', 'ctry').replace('region', 'rgn');
  const tableName = isScotland
    ? `census2022-${selectedTable}-${geographyType}`
    : `census2021-${selectedTable}-${geographyType}`;

    try {
      const client = await pool.connect();
      const columnNameMappings = await mapOriginalToHashed();
      const alwaysIncludeColumns = ['geocode', 'geoname'];
      const allColumns = Array.from(new Set([...alwaysIncludeColumns, ...columns]));
  
      // Check if 'Total' is present in the columns and reorder accordingly
      const totalColumn = 'Total';
      if (allColumns.includes(totalColumn)) {
        allColumns.splice(allColumns.indexOf(totalColumn), 1); // Remove 'Total' from its current position
        allColumns.splice(alwaysIncludeColumns.length, 0, totalColumn); // Insert 'Total' after alwaysIncludeColumns
      }
  
      // Map columns to their hashed names
      const columnsList = allColumns
        .map((column) => {
          const originalName = column.replace(/_/g, ' ');
          const hashedName = columnNameMappings[originalName] || originalName;
          return `"${hashedName}"`;
        })
        .join(', ');

    const sqlQuery = `
      SELECT ${columnsList}
      FROM "${tableName.toLowerCase()}"
      WHERE geoname = ANY($1);
    `;

    const result = await client.query(sqlQuery, [geographyValues]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified geography' });
    }

    // Transform results to use original column names
    const columnNameMappingsReversed = await mapHashedToOriginal();
    const transformedResults = result.rows.map((row) => {
      const transformedRow = {};
      Object.keys(row).forEach((key) => {
        const originalName = key.replace(/_/g, ' ');
        transformedRow[columnNameMappingsReversed[key] || originalName] = row[key];
      });
      return transformedRow;
    });

    res.json({ query: sqlQuery, data: transformedResults });
  } catch (error) {
    console.error('Error executing SQL query:', error);
    next(error);
  }
}

// Function to get column names for a table
async function getColumnNames(req, res, next) {
  const { table } = req.query;
  const tableName = `census2021-${table.toLowerCase()}-ltla`;

  const sqlQuery = `
    SELECT DISTINCT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1;
  `;

  try {
    const client = await pool.connect();
    const result = await client.query(sqlQuery, [tableName]);
    client.release();

    const columnNames = result.rows.map(row => row.column_name);
    const columnNameMappings = await mapHashedToOriginal();

    // Map only hashed column names to original names
    const mappedColumnNames = columnNames.map(columnName => {
      if (columnName.startsWith('hashed_')) {
        return columnNameMappings[columnName] || columnName;
      }
      return columnName;
    });

    const mappedColumnNamesReplaced = mappedColumnNames.map(columnName => columnName.replace(/_/g, ' '));

    res.json(mappedColumnNamesReplaced);
  } catch (error) {
    console.error('Error executing SQL query:', error);
    next(error);
  }
}

async function llmQuery(req, res, next) {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  let sqlQuery = "";
  let attempt = 0;
  const maxAttempts = 2;

  try {
    const client = await pool.connect();
    const columnNameMappings = await mapOriginalToHashed();
    const schemas = await returnSchemas(query);
    sqlQuery = await convertToSQL(query, schemas);
    sqlQuery = sqlQuery.replace(/```sql/g, '').replace(/```/g, '').trim();
    sqlQuery = sqlQuery.replace(/^"(.*)"$/, '$1');
    if (sqlQuery.toLowerCase().includes("invalid question")) {
      res.status(400).json({ error: 'Invalid question' });
      return;
    }

    // Transform table names directly here
    sqlQuery = sqlQuery.replace(/\bts(\d{3})\b/g, 'census2021-ts$1');

    Object.keys(columnNameMappings).forEach(originalName => {
      const hashedName = `${columnNameMappings[originalName]}`;
      sqlQuery = sqlQuery.replace(new RegExp(`\\b${originalName}\\b`, 'g'), hashedName);
    });
    // console.log("sqlQuery", sqlQuery);

    while (attempt < maxAttempts) {
      try {
        const dbResponse = await client.query(sqlQuery);
        client.release();
        const transformedData = dbResponse.rows.map(row => {
          const transformedRow = {};
          Object.keys(row).forEach(key => {
            const transformedKey = key.replace(/_/g, ' ');
            transformedRow[transformedKey] = row[key];
          });
          return transformedRow;
        });
        res.json({ data: transformedData, sqlQuery: sqlQuery });
        return;
      } catch (error) {
        console.error('Error executing SQL query in llmquery:', error);
        attempt++;
        if (attempt >= maxAttempts) {
          res.status(500).json({ error: 'Failed to execute SQL query after multiple attempts', sqlQuery: sqlQuery, details: error.message });
          return;
        }
        const prompt = `Correct the provided SQL query based on the provided error. 
          - Return only the SQL query as a string. 
          - Wrap column names in double quotes.
          
          ###SQL Query###
          ${sqlQuery}
          ###

          ###Error###
          ${error}
          ###`;    
        console.log(`Error, reprompting: ${prompt}`);
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
        sqlQuery = sqlQuery.replace(/```sql/g, '').replace(/```/g, '').trim();
        sqlQuery = sqlQuery.replace(/^"(.*)"$/, '$1');
        sqlQuery = sqlQuery.replace(/\bts(\d{3})\b/g, 'census2021-ts$1');

        Object.keys(columnNameMappings).forEach(originalName => {
          const hashedName = `${columnNameMappings[originalName]}`;
          sqlQuery = sqlQuery.replace(new RegExp(`\\b${originalName}\\b`, 'g'), hashedName);
        });
      }
    }
  } catch (error) {
    console.error('Error processing LLM query:', error);
    next(error);
  }
}

module.exports = {
  getLargeRegions,
  returnSchemas,
  convertToSQL,
  mapOriginalToHashed,
  mapHashedToOriginal,
  login,
  getSubregions,
  getOutputAreas,
  getColumnNames,
  paramQuery,
  llmQuery
};