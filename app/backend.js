const express = require('express');
const { Client } = require('pg');

const app = express();

const client = new Client({
    host: 'RDS_ENDPOINT',
    user: 'postgres',
    password: 'PASSWORD',
    port: 5432,
});

client.connect();

app.get('/visit', async (req, res) => {
    const result = await client.query('UPDATE counter SET value = value + 1 RETURN value');
    res.json({ visit: result.rows[0].value });
})

app.listen(3000);