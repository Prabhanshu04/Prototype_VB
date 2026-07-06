require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CSV_PATH = path.join(__dirname, 'sessions.csv');

const CSV_COLUMNS = [
  'session_id', 'participant_id', 'condition_order',
  'timestamp', 'mode', 'query_type', 'language', 'model',
  'payload_string', 'payload_chars',
  'input_tokens_actual', 'output_tokens_actual',
  'response_text', 'phrase_text',
  'transform_value', 'urgency_value', 'action_value',
  'severity', 'location_x', 'location_y',
  'radiation_x', 'radiation_y',
  'onset_clock', 'recurrence_marks',
  'active_modifiers', 'sos_triggered',
  'estimated_tokens_before_call',
  'suggestion_tokens'
];

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

function rowToCsvLine(row) {
  return CSV_COLUMNS.map(col => csvEscape(row[col])).join(',') + '\n';
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

app.post('/api/openai', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not set in .env' });
    }
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({ ...req.body, model: 'gpt-4o' })
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[/api/openai] error:', err.message || err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set in .env' });
    }
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[/api/gemini] error:', err.message || err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.post('/save-session', (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    if (!fs.existsSync(CSV_PATH)) {
      fs.writeFileSync(CSV_PATH, CSV_COLUMNS.join(',') + '\n');
    }
    const lines = rows.map(rowToCsvLine).join('');
    fs.appendFileSync(CSV_PATH, lines);
    res.json({ success: true, rows_saved: rows.length });
  } catch (err) {
    console.error('[/save-session] error:', err.message || err);
    res.status(500).json({ success: false, error: String(err.message || err) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('WARNING: OPENAI_API_KEY not set in .env');
  }
  if (!process.env.GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY not set in .env');
  }
  const localIp = getLocalIp();
  console.log('----------------------------------------');
  console.log('Affect Polygon server running');
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://${localIp}:${PORT}`);
  console.log('----------------------------------------');
  console.log('CSV output: ' + CSV_PATH);
  console.log('----------------------------------------');
});
