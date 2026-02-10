export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol } = req.body;

  // Return mock data to test if the endpoint works
  return res.json({
    content: [{
      type: "text",
      text: JSON.stringify({
        symbol: symbol,
        currentPrice: 450.00,
        recommendation: "HOLD",
        confidence: 75,
        reasoning: "Testing - API endpoint is working!",
        keyMetrics: { peRatio: "25", marketCap: "$1T", "52weekChange": "+15%" },
        sentiment: "POSITIVE",
        risks: ["This is test data"],
        opportunities: ["Endpoint is working correctly"]
      })
    }]
  });
}