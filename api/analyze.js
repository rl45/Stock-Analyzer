// api/analyze.js
const fetch = require('node-fetch');

const cache = new Map();

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbol } = req.body;
  
  // Check cache
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `${symbol} stock. JSON only:
{"symbol":"${symbol}","currentPrice":0,"recommendation":"BUY|SELL|HOLD","confidence":0-100,"reasoning":"brief","keyMetrics":{"peRatio":0,"marketCap":"","52weekChange":""},"sentiment":"POSITIVE|NEGATIVE|NEUTRAL","risks":[""],"opportunities":[""]}`
        }],
        tools: [{ type: "web_search_20250305", name: "web_search" }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(429).json({ error: data.error.message });
    }
    
    cache.set(symbol, { data, timestamp: Date.now() });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze' });
  }
};