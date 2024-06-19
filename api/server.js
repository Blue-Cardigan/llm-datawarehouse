const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { Pool } = require('pg');
const { OpenAI } = require("openai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));

const secretKey = process.env.SECRET_KEY;

// PostgreSQL pool setup (remote)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
    rejectUnauthorized: false 
  }
});

pool.connect().catch(err => console.error('Connection error', err.stack));
console.log('Connected to PostgreSQL');
module.exports = { pool };

// OpenAI API setup
process.env.OPENAI_API_KEY = 'sk-proj-ZoaaVV0YvbIKJXwteiNDT3BlbkFJ04nNFE005MpoksRMN7TS';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Routes
const routes = require('./routes');
app.use(routes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  pool.end().then(() => {
    console.log('PostgreSQL pool disconnected');
    process.exit(0);
  });
});