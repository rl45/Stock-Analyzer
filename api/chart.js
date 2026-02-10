export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const { symbol } = req.query;
  const range = req.query.range || '1mo';
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol required' });
  }
  
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=1d`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Chart error:', error);
    res.status(500).json({ error: 'Failed to fetch chart', details: error.message });
  }
}