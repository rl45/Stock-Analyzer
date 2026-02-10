export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol } = req.body;
  
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Analyze ${symbol} stock. Return ONLY valid JSON (no markdown, no backticks): {"symbol":"${symbol}","currentPrice":0,"recommendation":"BUY|SELL|HOLD","confidence":0-100,"reasoning":"brief","keyMetrics":{"peRatio":"value","marketCap":"value","52weekChange":"value"},"sentiment":"POSITIVE|NEGATIVE|NEUTRAL","risks":["risk1","risk2"],"opportunities":["opp1","opp2"]}`
        }],
        tools: [{ type: "web_search_20250305", name: "web_search" }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('API Error:', data.error);
      return res.status(429).json({ error: data.error.message });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to analyze', details: error.message });
  }
}