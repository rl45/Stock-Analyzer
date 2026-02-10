import React, { useState } from 'react';
import { Search, Loader2, TrendingUp, AlertTriangle, BarChart2, Activity } from 'lucide-react';

export default function StockAnalyzer() {
  const [symbol, setSymbol] = useState('');
  const [activeSymbol, setActiveSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [stockInfo, setStockInfo] = useState(null);
  const [error, setError] = useState('');
  const [recentSymbols, setRecentSymbols] = useState(['AAPL', 'TSLA', 'MSFT']);
  const [timeRange, setTimeRange] = useState('1mo');

  const API_BASE = process.env.NODE_ENV === 'production' 
    ? '' 
    : 'http://localhost:3001';

  const timeRanges = [
    { label: '1M', value: '1mo' },
    { label: '3M', value: '3mo' },
    { label: '6M', value: '6mo' },
    { label: 'YTD', value: 'ytd' },
    { label: '1Y', value: '1y' },
    { label: '2Y', value: '2y' },
    { label: '5Y', value: '5y' }
  ];

  const analyzeStock = async (stockSymbol = null, range = timeRange) => {
    const targetSymbol = stockSymbol || symbol;
    
    if (!targetSymbol.trim()) {
      setError('Please enter a stock symbol');
      return;
    }

    setLoading(true);
    setError('');
    if (!stockSymbol) setAnalysis(null); // Only clear analysis if searching new stock
    setChartData(null);
    setStockInfo(null);
    setActiveSymbol(targetSymbol.toUpperCase());

    if (!recentSymbols.includes(targetSymbol.toUpperCase())) {
      setRecentSymbols(prev => [targetSymbol.toUpperCase(), ...prev.slice(0, 2)]);
    }

    try {
      const chartResponse = await fetch(
        `${API_BASE}/api/chart/${targetSymbol.toUpperCase()}?range=${range}`
      );
      
      if (chartResponse.ok) {
        const chartJson = await chartResponse.json();
        if (chartJson.chart?.result?.[0]) {
          const result = chartJson.chart.result[0];
          const timestamps = result.timestamp;
          const quote = result.indicators.quote[0];
          const meta = result.meta;
          
          setStockInfo({
            symbol: meta.symbol,
            currency: meta.currency,
            exchange: meta.exchangeName,
            currentPrice: meta.regularMarketPrice,
            previousClose: meta.previousClose,
          });
          
          const candles = timestamps.map((time, i) => ({
            date: new Date(time * 1000),
            open: quote.open[i],
            high: quote.high[i],
            low: quote.low[i],
            close: quote.close[i],
            volume: quote.volume[i]
          })).filter(c => c.open !== null);
          
          setChartData(candles);
        }
      }

      // Only fetch analysis if it's a new stock search
      if (!stockSymbol || !analysis) {
        const response = await fetch(`${API_BASE}/api/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ symbol: targetSymbol.toUpperCase() })
        });

        if (!response.ok) {
          if (response.status === 429) {
            setError('Rate limit reached. Chart showing, AI analysis unavailable.');
          }
        } else {
          const data = await response.json();
          if (data.error) {
            setError('AI analysis temporarily unavailable.');
          } else if (data.content && Array.isArray(data.content)) {
            let textContent = '';
            for (const block of data.content) {
              if (block.type === 'text') {
                textContent += block.text + '\n';
              }
            }
            let cleanedText = textContent.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const analysisData = JSON.parse(jsonMatch[0]);
              setAnalysis(analysisData);
              setError('');
            }
          }
        }
      }
    } catch (err) {
      console.error('Error details:', err);
      if (!chartData) {
        setError(`Failed to load: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const changeTimeRange = (range) => {
    setTimeRange(range);
    if (activeSymbol) {
      analyzeStock(activeSymbol, range);
    }
  };

  const LineChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    const prices = data.map(d => d.close);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.05;

    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const priceChange = lastPrice - firstPrice;
    const percentChange = ((priceChange / firstPrice) * 100).toFixed(2);

    // Determine date format based on time range
    const getDateFormat = (date, index, total) => {
      if (timeRange === '1mo') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timeRange === '3mo' || timeRange === '6mo') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    };

    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
            ${lastPrice.toFixed(2)}
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: priceChange >= 0 ? '#4ade80' : '#f87171' }}>
            {priceChange >= 0 ? '+' : ''}{percentChange}%
          </div>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg width="100%" height="300" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((percent) => {
              const y = 20 + 220 * percent;
              const price = maxPrice + pricePadding - (priceRange + 2 * pricePadding) * percent;
              return (
                <g key={percent}>
                  <line x1="0" y1={y} x2="900" y2={y} stroke="#1f2937" strokeWidth="1" />
                  <text x="910" y={y + 4} fontSize="12" fill="#6b7280">
                    ${price.toFixed(2)}
                  </text>
                </g>
              );
            })}

            <path
              d={`
                M 0 ${20 + 220 - ((data[0].close - (minPrice - pricePadding)) / (priceRange + 2 * pricePadding)) * 220}
                ${data.map((d, i) => {
                  const x = (i / (data.length - 1)) * 900;
                  const y = 20 + 220 - ((d.close - (minPrice - pricePadding)) / (priceRange + 2 * pricePadding)) * 220;
                  return `L ${x} ${y}`;
                }).join(' ')}
                L 900 240 L 0 240 Z
              `}
              fill="url(#chartGradient)"
            />
            <path
              d={`
                M 0 ${20 + 220 - ((data[0].close - (minPrice - pricePadding)) / (priceRange + 2 * pricePadding)) * 220}
                ${data.map((d, i) => {
                  const x = (i / (data.length - 1)) * 900;
                  const y = 20 + 220 - ((d.close - (minPrice - pricePadding)) / (priceRange + 2 * pricePadding)) * 220;
                  return `L ${x} ${y}`;
                }).join(' ')}
              `}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
            />

            {data.filter((_, i) => {
              const interval = timeRange === '5y' ? 12 : timeRange === '2y' ? 8 : 6;
              return i % Math.ceil(data.length / interval) === 0 || i === data.length - 1;
            }).map((d, idx) => {
              const i = data.indexOf(d);
              const x = (i / (data.length - 1)) * 900;
              return (
                <text key={idx} x={x} y="270" fontSize="11" fill="#6b7280" textAnchor="middle">
                  {getDateFormat(d.date, i, data.length)}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0a0e1a',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: '#0d1117',
      borderBottom: '1px solid #1f2937',
      padding: '12px 16px',
      position: 'sticky',
      top: 0,
      zIndex: 10
    },
    headerContent: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    headerTop: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    title: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: 'white',
      margin: 0
    },
    buttonGroup: {
      display: 'flex',
      gap: '6px',
      overflowX: 'auto',
      paddingBottom: '4px'
    },
    button: (isActive) => ({
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      border: 'none',
      cursor: loading ? 'not-allowed' : 'pointer',
      backgroundColor: isActive ? '#2563eb' : 'transparent',
      color: isActive ? 'white' : '#9ca3af',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap'
    }),
    timeButton: (isActive) => ({
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      border: 'none',
      cursor: loading ? 'not-allowed' : 'pointer',
      backgroundColor: isActive ? '#1f2937' : 'transparent',
      color: isActive ? 'white' : '#6b7280',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap'
    }),
    searchBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: '#1a1f2e',
      borderRadius: '8px',
      padding: '8px 12px',
      border: '1px solid #374151',
      width: '100%',
      maxWidth: '300px'
    },
    input: {
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      color: 'white',
      flex: 1,
      fontSize: '14px'
    },
    mainContent: {
      padding: '16px'
    },
    chartSection: {
      backgroundColor: '#0d1117',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      border: '1px solid #1f2937'
    },
    chartHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      flexWrap: 'wrap',
      gap: '12px'
    },
    stockTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      margin: 0
    },
    timeRangeButtons: {
      display: 'flex',
      gap: '4px',
      backgroundColor: '#1a1f2e',
      padding: '4px',
      borderRadius: '8px',
      border: '1px solid #374151',
      overflowX: 'auto'
    },
    infoSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    card: {
      backgroundColor: '#0d1117',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid #1f2937'
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '12px',
      fontSize: '16px',
      fontWeight: '600'
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '14px',
      marginBottom: '8px'
    },
    metricGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px'
    },
    metricCard: {
      backgroundColor: '#1a1f2e',
      borderRadius: '8px',
      padding: '10px',
      border: '1px solid #1f2937'
    },
    signalCard: (color) => ({
      backgroundColor: '#1a1f2e',
      borderRadius: '8px',
      padding: '12px',
      borderLeft: `4px solid ${color}`,
      marginBottom: '10px'
    }),
    emptyState: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      flexDirection: 'column',
      textAlign: 'center',
      padding: '20px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={styles.headerTop}>
            <div style={styles.headerLeft}>
              <TrendingUp size={20} color="#3b82f6" />
              <h1 style={styles.title}>Stock Analyzer</h1>
            </div>
            
            <div style={styles.searchBox}>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && analyzeStock()}
                placeholder="AAPL"
                disabled={loading}
                style={styles.input}
              />
              <button onClick={() => analyzeStock()} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {loading ? (
                  <Loader2 size={16} color="#9ca3af" className="animate-spin" />
                ) : (
                  <Search size={16} color="#9ca3af" />
                )}
              </button>
            </div>
          </div>
          
          <div style={styles.buttonGroup}>
            {recentSymbols.map((sym) => (
              <button
                key={sym}
                onClick={() => analyzeStock(sym)}
                disabled={loading}
                style={styles.button(activeSymbol === sym)}
                onMouseEnter={(e) => {
                  if (activeSymbol !== sym) e.target.style.backgroundColor = '#1f2937';
                }}
                onMouseLeave={(e) => {
                  if (activeSymbol !== sym) e.target.style.backgroundColor = 'transparent';
                }}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#0d1117' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ backgroundColor: 'rgba(202, 138, 4, 0.2)', border: '1px solid #a16207', borderRadius: '8px', padding: '12px', color: '#fbbf24', fontSize: '14px' }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {(chartData || analysis) ? (
        <div style={{ ...styles.mainContent, maxWidth: '1200px', margin: '0 auto' }}>
          {/* Chart Section */}
          <div style={styles.chartSection}>
            <div style={styles.chartHeader}>
              <h2 style={styles.stockTitle}>{activeSymbol}</h2>
              
              {/* Time Range Buttons */}
              <div style={styles.timeRangeButtons}>
                {timeRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => changeTimeRange(range.value)}
                    disabled={loading}
                    style={styles.timeButton(timeRange === range.value)}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            
            {chartData ? (
              <LineChart data={chartData} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <Loader2 size={48} color="#3b82f6" className="animate-spin" />
              </div>
            )}
          </div>

          {/* Info Sections */}
          <div style={styles.infoSection}>
            {/* Overview */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <Activity size={18} color="#3b82f6" />
                <h3 style={{ margin: 0 }}>Overview</h3>
              </div>
              <div>
                {[
                  { label: 'Company', value: activeSymbol === 'AAPL' ? 'Apple Inc.' : activeSymbol === 'TSLA' ? 'Tesla Inc.' : activeSymbol === 'MSFT' ? 'Microsoft Corp.' : activeSymbol },
                  { label: 'Exchange', value: stockInfo?.exchange || 'NASDAQ' },
                  { label: 'Sector', value: 'Technology' },
                  { label: 'Industry', value: activeSymbol === 'AAPL' ? 'Consumer Electronics' : activeSymbol === 'TSLA' ? 'Automotive' : 'Software' }
                ].map((item, idx) => (
                  <div key={idx} style={styles.infoRow}>
                    <span style={{ color: '#9ca3af' }}>{item.label}</span>
                    <span style={{ fontWeight: '500' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Metrics */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <BarChart2 size={18} color="#3b82f6" />
                <h3 style={{ margin: 0 }}>Key Metrics</h3>
              </div>
              {analysis ? (
                <div style={styles.metricGrid}>
                  {[
                    { label: 'Market Cap', value: analysis.keyMetrics?.marketCap || 'N/A' },
                    { label: 'P/E Ratio', value: analysis.keyMetrics?.peRatio || 'N/A' },
                    { label: '52W Change', value: analysis.keyMetrics?.['52weekChange'] || 'N/A' },
                    { label: 'Sentiment', value: analysis.sentiment || 'N/A', color: analysis.sentiment === 'POSITIVE' ? '#4ade80' : analysis.sentiment === 'NEGATIVE' ? '#f87171' : '#fbbf24' }
                  ].map((metric, idx) => (
                    <div key={idx} style={styles.metricCard}>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>{metric.label}</div>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: metric.color || 'white' }}>
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ ...styles.metricCard, textAlign: 'center', padding: '24px', gridColumn: '1 / -1' }}>
                  <Loader2 size={32} color="#6b7280" className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Loading...</p>
                </div>
              )}
            </div>

            {/* Trading Signals */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <TrendingUp size={18} color="#3b82f6" />
                <h3 style={{ margin: 0 }}>Trading Signals</h3>
              </div>
              
              {analysis ? (
                <div>
                  <div style={styles.signalCard(analysis.recommendation === 'BUY' ? '#22c55e' : analysis.recommendation === 'SELL' ? '#ef4444' : '#eab308')}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <TrendingUp size={18} color={analysis.recommendation === 'BUY' ? '#4ade80' : analysis.recommendation === 'SELL' ? '#f87171' : '#fbbf24'} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: analysis.recommendation === 'BUY' ? '#4ade80' : analysis.recommendation === 'SELL' ? '#f87171' : '#fbbf24', marginBottom: '4px' }}>
                          {analysis.recommendation} Signal
                        </div>
                        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{analysis.reasoning}</p>
                      </div>
                    </div>
                  </div>

                  {analysis.risks && analysis.risks.length > 0 && (
                    <div style={styles.signalCard('#eab308')}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: '#fbbf24', marginBottom: '6px' }}>Risks</div>
                          <ul style={{ margin: 0, paddingLeft: '16px' }}>
                            {analysis.risks.map((risk, idx) => (
                              <li key={idx} style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {analysis.opportunities && analysis.opportunities.length > 0 && (
                    <div style={styles.signalCard('#22c55e')}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <TrendingUp size={18} color="#4ade80" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: '#4ade80', marginBottom: '6px' }}>Opportunities</div>
                          <ul style={{ margin: 0, paddingLeft: '16px' }}>
                            {analysis.opportunities.map((opp, idx) => (
                              <li key={idx} style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>{opp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ ...styles.metricCard, textAlign: 'center', padding: '24px' }}>
                  <AlertTriangle size={32} color="#eab308" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '12px', margin: '8px 0 12px 0' }}>AI analysis unavailable</p>
                  <button
                    onClick={() => analyzeStock(activeSymbol)}
                    style={{ fontSize: '12px', backgroundColor: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.emptyState}>
          <BarChart2 size={64} color="#4b5563" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '8px' }}>Search for a stock</h2>
          <p style={{ color: '#6b7280', margin: 0 }}>Enter a symbol like AAPL, TSLA, or MSFT</p>
        </div>
      )}
    </div>
  );
}