import { useState, useEffect, useCallback, useMemo } from 'react'

interface OptimizationStatus {
  connectionPool: {
    enabled: boolean
    activeConnections: number
    idleConnections: number
    totalRequests: number
    reusedConnections: number
    reuseRatio: number
  }
  compression: {
    enabled: boolean
    algorithm: string
    originalSize: number
    compressedSize: number
    compressionRatio: number
  }
  caching: {
    enabled: boolean
    cacheHits: number
    cacheMisses: number
    hitRatio: number
    cachedResponses: number
  }
  asyncProcessing: {
    enabled: boolean
    parallelStreams: number
    nonBlockingIO: boolean
    workerThreads: number
  }
}

interface LatencyMetrics {
  totalLatencyMs: number
  connectionLatencyMs: number
  dnsLookupMs: number
  tlsHandshakeMs: number
  requestLatencyMs: number
  responseLatencyMs: number
  processingLatencyMs: number
  baselineLatencyMs: number
  savingsMs: number
  savingsPercent: number
}

interface PerformanceSummary {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageLatencyMs: number
  averageSavingsMs: number
  averageSavingsPercent: number
  optimizationEffectiveness: {
    connectionPool: number
    compression: number
    caching: number
    asyncProcessing: number
  }
  uptime: number
}

interface ApiCall {
  id: string
  timestamp: number
  endpoint: string
  method: string
  status: number
  beforeOptimization: {
    connectionMs: number
    compressionMs: number
    processingMs: number
    totalMs: number
  }
  afterOptimization: {
    connectionMs: number
    compressionMs: number
    processingMs: number
    totalMs: number
  }
  optimizations: {
    connectionPool: boolean
    compression: boolean
    caching: boolean
    asyncProcessing: boolean
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

function MiniBarChart({ data, maxValue, color = '#6366f1', height = 60 }: {
  data: number[],
  maxValue: number,
  color?: string,
  height?: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: `${height}px` }}>
      {data.map((value, idx) => (
        <div
          key={idx}
          style={{
            flex: 1,
            height: `${Math.max(4, (value / maxValue) * 100)}%`,
            backgroundColor: color,
            borderRadius: '2px 2px 0 0',
            opacity: 0.7 + (idx / data.length) * 0.3,
            minHeight: '4px'
          }}
          title={`${value.toFixed(1)}ms`}
        />
      ))}
    </div>
  )
}

function LatencyDonutChart({
  segments,
  size = 120,
  thickness = 12
}: {
  segments: { value: number, color: string, label: string }[],
  size?: number,
  thickness?: number
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let currentPercent = 0

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={thickness}
        />
        {segments.map((segment, idx) => {
          const percent = total > 0 ? segment.value / total : 0
          const dashLength = percent * circumference
          const dashOffset = (currentPercent / 100) * circumference
          currentPercent += percent * 100
          return (
            <circle
              key={idx}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={segment.color} strokeWidth={thickness}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'all 0.3s ease' }}
            />
          )
        })}
      </svg>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', textAlign: 'center'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {total.toFixed(0)}ms
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Total</div>
      </div>
    </div>
  )
}

