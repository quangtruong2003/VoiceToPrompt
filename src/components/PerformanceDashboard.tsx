/**
 * Performance Dashboard Component
 * 
 * Real-time monitoring and logging framework for API performance optimization
 */

import { useState, useEffect, useCallback } from 'react'

// Types
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

interface TraceStep {
  name: string
  startMs: number
  endMs: number
  durationMs: number
  optimizationApplied: boolean
  optimizationType?: string
}

interface ExecutionTrace {
  id: string
  timestamp: number
  optimizations: string[]
  steps: TraceStep[]
  totalLatencyMs: number
}

// Helper functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

// Optimization Toggle Component
function OptimizationToggle({ 
  label, 
  enabled, 
  onChange 
}: { 
  label: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <div className="perf-toggle">
      <span className="perf-toggle-label">{label}</span>
      <button 
        className={`perf-toggle-btn ${enabled ? 'enabled' : 'disabled'}`}
        onClick={() => onChange(!enabled)}
      >
        {enabled ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}

// Latency Bar Component
function LatencyBar({ 
  label, 
  value, 
  max, 
  color = '#4CAF50' 
}: { 
  label: string
  value: number
  max: number
  color?: string
}) {
  const percent = Math.min(100, (value / max) * 100)
  
  return (
    <div className="latency-bar">
      <div className="latency-bar-label">
        <span>{label}</span>
        <span>{value.toFixed(1)}ms</span>
      </div>
      <div className="latency-bar-track">
        <div 
          className="latency-bar-fill" 
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// Trace Timeline Component
function TraceTimeline({ trace }: { trace: ExecutionTrace | null }) {
  if (!trace || trace.steps.length === 0) {
    return <div className="trace-empty">No trace available</div>
  }
  
  const totalDuration = trace.steps.reduce((sum, step) => sum + step.durationMs, 0) || 1
  
  return (
    <div className="trace-timeline">
      {trace.steps.map((step, idx) => (
        <div 
          key={idx} 
          className={`trace-step ${step.optimizationApplied ? 'optimized' : ''}`}
        >
          <div className="trace-step-name">{step.name}</div>
          <div className="trace-step-duration">
            {step.durationMs.toFixed(1)}ms
          </div>
          <div 
            className="trace-step-bar"
            style={{ width: `${(step.durationMs / totalDuration) * 100}%` }}
          />
          {step.optimizationApplied && (
            <span className="trace-step-badge">✓</span>
          )}
        </div>
      ))}
    </div>
  )
}

// Main Dashboard Component
export function PerformanceDashboard() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [optimizationStatus, setOptimizationStatus] = useState<OptimizationStatus | null>(null)
  const [latencyMetrics, setLatencyMetrics] = useState<LatencyMetrics | null>(null)
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([])
  const [selectedCall, setSelectedCall] = useState<ExecutionTrace | null>(null)
  const [isEnabled, setIsEnabled] = useState({
    connectionPool: true,
    compression: true,
    caching: true,
    asyncProcessing: true
  })

  // Fetch metrics periodically
  const fetchMetrics = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      const [optStatus, latMetrics, sum, calls] = await Promise.all([
        window.electronAPI.getOptimizationStatus(),
        window.electronAPI.getLatencyMetrics(),
        window.electronAPI.getPerformanceSummary(),
        window.electronAPI.getApiCalls(10)
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
    const interval = setInterval(fetchMetrics, 2000)
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

  const handleViewTrace = async (callId: string) => {
    if (!window.electronAPI) return
    const trace = await window.electronAPI.getExecutionTrace(callId)
    setSelectedCall(trace)
  }

  if (!isExpanded) {
    return (
      <button className="perf-dashboard-collapsed" onClick={() => setIsExpanded(true)}>
        <span className="perf-icon">📊</span>
        <span className="perf-label">Performance</span>
        {latencyMetrics && latencyMetrics.savingsPercent > 0 && (
          <span className="perf-badge">{latencyMetrics.savingsPercent.toFixed(0)}% ↓</span>
        )}
      </button>
    )
  }

  return (
    <div className="perf-dashboard">
      <div className="perf-header">
        <h3>📊 Performance Monitor</h3>
        <button className="perf-close" onClick={() => setIsExpanded(false)}>×</button>
      </div>

      {/* Latency Comparison */}
      <div className="perf-section">
        <h4>Latency Comparison</h4>
        {latencyMetrics && (
          <div className="latency-comparison">
            <div className="latency-before">
              <span className="latency-label">Before (Baseline)</span>
              <span className="latency-value">{latencyMetrics.baselineLatencyMs.toFixed(0)}ms</span>
            </div>
            <div className="latency-arrow">→</div>
            <div className="latency-after">
              <span className="latency-label">After (Optimized)</span>
              <span className="latency-value optimized">{latencyMetrics.totalLatencyMs.toFixed(0)}ms</span>
            </div>
            <div className="latency-savings">
              <span className="savings-value">{latencyMetrics.savingsPercent.toFixed(1)}%</span>
              <span className="savings-label">FASTER</span>
            </div>
          </div>
        )}
      </div>

      {/* Latency Breakdown */}
      <div className="perf-section">
        <h4>Latency Breakdown</h4>
        {latencyMetrics && (
          <div className="latency-breakdown">
            <LatencyBar 
              label="Connection" 
              value={latencyMetrics.connectionLatencyMs} 
              max={latencyMetrics.baselineLatencyMs}
              color="#2196F3"
            />
            <LatencyBar 
              label="DNS/TLS" 
              value={latencyMetrics.tlsHandshakeMs} 
              max={latencyMetrics.baselineLatencyMs}
              color="#9C27B0"
            />
            <LatencyBar 
              label="Request" 
              value={latencyMetrics.requestLatencyMs} 
              max={latencyMetrics.baselineLatencyMs}
              color="#FF9800"
            />
            <LatencyBar 
              label="Response" 
              value={latencyMetrics.responseLatencyMs} 
              max={latencyMetrics.baselineLatencyMs}
              color="#E91E63"
            />
            <LatencyBar 
              label="Processing" 
              value={latencyMetrics.processingLatencyMs} 
              max={latencyMetrics.baselineLatencyMs}
              color="#4CAF50"
            />
          </div>
        )}
      </div>

      {/* Optimization Status */}
      <div className="perf-section">
        <h4>Optimization Features</h4>
        <div className="optimization-toggles">
          <OptimizationToggle 
            label="🔗 Connection Pool"
            enabled={isEnabled.connectionPool}
            onChange={(v) => handleOptimizationToggle('connectionPool', v)}
          />
          <OptimizationToggle 
            label="📦 Compression"
            enabled={isEnabled.compression}
            onChange={(v) => handleOptimizationToggle('compression', v)}
          />
          <OptimizationToggle 
            label="💾 Caching"
            enabled={isEnabled.caching}
            onChange={(v) => handleOptimizationToggle('caching', v)}
          />
          <OptimizationToggle 
            label="⚡ Async Processing"
            enabled={isEnabled.asyncProcessing}
            onChange={(v) => handleOptimizationToggle('asyncProcessing', v)}
          />
        </div>
      </div>

      {/* Optimization Stats */}
      <div className="perf-section">
        <h4>Optimization Statistics</h4>
        {optimizationStatus && (
          <div className="optimization-stats">
            <div className="stat-item">
              <span className="stat-label">Connection Reuse</span>
              <span className="stat-value">
                {optimizationStatus.connectionPool.reuseRatio.toFixed(1)}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Compression Ratio</span>
              <span className="stat-value">
                {optimizationStatus.compression.compressionRatio.toFixed(1)}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cache Hit Rate</span>
              <span className="stat-value">
                {optimizationStatus.caching.hitRatio.toFixed(1)}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Requests</span>
              <span className="stat-value">
                {optimizationStatus.connectionPool.totalRequests}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recent API Calls */}
      <div className="perf-section">
        <h4>Recent API Calls</h4>
        <div className="api-calls-list">
          {apiCalls.length === 0 ? (
            <div className="api-calls-empty">No API calls yet</div>
          ) : (
            apiCalls.map(call => (
              <div 
                key={call.id} 
                className="api-call-item"
                onClick={() => handleViewTrace(call.id)}
              >
                <div className="api-call-info">
                  <span className="api-call-method">{call.method}</span>
                  <span className="api-call-endpoint">{call.endpoint}</span>
                </div>
                <div className="api-call-metrics">
                  <span className={`api-call-status ${call.status >= 200 && call.status < 300 ? 'success' : 'error'}`}>
                    {call.status || 'pending'}
                  </span>
                  <span className="api-call-latency">
                    {call.afterOptimization.totalMs.toFixed(0)}ms
                  </span>
                </div>
                <div className="api-call-optimizations">
                  {call.optimizations.connectionPool && <span className="opt-badge">🔗</span>}
                  {call.optimizations.compression && <span className="opt-badge">📦</span>}
                  {call.optimizations.caching && <span className="opt-badge">💾</span>}
                  {call.optimizations.asyncProcessing && <span className="opt-badge">⚡</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Execution Trace */}
      {selectedCall && (
        <div className="perf-section">
          <h4>Execution Trace</h4>
          <TraceTimeline trace={selectedCall} />
          <div className="trace-optimizations">
            <span>Applied: </span>
            {selectedCall.optimizations.map(opt => (
              <span key={opt} className="trace-opt-badge">{opt}</span>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="perf-section">
        <h4>Session Summary</h4>
        {summary && (
          <div className="summary-stats">
            <div className="summary-item">
              <span className="summary-label">Uptime</span>
              <span className="summary-value">{formatUptime(summary.uptime)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Requests</span>
              <span className="summary-value">{summary.totalRequests}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Success Rate</span>
              <span className="summary-value">
                {summary.totalRequests > 0 
                  ? ((summary.successfulRequests / summary.totalRequests) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Avg Savings</span>
              <span className="summary-value">
                {summary.averageSavingsMs.toFixed(0)}ms ({summary.averageSavingsPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <div className="perf-footer">
        <button className="perf-reset-btn" onClick={handleReset}>
          Reset Metrics
        </button>
      </div>
    </div>
  )
}
