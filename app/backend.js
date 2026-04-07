
const express = require('express');
const { Client } = require('pg');

const app = express();

const client = new Client({
    host: process.env.RDSHOST,
    user: 'postgres',
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false
    }
});

client.connect();

app.get('/visit', async (req, res) => {
    const result = await client.query('UPDATE counter SET value = value + 1 RETURNING value');
    res.json({ visit: result.rows[0].value });
})

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
