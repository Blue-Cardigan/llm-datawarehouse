// api/routes.js
const express = require('express');
const path = require('path');
const router = express.Router();
const { login, getLargeRegions, getSubregions, getOutputAreas, getColumnNames, paramQuery, llmQuery, returnTableDetails } = require('./controllers');

router.post('/login', login);
router.get('/largeRegions', getLargeRegions);
router.get('/subregions', getSubregions);
router.get('/outputAreas', getOutputAreas);
router.get('/columnNames', getColumnNames);
router.post('/paramQuery', paramQuery);
router.post('/llmQuery', llmQuery);
router.get('/tableDetails', returnTableDetails);

router.get('*', (req, res) => {
  console.log('Request received for', req.originalUrl);
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

module.exports = router;