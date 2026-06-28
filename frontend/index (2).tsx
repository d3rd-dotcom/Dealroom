'use client'
import { useState } from 'react'
import { Send, Zap, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, Badge, Button, EmptyState, LoadingSpinner } from '../ui'
import type { DealEvent, Classification, EventCategory, StakeholderRole, RoutingDecision } from '@/lib/types'

/* ══════════════════════════════════════════════
   CATEGORY CONFIG
   ══════════════════════════════════════════════ */

const categoryConfig: Record<EventCategory, {
  label: string
  color: 'teal' | 'sky' | 'mint' | 'amber' | 'red'
  routeLabel: string
}> = {
  legal:        { label: 'Legal',        color: 'amber', routeLabel: 'Legal Contact'     },
  technical:    { label: 'Technical',    color: 'sky',   routeLabel: 'Sales Engineer'    },
  commercial:   { label: 'Commercial',   color: 'teal',  routeLabel: 'Account Executive' },
  relationship: { label: 'Relationship', color: 'mint',  routeLabel: 'Account Executive' },
  escalation:   { label: 'Escalation',   color: 'red',   routeLabel: 'Full Team'         },
}

/* ══════════════════════════════════════════════
   CLASSIFICATION CARD
   ══════════════════════════════════════════════ */

interface ClassificationCardProps {
  classification:  Classification
  routingDecision: RoutingDecision
  eventId:         string
  onConfirm:       (eventId: string, target: string) => Promise<void>
  onOverride:      (eventId: string, target: string) => void
}

const ROUTING_OPTIONS = [
  { value: 'deal_42_seller_legal_coo',  label: 'Legal Contact'     },
  { value: 'deal_42_se_coo',            label: 'Sales Engineer'    },
  { value: 'deal_42_ae_coo',            label: 'Account Executive' },
  { value: 'group:deal_42',             label: 'Full Team'         },
]

