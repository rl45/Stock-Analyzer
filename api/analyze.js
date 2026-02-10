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
  const API_KEY = process.env.ALPHA_VANTAGE_KEY;
  
  try {
    // Get company overview from Alpha Vantage
    const response = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`
    );
    const data = await response.json();
    
    // Check if we got valid data
    if (data.Note) {
      return res.status(429).json({ 
        error: 'API limit reached. Please try again in a minute.' 
      });
    }
    
    if (!data.Symbol) {
      return res.status(404).json({ 
        error: `Stock ${symbol} not found` 
      });
    }
    
    // Calculate recommendation based on P/E ratio
    const peRatio = parseFloat(data.PERatio) || 0;
    const profitMargin = parseFloat(data.ProfitMargin) || 0;
    
    let recommendation = 'HOLD';
    let confidence = 70;
    let reasoning = 'Neutral market conditions';
    let sentiment = 'NEUTRAL';
    
    // Simple analysis logic
    if (peRatio > 0 && peRatio < 15 && profitMargin > 0.1) {
      recommendation = 'BUY';
      confidence = 85;
      reasoning = 'Low P/E ratio and strong profit margins indicate good value';
      sentiment = 'POSITIVE';
    } else if (peRatio > 40 || profitMargin < 0) {
      recommendation = 'SELL';
      confidence = 75;
      reasoning = 'High valuation or negative margins suggest caution';
      sentiment = 'NEGATIVE';
    }
    
    // Build response in Claude format
    const analysis = {
      symbol: data.Symbol,
      currentPrice: parseFloat(data['50DayMovingAverage']) || 0,
      recommendation: recommendation,
      confidence: confidence,
      reasoning: reasoning,
      keyMetrics: {
        peRatio: data.PERatio || 'N/A',
        marketCap: data.MarketCapitalization || 'N/A',
        '52weekChange': `${data['52WeekHigh']} - ${data['52WeekLow']}`
      },
      sentiment: sentiment,
      risks: [
        data.PERatio > 30 ? 'High P/E ratio suggests overvaluation' : 'Market volatility',
        'Sector-specific challenges: ' + (data.Sector || 'Unknown')
      ],
      opportunities: [
        'Industry: ' + (data.Industry || 'Unknown'),
        data.DividendYield ? `Dividend yield: ${data.DividendYield}` : 'Growth potential'
      ]
    };
    
    // Return in same format as Claude API
    res.json({
      content: [{
        type: "text",
        text: JSON.stringify(analysis)
      }]
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to analyze', details: error.message });
  }
}