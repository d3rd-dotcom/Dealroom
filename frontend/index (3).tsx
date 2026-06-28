'use client'
import { useState } from 'react'
import { Copy, ExternalLink, Calendar, CheckCircle, AlertCircle, Link2, Zap, Clock, Shield } from 'lucide-react'
import { Card, Badge, Button, StatusIndicator, LoadingSpinner, EmptyState } from '../ui'
import type { Stakeholder, PreCallBrief, StakeholderRole } from '@/lib/types'

/* ══════════════════════════════════════════════
   BUYER INVITE PANEL
   ══════════════════════════════════════════════ */

interface BuyerInvitePanelProps {
  dealId:    string
  onInvite:  (name: string, role: StakeholderRole) => Promise<{ shareUrl: string } | null>
}

const BUYER_ROLES: { value: StakeholderRole; label: string }[] = [
  { value: 'buyer_champion',    label: 'Buyer Champion'  },
  { value: 'buyer_legal',       label: 'Legal Contact'   },
  { value: 'buyer_procurement', label: 'Procurement'     },
]

export function BuyerInvitePanel({ dealId, onInvite }: BuyerInvitePanelProps) {
  const [name,     setName]     = useState('')
  const [role,     setRole]     = useState<StakeholderRole>('buyer_champion')
  const [loading,  setLoading]  = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied,   setCopied]   = useState(false)

  async function handleInvite() {
    if (!name.trim()) return
    setLoading(true)
    const result = await onInvite(name.trim(), role)
    if (result?.shareUrl) {
      setShareUrl(result.shareUrl)
    }
    setLoading(false)
  }

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card padding="md">
      <p className="dr-section-title mb-1">Invite Buyer Contact</p>
      <p className="text-xs text-teal-500 mb-4">
        A sandboxed share link is generated via Aicoo. The buyer opens it in a new tab. No iframe embedding.
      </p>

      {!shareUrl ? (
        <div className="space-y-3">
          <div>
            <label className="dr-label">Buyer Name</label>
            <input
              className="dr-input"
              placeholder="e.g. Sam Patel"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="dr-label">Role</label>
            <select
              className="dr-input"
              value={role}
              onChange={e => setRole(e.target.value as StakeholderRole)}
            >
              {BUYER_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Aicoo call preview */}
          <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
            <p className="text-xs font-medium text-teal-700 mb-2">Aicoo API call preview</p>
            <code className="text-xs text-teal-600 font-mono">
              POST /share/create<br />
              {'{'} workspaceId: deal_{dealId}_ae,<br />
              {'  '}permissions: {'{'} notesAccess: read {'}'} {'}'}
            </code>
          </div>

          <Button
            onClick={handleInvite}
            loading={loading}
            disabled={!name.trim()}
            icon={<Link2 size={13} />}
            className="w-full"
          >
            {loading ? 'Generating Share Link...' : 'Generate Invite Link'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 animate-slide-up">
          <div className="flex items-center gap-2 p-3 bg-mint-50 rounded-lg border border-mint-100">
            <CheckCircle size={14} className="text-mint-600 shrink-0" />
            <p className="text-xs font-medium text-mint-700">Share link generated via /share/create</p>
          </div>

          <div>
            <label className="dr-label">Share URL</label>
            <div className="flex items-center gap-2">
              <input
                className="dr-input flex-1 text-teal-700 font-mono text-xs"
                value={shareUrl}
                readOnly
              />
              <button
                onClick={copyLink}
                className="p-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 transition-colors"
                title="Copy link"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium
                         bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Open in New Tab
            </a>
          </div>

          {copied && (
            <p className="text-xs text-mint-600 text-center animate-fade-in">Link copied to clipboard</p>
          )}

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-2">
            <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              This link cannot be embedded in an iframe per Aicoo security policy. Always open in a new tab.
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ══════════════════════════════════════════════
   CONNECTION STATUS PANEL
   ══════════════════════════════════════════════ */

interface ConnectionStatusPanelProps {
  stakeholders: Stakeholder[]
  onConnect:   (workspaceId: string) => Promise<void>
}

export function ConnectionStatusPanel({ stakeholders, onConnect }: ConnectionStatusPanelProps) {
  const buyers = stakeholders.filter(s => s.side === 'buyer')

  if (buyers.length === 0) {
    return (
      <Card padding="md">
        <EmptyState
          icon={<Link2 size={16} />}
          title="No buyer contacts yet"
          message="Invite a buyer contact above to start the agent connection flow."
        />
      </Card>
    )
  }

  return (
    <Card padding="md">
      <p className="dr-section-title mb-4">Agent Connection Status</p>
      <div className="space-y-3">
        {buyers.map(buyer => (
          <BuyerConnectionRow key={buyer.workspaceId} buyer={buyer} onConnect={onConnect} />
        ))}
      </div>

      {/* Aicoo network flow */}
      <div className="mt-4 p-3 bg-cream-100 rounded-lg">
        <p className="text-xs font-medium text-teal-700 mb-2">Aicoo connection flow</p>
        <div className="flex items-center gap-2 text-xs text-teal-500">
          <span className="bg-teal-100 px-2 py-0.5 rounded font-mono">AE Agent</span>
          <span>POST /network/request</span>
          <span className="text-teal-300">→</span>
          <span className="bg-amber-100 px-2 py-0.5 rounded font-mono">Buyer Agent</span>
          <span>POST /network/accept</span>
        </div>
      </div>
    </Card>
  )
}

interface BuyerConnectionRowProps {
  buyer:     Stakeholder
  onConnect: (workspaceId: string) => Promise<void>
}

function BuyerConnectionRow({ buyer, onConnect }: BuyerConnectionRowProps) {
  const [connecting, setConnecting] = useState(false)

  async function handleConnect() {
    setConnecting(true)
    await onConnect(buyer.workspaceId)
    setConnecting(false)
  }

  return (
    <div className="flex items-center justify-between p-3 bg-cream-50 rounded-lg border border-cream-200">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-semibold">
          {buyer.name.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-semibold text-teal-900">{buyer.name}</p>
          <p className="text-xs text-teal-500">{buyer.role.replace(/_/g, ' ')}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusIndicator status={buyer.connectionStatus as any} size="sm" />
        {buyer.connectionStatus === 'share_link_only' && (
          <Button
            size="sm"
            variant="secondary"
            loading={connecting}
            onClick={handleConnect}
            icon={<Zap size={11} />}
          >
            Send Request
          </Button>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   PRE-CALL BRIEFING
   ══════════════════════════════════════════════ */

interface PreCallBriefingProps {
  brief?:   PreCallBrief
  loading?: boolean
  onRefresh:() => void
  role:     StakeholderRole
}

export function PreCallBriefing({ brief, loading, onRefresh, role }: PreCallBriefingProps) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="dr-section-title">Pre-Call Brief</p>
          <p className="text-xs text-teal-500 mt-0.5">
            Generated from accumulated deal context for {role.replace(/_/g, ' ')}.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="py-8">
          <LoadingSpinner label="Generating brief from context..." />
        </div>
      )}

      {!loading && !brief && (
        <EmptyState
          icon={<Shield size={16} />}
          title="Brief not generated"
          message="Click Refresh to generate a pre-call brief from the accumulated deal context."
        />
      )}

      {!loading && brief && (
        <div className="space-y-4 animate-slide-up">
          {/* Deal status */}
          <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
            <p className="text-xs font-semibold text-teal-700 mb-1">Deal Status</p>
            <p className="text-xs text-teal-600">{brief.dealStatus}</p>
          </div>

          {/* Risk flags */}
          {brief.riskFlags.length > 0 && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <AlertCircle size={11} />
                Risk Flags
              </p>
              <ul className="space-y-1">
                {brief.riskFlags.map((flag, i) => (
                  <li key={i} className="text-xs text-red-600">{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Talking points */}
          <div>
            <p className="text-xs font-semibold text-teal-800 mb-2">Suggested Talking Points</p>
            <ul className="space-y-2">
              {brief.suggestedTalkingPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-teal-700 p-2 bg-cream-50 rounded-lg border border-cream-200">
                  <span className="text-teal-400 font-semibold shrink-0">{i + 1}.</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Open questions */}
          {brief.openQuestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-teal-800 mb-2">Open Questions</p>
              <ul className="space-y-1.5">
                {brief.openQuestions.map((q, i) => (
                  <li key={i} className="text-xs text-teal-600 flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0">?</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Last three events */}
          {brief.lastThreeEvents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-teal-800 mb-2">Recent Events</p>
              <ul className="space-y-1.5">
                {brief.lastThreeEvents.map((ev, i) => (
                  <li key={i} className="text-xs text-teal-600 flex items-start gap-1.5">
                    <Clock size={10} className="text-teal-300 mt-0.5 shrink-0" />
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

/* ══════════════════════════════════════════════
   CALENDAR BOOKING
   ══════════════════════════════════════════════ */

interface CalendarBookingProps {
  dealId:          string
  calendarEnabled: boolean
  onBook:          (title: string, startTime: string, durationMinutes: number) => Promise<boolean>
}

export function CalendarBooking({ dealId, calendarEnabled, onBook }: CalendarBookingProps) {
  const [title,    setTitle]    = useState('Legal Review Call')
  const [date,     setDate]     = useState('')
  const [time,     setTime]     = useState('14:00')
  const [duration, setDuration] = useState(30)
  const [booking,  setBooking]  = useState(false)
  const [booked,   setBooked]   = useState(false)

  async function handleBook() {
    if (!date || !time || !title) return
    setBooking(true)
    const startTime = new Date(`${date}T${time}:00`).toISOString()
    const success = await onBook(title, startTime, duration)
    if (success) setBooked(true)
    setBooking(false)
  }

  if (!calendarEnabled) {
    return (
      <Card padding="md">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertCircle size={15} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-teal-900 mb-1">Calendar not enabled</p>
            <p className="text-xs text-teal-600 mb-3">
              The calendar namespace is not active on this workspace. Enable it in the Aicoo dashboard,
              then verify via GET /tools before scheduling.
            </p>
            <a
              href="https://www.aicoo.io/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-800"
            >
              <ExternalLink size={11} />
              Open Aicoo Dashboard
            </a>
          </div>
        </div>
      </Card>
    )
  }

  if (booked) {
    return (
      <Card padding="md" className="border-mint-200 bg-mint-50">
        <div className="flex items-center gap-3">
          <CheckCircle size={20} className="text-mint-600" />
          <div>
            <p className="text-sm font-semibold text-mint-800">Meeting booked</p>
            <p className="text-xs text-mint-600 mt-0.5">
              Scheduled via calendar.schedule_meeting tool. Invites sent to all attendees.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-1">
        <Calendar size={14} className="text-teal-500" />
        <p className="dr-section-title">Schedule Next Step</p>
      </div>
      <p className="text-xs text-teal-500 mb-4">
        Booking is executed via the calendar.schedule_meeting tool in the agent workspace.
      </p>

      <div className="space-y-3">
        <div>
          <label className="dr-label">Meeting Title</label>
          <input
            className="dr-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Legal Review Call"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="dr-label">Date</label>
            <input
              type="date"
              className="dr-input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="dr-label">Time</label>
            <input
              type="time"
              className="dr-input"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="dr-label">Duration</label>
          <select className="dr-input" value={duration} onChange={e => setDuration(Number(e.target.value))}>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
          </select>
        </div>

        <Button
          onClick={handleBook}
          loading={booking}
          disabled={!date || !time || !title}
          icon={<Calendar size={13} />}
          className="w-full"
        >
          {booking ? 'Booking via Agent...' : 'Book Meeting'}
        </Button>
      </div>
    </Card>
  )
}