export function ClassificationCard({
  classification,
  routingDecision,
  eventId,
  onConfirm,
  onOverride,
}: ClassificationCardProps) {
  const [confirming, setConfirming] = useState(false)
  const [override,   setOverride]   = useState('')
  const cfg = categoryConfig[classification.category]

  const confidencePct  = Math.round(classification.confidence * 100)
  const confidenceColor =
    classification.confidence >= 0.80 ? 'bg-mint-500' :
    classification.confidence >= 0.60 ? 'bg-amber-400' :
    'bg-red-400'

  async function handleConfirm() {
    setConfirming(true)
    const target = override || `deal_42_${
      classification.category === 'legal' ? 'seller_legal_coo' :
      classification.category === 'technical' ? 'se_coo' : 'ae_coo'
    }`
    await onConfirm(eventId, target)
    setConfirming(false)
  }

  return (
    <Card padding="md" className="border-l-4 border-l-teal-400 animate-slide-up">
      {/* Routing decision label */}
      <div className="flex items-center gap-2 mb-3">
        {routingDecision === 'auto_routed' ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-mint-600 bg-mint-50 px-2 py-0.5 rounded-full">
            <Zap size={10} />
            Auto-routed
          </span>
        ) : routingDecision === 'human_confirmed' ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            <CheckCircle size={10} />
            Confirm routing
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            <AlertTriangle size={10} />
            Manual routing required
          </span>
        )}
        <Badge variant={cfg.color}>{cfg.label}</Badge>
      </div>

      {/* Summary */}
      <p className="text-sm text-teal-900 font-medium mb-1">{classification.summary}</p>
      <p className="text-xs text-teal-500 mb-4">{classification.suggestedAction}</p>

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-teal-500">Classification confidence</span>
          <span className="text-xs font-semibold text-teal-700">{confidencePct}%</span>
        </div>
        <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${confidenceColor}`}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      {/* Suggested routing */}
      <div className="flex items-center justify-between p-2.5 bg-cream-100 rounded-lg mb-3">
        <span className="text-xs text-teal-600">Route to</span>
        <div className="flex items-center gap-1.5">
          <ChevronRight size={10} className="text-teal-400" />
          <span className="text-xs font-semibold text-teal-800">{cfg.routeLabel}</span>
        </div>
      </div>

      {/* Override selector (for human_confirmed or manual_required) */}
      {(routingDecision === 'human_confirmed' || routingDecision === 'manual_required') && (
        <div className="mb-3">
          <label className="dr-label">Override routing target</label>
          <select
            className="dr-input"
            value={override}
            onChange={e => setOverride(e.target.value)}
          >
            <option value="">Use suggested target</option>
            {ROUTING_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Actions */}
      {routingDecision !== 'auto_routed' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleConfirm}
            loading={confirming}
            className="flex-1"
          >
            {confirming ? 'Routing...' : 'Confirm and Route'}
          </Button>
        </div>
      )}
    </Card>
  )
}

/* ══════════════════════════════════════════════
   SEND EVENT FORM
   ══════════════════════════════════════════════ */

interface SendEventFormProps {
  dealId: string
  onSend: (message: string) => Promise<void>
}

export function SendEventForm({ dealId, onSend }: SendEventFormProps) {
  const [message,  setMessage]  = useState('')
  const [sending,  setSending]  = useState(false)

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    await onSend(message.trim())
    setMessage('')
    setSending(false)
  }

  return (
    <div className="bg-white rounded-xl border border-cream-300 shadow-card p-4">
      <p className="dr-section-title mb-3">Send Deal Event</p>
      <p className="text-xs text-teal-500 mb-3">
        Paste a message from any deal stakeholder. The AI classification layer will route it to the right agent.
      </p>
      <textarea
        className="dr-input resize-none mb-3"
        rows={3}
        placeholder="e.g. Our legal team needs to review the data processing agreement before we can proceed."
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSend}
          loading={sending}
          disabled={!message.trim()}
          icon={<Send size={12} />}
        >
          {sending ? 'Classifying...' : 'Classify and Route'}
        </Button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   EVENT FEED
   ══════════════════════════════════════════════ */

interface EventFeedProps {
  events:     DealEvent[]
  loading?:   boolean
  onConfirm?: (eventId: string, target: string) => Promise<void>
  onSend:     (message: string) => Promise<void>
  dealId:     string
}

export function EventFeed({ events, loading, onConfirm, onSend, dealId }: EventFeedProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <SendEventForm dealId={dealId} onSend={onSend} />

      {loading && (
        <div className="py-8">
          <LoadingSpinner label="Classifying event..." />
        </div>
      )}

      {events.length === 0 && !loading && (
        <EmptyState
          icon={<Send size={18} />}
          title="No events yet"
          message="Send your first deal event above to see the AI classification and routing in action."
        />
      )}

      <div className="space-y-3">
        {events.map(event => (
          <EventRow
            key={event.eventId}
            event={event}
            expanded={expanded === event.eventId}
            onToggle={() => setExpanded(expanded === event.eventId ? null : event.eventId)}
            onConfirm={onConfirm}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Event Row ──────────────────────────────── */

interface EventRowProps {
  event:     DealEvent
  expanded:  boolean
  onToggle:  () => void
  onConfirm?: (eventId: string, target: string) => Promise<void>
}

function EventRow({ event, expanded, onToggle, onConfirm }: EventRowProps) {
  const cfg = categoryConfig[event.category] ?? categoryConfig.relationship

  const statusIcon =
    event.status === 'resolved'  ? <CheckCircle size={12} className="text-mint-500" /> :
    event.status === 'escalated' ? <AlertTriangle size={12} className="text-red-400" /> :
    event.status === 'responded' ? <CheckCircle size={12} className="text-sky-400" /> :
    <Clock size={12} className="text-amber-400" />

  return (
    <div className="bg-white rounded-xl border border-cream-300 shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-cream-50 transition-colors"
      >
        <Badge variant={cfg.color}>{cfg.label}</Badge>
        <p className="flex-1 text-xs font-medium text-teal-900 truncate">{event.summary}</p>
        <div className="flex items-center gap-2 shrink-0">
          {statusIcon}
          <span className="text-xs text-teal-400">
            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {expanded ? <ChevronDown size={12} className="text-teal-300" /> : <ChevronRight size={12} className="text-teal-300" />}
        </div>
      </button>

      {expanded && event.classification && (
        <div className="px-4 pb-4 border-t border-cream-200">
          <ClassificationCard
            classification={event.classification}
            routingDecision={event.routingDecision ?? 'auto_routed'}
            eventId={event.eventId}
            onConfirm={onConfirm ?? (async () => {})}
            onOverride={() => {}}
          />
        </div>
      )}
    </div>
  )
}
