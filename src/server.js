require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const analysisCache = new Map();

app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.get('/api/chart/:symbol', async (req, res) => {
  const { symbol } = req.params;
  console.log('Fetching chart data for:', symbol);
  
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Chart fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

app.post('/api/analyze', async (req, res) => {
  const { symbol } = req.body;
  console.log('Analyzing:', symbol);
  
  const cached = analysisCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
    console.log('✅ Returning cached analysis for', symbol);
    return res.json(cached.data);
  }
  
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // ✅ THIS IS THE CORRECT ONE
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `${symbol} stock. JSON only:
{"symbol":"${symbol}","currentPrice":0,"recommendation":"BUY|SELL|HOLD","confidence":0-100,"reasoning":"brief","keyMetrics":{"peRatio":0,"marketCap":"","52weekChange":""},"sentiment":"POSITIVE|NEGATIVE|NEUTRAL","risks":[""],"opportunities":[""]}`
          }
        ],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search"
          }
        ]
      })
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    
    if (data.error) {
      console.error('API Error:', data.error);
      return res.status(429).json({ error: data.error.message });
    }
    
    analysisCache.set(symbol, { data, timestamp: Date.now() });
    console.log('✅ Analysis complete:', symbol);
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to analyze' });
  }
});

app.listen(3001, () => {
  console.log('✅ Server running on http://localhost:3001');
  console.log('📊 Using Claude Haiku 4.5');
});