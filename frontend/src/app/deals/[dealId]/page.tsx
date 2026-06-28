'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react'
import { StakeholderGrid, ContextSummaryCard } from '@/components/deal'
import { LoadingSpinner, Badge, Button } from '@/components/ui'
import { dealsApi } from '@/lib/api'
import type { Deal, ContextSummary } from '@/lib/types'

const stageColorMap: Record<string, 'teal' | 'sky' | 'amber' | 'mint' | 'red'> = {
  Discovery: 'teal',
  'Technical Evaluation': 'sky',
  'Legal Review': 'amber',
  Commercial: 'mint',
  'Closed Won': 'mint',
  'Closed Lost': 'red',
}

// Batch 8 builds the provisioning and context view only.
// The event feed (components/events) and buyer coordination panels
// (components/buyer) are Batch 9 and Batch 10 dependencies and are
// intentionally not imported here.
export default function DealDashboardPage({
  params,
}: {
  params: { dealId: string }
}) {
  const { dealId } = params

  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadDeal = useCallback(async () => {
    const res = await dealsApi.get(dealId)
    if (res.success) {
      setDeal(res.data)
      setError(null)
    } else {
      setError(res.message)
    }
  }, [dealId])

  useEffect(() => {
    setLoading(true)
    loadDeal().finally(() => setLoading(false))
  }, [loadDeal])

  // There is no dedicated per stakeholder retry endpoint in the backend yet.
  // Re-fetching the deal record is the correct action available today: it
  // reflects whatever the most recent POST /api/deals provisioning attempt
  // left in Redis. A real retry would need a new backend route (for example
  // POST /api/deals/:dealId/stakeholders/:workspaceId/retry) that re-runs
  // agentInit and agentAccumulate for a single failed workspace.
  async function handleRetry(_workspaceId: string) {
    setRefreshing(true)
    await loadDeal()
    setRefreshing(false)
  }

  // Builds the context summary the dashboard can show today from data the
  // backend already returns. discoveryNotes, openQuestions, resolvedQuestions,
  // and nextActions are not persisted back to Redis by any GET route in
  // Batches 1 through 6, so they render empty until Batch 9 wires the event
  // feed and Batch 6's POST /:dealId/context responses are surfaced here.
  function buildContextSummary(d: Deal): ContextSummary {
    return {
      dealId: d.dealId,
      stage: d.stage,
      discoveryNotes: '',
      openQuestions: [],
      resolvedQuestions: [],
      dealEvents: [],
      nextActions: [],
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" label="Loading deal room..." />
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={18} className="text-red-500" />
        </div>
        <p className="text-sm font-semibold text-teal-900 mb-1">
          Could not load this deal room
        </p>
        <p className="text-xs text-teal-500 mb-6">
          {error ?? `Deal ${dealId} could not be found.`}
        </p>
        <Link
          href="/"
          className="text-xs font-medium text-teal-500 hover:text-teal-700 transition-colors"
        >
          Back to all deals
        </Link>
      </div>
    )
  }

  const failedCount = deal.stakeholders.filter(
    (s) => s.initStatus === 'failed'
  ).length

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-teal-500 hover:text-teal-700 mb-4 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to deals
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-teal-900 tracking-tight">
                {deal.dealName}
              </h1>
              <Badge variant={stageColorMap[deal.stage] ?? 'neutral'}>
                {deal.stage}
              </Badge>
            </div>
            <p className="text-sm text-teal-600">{deal.prospectCompany}</p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => handleRetry('')}
            disabled={refreshing}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Failed provisioning banner */}
      {failedCount > 0 && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-700">
            {failedCount} agent workspace{failedCount > 1 ? 's' : ''} failed to
            provision. Retry from the agent card below, or check the Aicoo API
            key and base URL in the backend environment.
          </p>
        </div>
      )}

      {/* Calendar setup notice */}
      {!deal.calendarEnabled && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            Calendar scheduling is not yet available for this deal. Enable the
            calendar namespace in the Aicoo dashboard, then create a new deal
            or re-provision this one so GET /tools picks up
            calendar.schedule_meeting.
          </p>
        </div>
      )}

      {/* Deal snapshot plus context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="lg:col-span-2">
          <p className="dr-section-title mb-3">Deal Context</p>
          <ContextSummaryCard context={buildContextSummary(deal)} />
        </div>

        <div>
          <p className="dr-section-title mb-3">Deal Snapshot</p>
          <div className="bg-white rounded-xl border border-cream-300 shadow-card p-4 space-y-3">
            <SnapshotRow label="Company" value={deal.prospectCompany} />
            <SnapshotRow label="Stage" value={deal.stage} />
            <SnapshotRow
              label="Agents"
              value={`${deal.stakeholders.length} workspaces`}
            />
            <SnapshotRow
              label="Last Activity"
              value={new Date(deal.lastActivityAt).toLocaleString()}
            />
            <SnapshotRow label="Group ID" value={deal.groupId} mono />
            <SnapshotRow
              label="Calendar"
              value={deal.calendarEnabled ? 'Enabled' : 'Not enabled'}
            />
          </div>
        </div>
      </div>

      {/* Agent provisioning grid: coordination checkbox 1, identity */}
      <div>
        <p className="dr-section-title mb-3">Agent Workspaces</p>
        <StakeholderGrid
          stakeholders={deal.stakeholders}
          onRetry={handleRetry}
        />
      </div>
    </div>
  )
}

function SnapshotRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-cream-100 last:border-0">
      <span className="text-xs text-teal-400">{label}</span>
      <span
        className={`text-xs font-medium text-teal-800 text-right ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}