function ApiCallDetail({ call, onClose }: { call: ApiCall, onClose: () => void }) {
  const segments = [
    { value: call.afterOptimization.connectionMs, color: '#2196F3', label: 'Connection' },
    { value: call.afterOptimization.compressionMs, color: '#9C27B0', label: 'Compression' },
    { value: call.afterOptimization.processingMs, color: '#4CAF50', label: 'Processing' },
  ]

  return (
    <div className="perf-modal-overlay" onClick={onClose}>
      <div className="perf-modal" onClick={e => e.stopPropagation()}>
        <div className="perf-modal-header">
          <h3>API Call Details</h3>
          <button className="perf-modal-close" onClick={onClose}>x</button>
        </div>
        <div className="perf-modal-body">
          <div className="perf-detail-grid">
            <div className="perf-detail-item">
              <span className="perf-detail-label">Endpoint</span>
              <span className="perf-detail-value">{call.endpoint}</span>
            </div>
            <div className="perf-detail-item">
              <span className="perf-detail-label">Method</span>
              <span className="perf-detail-value method">{call.method}</span>
            </div>
            <div className="perf-detail-item">
              <span className="perf-detail-label">Status</span>
              <span className={`perf-detail-value status ${call.status >= 200 && call.status < 300 ? 'success' : 'error'}`}>
                {call.status}
              </span>
            </div>
            <div className="perf-detail-item">
              <span className="perf-detail-label">Time</span>
              <span className="perf-detail-value">{formatTime(call.timestamp)}</span>
            </div>
          </div>
          <div className="perf-detail-chart">
            <h4>Latency Breakdown</h4>
            <LatencyDonutChart segments={segments} />
          </div>
          <div className="perf-detail-legend">
            {segments.map((s, i) => (
              <div key={i} className="perf-legend-item">
                <span className="perf-legend-dot" style={{ backgroundColor: s.color }} />
                <span>{s.label}: {s.value.toFixed(1)}ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PerformanceDashboard() {
  const [optimizationStatus, setOptimizationStatus] = useState<OptimizationStatus | null>(null)
  const [latencyMetrics, setLatencyMetrics] = useState<LatencyMetrics | null>(null)
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([])
  const [selectedCall, setSelectedCall] = useState<ApiCall | null>(null)
  const [isEnabled, setIsEnabled] = useState({
    connectionPool: true,
    compression: true,
    caching: true,
    asyncProcessing: true
  })

  const chartData = useMemo(() => {
    return apiCalls.slice(-20).map(c => c.afterOptimization.totalMs)
  }, [apiCalls])

  const fetchMetrics = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      const [optStatus, latMetrics, sum, calls] = await Promise.all([
        window.electronAPI.getOptimizationStatus(),
        window.electronAPI.getLatencyMetrics(),
        window.electronAPI.getPerformanceSummary(),
        window.electronAPI.getApiCalls(50)
      ])
      setOptimizationStatus(optStatus)
      setLatencyMetrics(latMetrics)
      setSummary(sum)
      setApiCalls(calls)
    } catch (err) {
      console.error('Failed to fetch performance metrics:', err)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 3000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  const handleOptimizationToggle = async (key: keyof typeof isEnabled, enabled: boolean) => {
    if (!window.electronAPI) return
    const newState = { ...isEnabled, [key]: enabled }
    setIsEnabled(newState)
    await window.electronAPI.setOptimizationFeatures(newState)
    await fetchMetrics()
  }

  const handleReset = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.resetPerformanceMetrics()
    await fetchMetrics()
  }

  const latencySegments = latencyMetrics ? [
    { value: latencyMetrics.connectionLatencyMs, color: '#2196F3', label: 'Connection' },
    { value: latencyMetrics.tlsHandshakeMs, color: '#9C27B0', label: 'TLS' },
    { value: latencyMetrics.requestLatencyMs, color: '#FF9800', label: 'Request' },
    { value: latencyMetrics.responseLatencyMs, color: '#E91E63', label: 'Response' },
    { value: latencyMetrics.processingLatencyMs, color: '#4CAF50', label: 'Processing' },
  ] : []

  const successRate = summary && summary.totalRequests > 0
    ? ((summary.successfulRequests / summary.totalRequests) * 100).toFixed(1)
    : '0'

  return (
    <div className="settings-content-panel">
      <h2 className="content-panel-title">Performance</h2>

      {/* Overview Stats - 2x2 grid */}
      <div className="list-grouped-card">
        <div className="list-grouped-item" style={{ borderBottom: '1px solid var(--border-section)' }}>
          <div className="list-item-left" style={{ flex: '0 0 auto' }}>
            <span className="list-item-label">Overview</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="list-item-hint">Uptime: {summary ? formatUptime(summary.uptime) : '--'}</span>
          </div>
        </div>
        <div className="list-grouped-item no-border">
          <div className="perf-overview-grid">
            <div className="perf-overview-item">
              <div className="perf-overview-icon" style={{ color: 'var(--accent)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
              <div className="perf-overview-value" style={{ color: 'var(--accent)' }}>{summary?.totalRequests || 0}</div>
              <div className="perf-overview-label">Total Requests</div>
            </div>
            <div className="perf-overview-item">
              <div className="perf-overview-icon" style={{ color: 'var(--success)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div className="perf-overview-value" style={{ color: 'var(--success)' }}>{successRate}%</div>
              <div className="perf-overview-label">Success Rate</div>
            </div>
            <div className="perf-overview-item">
              <div className="perf-overview-icon" style={{ color: 'var(--warning)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <div className="perf-overview-value" style={{ color: 'var(--warning)' }}>{latencyMetrics?.totalLatencyMs.toFixed(0) || 0}<span className="perf-overview-unit">ms</span></div>
              <div className="perf-overview-label">Avg Latency</div>
            </div>
            <div className="perf-overview-item">
              <div className="perf-overview-icon" style={{ color: '#4CAF50' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-10h-9l1-8z" /></svg>
              </div>
              <div className="perf-overview-value" style={{ color: '#4CAF50' }}>{latencyMetrics?.savingsPercent.toFixed(0) || 0}<span className="perf-overview-unit">%</span></div>
              <div className="perf-overview-label">Time Saved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Latency Analysis */}
      <div className="list-grouped-card">
        <div className="list-grouped-item">
          <div className="list-item-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            <span className="list-item-label">Latency Analysis</span>
          </div>
        </div>
        <div className="list-grouped-item no-border">
          {latencyMetrics ? (
            <div className="perf-latency-layout">
              <div className="perf-latency-chart-wrap">
                <LatencyDonutChart segments={latencySegments} size={130} thickness={13} />
              </div>
              <div className="perf-latency-details">
                {latencySegments.map((seg, idx) => (
                  <div key={idx} className="perf-latency-row">
                    <span className="perf-latency-dot" style={{ backgroundColor: seg.color }} />
                    <span className="perf-latency-name">{seg.label}</span>
                    <span className="perf-latency-ms">{seg.value.toFixed(1)}ms</span>
                    <div className="perf-latency-bar-bg">
                      <div
                        className="perf-latency-bar-fill"
                        style={{
                          width: `${latencyMetrics.baselineLatencyMs > 0 ? (seg.value / latencyMetrics.baselineLatencyMs) * 100 : 0}%`,
                          backgroundColor: seg.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="perf-empty-state">No latency data yet</div>
          )}
        </div>
      </div>

      {/* API Usage History */}
      <div className="list-grouped-card">
        <div className="list-grouped-item">
          <div className="list-item-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2">
              <path d="M4 12h8M4 18V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
            </svg>
            <span className="list-item-label">API Usage</span>
          </div>
          <span className="list-item-hint">{chartData.length} requests</span>
        </div>

        {chartData.length > 0 && (
          <div className="list-grouped-item" style={{ flexDirection: 'column', gap: 6 }}>
            <MiniBarChart
              data={chartData}
              maxValue={Math.max(...chartData, 100)}
              color="var(--accent)"
              height={70}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', width: '100%' }}>
              <span>Last {chartData.length} requests</span>
              <span>Latency (ms)</span>
            </div>
          </div>
        )}

        <div className="list-grouped-item no-border" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {apiCalls.length === 0 ? (
            <div className="perf-empty-state">No API calls recorded</div>
          ) : (
            <div className="perf-api-list-compact">
              {apiCalls.slice(0, 6).map(call => (
                <div
                  key={call.id}
                  className="perf-api-row"
                  onClick={() => setSelectedCall(call)}
                >
                  <span className="perf-api-method-badge">{call.method}</span>
                  <span className="perf-api-endpoint-text">{call.endpoint.split('/').pop()}</span>
                  <span className={`perf-api-status-dot ${call.status >= 200 && call.status < 300 ? 'success' : 'error'}`}>
                    {call.status || '...'}
                  </span>
                  <span className="perf-api-latency-text">{call.afterOptimization.totalMs.toFixed(0)}ms</span>
                  <span className="perf-api-time-text">{formatTimeAgo(call.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Optimization Features */}
      <div className="list-grouped-card">
        <div className="list-grouped-item">
          <div className="list-item-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="list-item-label">Optimization Features</span>
          </div>
        </div>

        {[
          { key: 'connectionPool' as const, label: 'Connection Pool', hint: 'Reuse HTTP connections to reduce latency' },
          { key: 'compression' as const, label: 'Compression', hint: 'Compress request/response data' },
          { key: 'caching' as const, label: 'Caching', hint: 'Cache API responses for repeated requests' },
          { key: 'asyncProcessing' as const, label: 'Async Processing', hint: 'Process requests asynchronously' },
        ].map((opt, idx, arr) => (
          <div key={opt.key} className={`list-grouped-item ${idx === arr.length - 1 ? 'no-border' : ''}`}>
            <div className="list-item-left">
              <span className="list-item-label">{opt.label}</span>
              <span className="list-item-hint">{opt.hint}</span>
            </div>
            <button
              className={`toggle-switch ${isEnabled[opt.key] ? 'active' : ''}`}
              onClick={() => handleOptimizationToggle(opt.key, !isEnabled[opt.key])}
              role="switch"
              aria-checked={isEnabled[opt.key]}
            >
              <span className="toggle-slider" />
            </button>
          </div>
        ))}
      </div>

      {/* Optimization Statistics */}
      {optimizationStatus && (
        <div className="list-grouped-card">
          <div className="list-grouped-item">
            <div className="list-item-left" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
              <span className="list-item-label">Statistics</span>
            </div>
          </div>
          <div className="list-grouped-item no-border">
            <div className="perf-stats-compact">
              <div className="perf-stat-mini">
                <div className="perf-stat-mini-value">{optimizationStatus.connectionPool.reuseRatio.toFixed(1)}%</div>
                <div className="perf-stat-mini-label">Connection Reuse</div>
                <div className="perf-stat-mini-bar">
                  <div style={{ width: `${optimizationStatus.connectionPool.reuseRatio}%`, backgroundColor: '#2196F3' }} />
                </div>
              </div>
              <div className="perf-stat-mini">
                <div className="perf-stat-mini-value">{optimizationStatus.compression.compressionRatio.toFixed(1)}%</div>
                <div className="perf-stat-mini-label">Compression Ratio</div>
                <div className="perf-stat-mini-bar">
                  <div style={{ width: `${Math.min(100, optimizationStatus.compression.compressionRatio)}%`, backgroundColor: '#9C27B0' }} />
                </div>
              </div>
              <div className="perf-stat-mini">
                <div className="perf-stat-mini-value">{optimizationStatus.caching.hitRatio.toFixed(1)}%</div>
                <div className="perf-stat-mini-label">Cache Hit Rate</div>
                <div className="perf-stat-mini-bar">
                  <div style={{ width: `${optimizationStatus.caching.hitRatio}%`, backgroundColor: '#4CAF50' }} />
                </div>
              </div>
              <div className="perf-stat-mini">
                <div className="perf-stat-mini-value">{optimizationStatus.connectionPool.totalRequests}</div>
                <div className="perf-stat-mini-label">Total Processed</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset */}
      <div className="list-grouped-card">
        <div className="list-grouped-item no-border" style={{ justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={handleReset} style={{ width: '100%', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
            </svg>
            Reset Metrics
          </button>
        </div>
      </div>

      {selectedCall && (
        <ApiCallDetail call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  )
}
