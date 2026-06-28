'use client'
import { useState } from 'react'
import { RefreshCw, User, Shield, Wrench, Crown, Building2, CheckCircle2 } from 'lucide-react'
import { Card, Badge, StatusIndicator, Button, EmptyState, Divider } from '../ui'
import type { Stakeholder, ContextSummary, DealEvent } from '@/lib/types'

/* ══════════════════════════════════════════════
   ROLE META
   ══════════════════════════════════════════════ */

const roleMeta: Record<string, { label: string; icon: typeof User; color: string; bg: string }> = {
  ae:                { label: 'Account Executive', icon: Crown,    color: 'text-teal-600',  bg: 'bg-teal-50'  },
  se:                { label: 'Sales Engineer',    icon: Wrench,   color: 'text-sky-600',   bg: 'bg-sky-50'   },
  seller_legal:      { label: 'Legal Contact',     icon: Shield,   color: 'text-mint-700',  bg: 'bg-mint-50'  },
  buyer_champion:    { label: 'Buyer Champion',    icon: Building2,color: 'text-amber-600', bg: 'bg-amber-50' },
  buyer_legal:       { label: 'Buyer Legal',       icon: Shield,   color: 'text-amber-600', bg: 'bg-amber-50' },
  buyer_procurement: { label: 'Procurement',       icon: User,     color: 'text-amber-600', bg: 'bg-amber-50' },
}

/* ══════════════════════════════════════════════
   AGENT STATUS CARD
   ══════════════════════════════════════════════ */

interface AgentStatusCardProps {
  stakeholder: Stakeholder
  onRetry?:   (workspaceId: string) => void
}

export function AgentStatusCard({ stakeholder, onRetry }: AgentStatusCardProps) {
  const meta = roleMeta[stakeholder.role] ?? {
    label: stakeholder.role,
    icon: User,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  }
  const Icon = meta.icon

  return (
    <div className="bg-white rounded-xl border border-cream-300 shadow-card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl ${meta.bg} flex items-center justify-center`}>
            <Icon size={15} className={meta.color} />
          </div>
          <div>
            <p className="text-xs font-semibold text-teal-900">{stakeholder.name}</p>
            <p className="text-xs text-teal-500">{meta.label}</p>
          </div>
        </div>

        {stakeholder.initStatus === 'failed' && onRetry && (
          <button
            onClick={() => onRetry(stakeholder.workspaceId)}
            className="p-1 text-teal-300 hover:text-teal-500 transition-colors"
            title="Retry provisioning"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>

      <Divider />

      {/* Workspace ID */}
      <div>
        <p className="text-xs text-teal-400 mb-1">Workspace ID</p>
        <code className="text-xs font-mono text-teal-700 bg-cream-100 px-2 py-0.5 rounded">
          {stakeholder.workspaceId}
        </code>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <StatusIndicator
          status={stakeholder.initStatus === 'failed' ? 'failed' : stakeholder.connectionStatus as any}
          size="sm"
        />
        <Badge
          variant={stakeholder.side === 'seller' ? 'teal' : 'amber'}
        >
          {stakeholder.side}
        </Badge>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   STAKEHOLDER GRID
   ══════════════════════════════════════════════ */

interface StakeholderGridProps {
  stakeholders: Stakeholder[]
  onRetry?:     (workspaceId: string) => void
}

export function StakeholderGrid({ stakeholders, onRetry }: StakeholderGridProps) {
  const sellers = stakeholders.filter(s => s.side === 'seller')
  const buyers  = stakeholders.filter(s => s.side === 'buyer')

  return (
    <div className="space-y-5">
      {/* Seller side */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="dr-eyebrow">Seller Team</p>
          <span className="text-xs text-teal-400">({sellers.length} agents)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sellers.map(s => (
            <AgentStatusCard key={s.workspaceId} stakeholder={s} onRetry={onRetry} />
          ))}
        </div>
      </div>

      {/* Buyer side */}
      {buyers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="dr-eyebrow">Buyer Team</p>
            <span className="text-xs text-teal-400">({buyers.length} agents)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {buyers.map(s => (
              <AgentStatusCard key={s.workspaceId} stakeholder={s} onRetry={onRetry} />
            ))}
          </div>
        </div>
      )}

      {buyers.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-cream-300 p-6 text-center">
          <p className="text-xs font-medium text-teal-500 mb-1">No buyer agents connected yet</p>
          <p className="text-xs text-teal-400">Invite buyer contacts from the Coordination tab.</p>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   CONTEXT SUMMARY CARD
   ══════════════════════════════════════════════ */

interface ContextSummaryCardProps {
  context:   ContextSummary
  onRefresh?: () => void
}

const categoryColors: Record<string, 'teal' | 'sky' | 'mint' | 'amber' | 'red'> = {
  legal:        'amber',
  technical:    'sky',
  commercial:   'teal',
  relationship: 'mint',
  escalation:   'red',
}

export function ContextSummaryCard({ context, onRefresh }: ContextSummaryCardProps) {
  const [showAll, setShowAll] = useState(false)

  const recentEvents = showAll ? context.dealEvents : context.dealEvents.slice(0, 3)

  return (
    <div className="space-y-4">

      {/* Next Actions */}
      {context.nextActions.length > 0 && (
        <Card padding="md">
          <p className="dr-section-title mb-3">Next Actions</p>
          <ul className="space-y-2">
            {context.nextActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-teal-700">
                <CheckCircle2 size={13} className="text-mint-500 mt-0.5 shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Open Questions */}
      {context.openQuestions.length > 0 && (
        <Card padding="md">
          <p className="dr-section-title mb-3">
            Open Questions
            <span className="ml-2 text-xs font-normal text-teal-400">
              ({context.openQuestions.length} unresolved)
            </span>
          </p>
          <ul className="space-y-2">
            {context.openQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-teal-700 p-2 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-amber-400 font-semibold shrink-0">Q</span>
                {q}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Discovery Notes */}
      {context.discoveryNotes && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <p className="dr-section-title">Discovery Notes</p>
            {onRefresh && (
              <button onClick={onRefresh} className="text-teal-300 hover:text-teal-500 transition-colors">
                <RefreshCw size={12} />
              </button>
            )}
          </div>
          <p className="text-xs text-teal-700 leading-relaxed">{context.discoveryNotes}</p>
        </Card>
      )}

      {/* Event Timeline */}
      {context.dealEvents.length > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <p className="dr-section-title">Event Timeline</p>
            <span className="text-xs text-teal-400">{context.dealEvents.length} events</span>
          </div>
          <div className="space-y-3">
            {recentEvents.map((event) => (
              <TimelineEvent key={event.eventId} event={event} />
            ))}
          </div>
          {context.dealEvents.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-teal-500 hover:text-teal-700 mt-3 transition-colors"
            >
              {showAll ? 'Show less' : `Show ${context.dealEvents.length - 3} more`}
            </button>
          )}
        </Card>
      )}
    </div>
  )
}

function TimelineEvent({ event }: { event: DealEvent }) {
  const color = categoryColors[event.category] ?? 'neutral'

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
          event.status === 'resolved' ? 'bg-mint-500' :
          event.status === 'escalated' ? 'bg-red-400' :
          'bg-amber-400'
        }`} />
        <div className="w-px flex-1 bg-cream-300 mt-1" />
      </div>
      <div className="pb-3 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={color}>{event.category}</Badge>
          <span className="text-xs text-teal-400">
            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-xs text-teal-700">{event.summary}</p>
        <p className="text-xs text-teal-400 mt-0.5">Routed to {event.routedTo}</p>
      </div>
    </div>
  )
}
