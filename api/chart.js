export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const { symbol, range } = req.query;
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol required' });
  }

  const requestedRange = range || '1mo';
  
  // Map time ranges to appropriate intervals
  const intervalMap = {
    '1mo': '1d',
    '3mo': '1d',
    '6mo': '1d',
    'ytd': '1d',
    '1y': '1wk',
    '2y': '1wk',
    '5y': '1mo'
  };
  
  const interval = intervalMap[requestedRange] || '1d';
  
  // Build the Yahoo Finance URL
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${requestedRange}&interval=${interval}`;
  
  console.log('Fetching from Yahoo:', yahooUrl);
  
  try {
    const response = await fetch(yahooUrl);
    const data = await response.json();
    
    console.log('Yahoo response status:', response.status);
    console.log('Data points returned:', data.chart?.result?.[0]?.timestamp?.length || 0);
    
    res.json(data);
  } catch (error) {
    console.error('Chart error:', error);
    res.status(500).json({ error: 'Failed to fetch chart', details: error.message });
  }
}