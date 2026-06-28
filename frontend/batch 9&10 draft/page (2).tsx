'use client'
import { useState, useEffect, useCallback } from 'react'
import { Users, Route, Database, GitMerge, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react'
import { StakeholderGrid, ContextSummaryCard } from '@/components/deal'
import { EventFeed } from '@/components/events'
import { BuyerInvitePanel, ConnectionStatusPanel, PreCallBriefing, CalendarBooking } from '@/components/buyer'
import { Badge, LoadingSpinner } from '@/components/ui'
import type { Deal, ContextSummary, DealEvent, PreCallBrief, StakeholderRole } from '@/lib/types'
import { dealsApi, eventsApi, buyerApi, coordinationApi } from '@/lib/api'

/* ─── Mock deal used for the demo ───────────── */
const MOCK_DEAL: Deal = {
  dealId:          'deal_42',
  dealName:        'Acme Corp Enterprise License',
  prospectCompany: 'Acme Corp',
  stage:           'Technical Evaluation',
  createdAt:       '2026-06-28T00:00:00.000Z',
  lastActivityAt:  '2026-06-28T14:30:00.000Z',
  calendarEnabled: true,
  groupId:         'group:deal_42',
  stakeholders: [
    { participantId: 'ae_jordan',   workspaceId: 'deal_42_ae',            role: 'ae',            name: 'Jordan Lee',  side: 'seller', connectionStatus: 'active', shareUrl: null, shareToken: null, initStatus: 'success' },
    { participantId: 'se_alex',     workspaceId: 'deal_42_se',            role: 'se',            name: 'Alex Kim',    side: 'seller', connectionStatus: 'active', shareUrl: null, shareToken: null, initStatus: 'success' },
    { participantId: 'legal_dana',  workspaceId: 'deal_42_seller_legal',  role: 'seller_legal',  name: 'Dana Torres', side: 'seller', connectionStatus: 'active', shareUrl: null, shareToken: null, initStatus: 'success' },
    { participantId: 'buyer_sam',   workspaceId: 'deal_42_buyer_champion',role: 'buyer_champion',name: 'Sam Patel',   side: 'buyer',  connectionStatus: 'share_link_only', shareUrl: 'https://www.aicoo.io/share/abc123', shareToken: 'abc123', initStatus: 'pending' },
  ],
}

const MOCK_CONTEXT: ContextSummary = {
  dealId:         'deal_42',
  stage:          'Technical Evaluation',
  discoveryNotes: 'Buyer has three decision makers. Champion is the VP of Engineering. Legal review required before signature. Technical team wants a security audit. Procurement threshold is 250k, requiring CFO sign-off.',
  openQuestions:  [
    'Does the DPA cover EU data residency?',
    'What is the procurement approval threshold?',
    'Can we provide a SOC 2 Type II report?',
  ],
  resolvedQuestions: [
    { question: 'Does the product support SSO?', answer: 'Yes. SAML 2.0 and OIDC are both supported.', resolvedBy: 'se', resolvedAt: '2026-06-27T10:00:00.000Z' },
  ],
  dealEvents: [
    { eventId: 'evt_001', timestamp: '2026-06-28T13:00:00.000Z', from: 'deal_42_buyer_champion', category: 'legal',     summary: 'Buyer legal team requires DPA review for EU data residency.', routedTo: 'deal_42_seller_legal', status: 'pending',  classification: { category: 'legal',    confidence: 0.92, summary: 'Buyer legal team requires DPA review for EU data residency.', suggestedAction: 'Route to seller legal contact for DPA preparation.' }, routingDecision: 'auto_routed' },
    { eventId: 'evt_002', timestamp: '2026-06-28T11:30:00.000Z', from: 'deal_42_buyer_champion', category: 'technical', summary: 'IT team needs security audit documentation and SOC 2 report.', routedTo: 'deal_42_se', status: 'resolved', classification: { category: 'technical', confidence: 0.88, summary: 'IT team needs security audit documentation and SOC 2 report.', suggestedAction: 'Route to SE for security documentation delivery.' }, routingDecision: 'auto_routed' },
    { eventId: 'evt_003', timestamp: '2026-06-28T09:00:00.000Z', from: 'deal_42_buyer_champion', category: 'relationship', summary: 'Champion confirms internal alignment. Deal moving to legal review.', routedTo: 'deal_42_ae', status: 'responded', classification: { category: 'relationship', confidence: 0.75, summary: 'Champion confirms internal alignment.', suggestedAction: 'Acknowledge and confirm legal review timeline.' }, routingDecision: 'human_confirmed' },
  ],
  nextActions: [
    'Send DPA with EU SCCs to buyer legal team.',
    'Schedule legal review call for next week.',
    'Prepare SOC 2 Type II report for IT team.',
  ],
}

/* ─── Tab config ─────────────────────────────── */
const TABS = [
  { id: 'overview',      label: 'Overview',      icon: Database,     checkboxLabel: 'Context' },
  { id: 'agents',        label: 'Agent Network', icon: Users,        checkboxLabel: 'Identity' },
  { id: 'events',        label: 'Events',        icon: Route,        checkboxLabel: 'Routing' },
  { id: 'coordination',  label: 'Coordination',  icon: GitMerge,     checkboxLabel: 'Connect' },
] as const

type TabId = typeof TABS[number]['id']

/* ─── Aicoo coordination checkpoints ────────── */
const CHECKPOINTS = [
  { id: 'identity',     label: 'Agent Identity',   color: 'text-teal-500',  bg: 'bg-teal-50',  active: true  },
  { id: 'connection',   label: 'Agent Connection',  color: 'text-sky-500',   bg: 'bg-sky-50',   active: false },
  { id: 'routing',      label: 'Smart Routing',     color: 'text-mint-600',  bg: 'bg-mint-50',  active: true  },
  { id: 'context',      label: 'Context Memory',    color: 'text-teal-500',  bg: 'bg-teal-50',  active: true  },
  { id: 'human',        label: 'Human Control',     color: 'text-sky-500',   bg: 'bg-sky-50',   active: true  },
]

const stageColorMap: Record<string, string> = {
  'Discovery':            'bg-teal-50 text-teal-700 ring-teal-200',
  'Technical Evaluation': 'bg-sky-50 text-sky-700 ring-sky-200',
  'Legal Review':         'bg-amber-50 text-amber-700 ring-amber-200',
  'Commercial':           'bg-mint-50 text-mint-700 ring-mint-200',
  'Closed Won':           'bg-mint-50 text-mint-700 ring-mint-200',
  'Closed Lost':          'bg-red-50 text-red-600 ring-red-200',
}

export default function DealDashboard({ params }: { params: { dealId: string } }) {
  const { dealId } = params

  const [activeTab,   setActiveTab]   = useState<TabId>('overview')
  const [deal,        setDeal]        = useState<Deal>(MOCK_DEAL)
  const [context,     setContext]     = useState<ContextSummary>(MOCK_CONTEXT)
  const [events,      setEvents]      = useState<DealEvent[]>(MOCK_CONTEXT.dealEvents)
  const [brief,       setBrief]       = useState<PreCallBrief | undefined>(undefined)
  const [briefRole,   setBriefRole]   = useState<StakeholderRole>('ae')
  const [briefLoading,setBriefLoading]= useState(false)
  const [eventLoading,setEventLoading]= useState(false)
  const [checkpoints, setCheckpoints] = useState(CHECKPOINTS)

  /* Activate connection checkpoint when buyer connects */
  useEffect(() => {
    const hasActiveConn = deal.stakeholders.some(
      s => s.side === 'buyer' && s.connectionStatus === 'active'
    )
    setCheckpoints(prev =>
      prev.map(cp => cp.id === 'connection' ? { ...cp, active: hasActiveConn } : cp)
    )
  }, [deal.stakeholders])

  /* ─── Event handlers ─────────────────────── */

  async function handleSendEvent(message: string) {
    setEventLoading(true)
    const res = await eventsApi.send({
      dealId,
      message,
      senderRole: 'buyer_champion',
      senderName: 'Sam Patel',
    })

    if (res.success && res.data) {
      const newEvent: DealEvent = {
        eventId:         res.data.eventId,
        timestamp:       new Date().toISOString(),
        from:            'deal_42_buyer_champion',
        category:        res.data.classification.category,
        summary:         res.data.classification.summary,
        routedTo:        res.data.routedTo ?? '',
        status:          'pending',
        classification:  res.data.classification,
        routingDecision: res.data.routingDecision,
      }
      setEvents(prev => [newEvent, ...prev])

      /* Demo mode: simulate auto-routing feedback */
    } else {
      /* Demo fallback: add a mock event */
      const mockEvent: DealEvent = {
        eventId:   `evt_${Date.now()}`,
        timestamp:  new Date().toISOString(),
        from:      'deal_42_buyer_champion',
        category:  'legal',
        summary:   message.slice(0, 80) + (message.length > 80 ? '...' : ''),
        routedTo:  'deal_42_seller_legal',
        status:    'pending',
        classification: {
          category:        'legal',
          confidence:      0.89,
          summary:         message.slice(0, 80),
          suggestedAction: 'Route to legal contact for review.',
        },
        routingDecision: 'auto_routed',
      }
      setEvents(prev => [mockEvent, ...prev])
    }
    setEventLoading(false)
  }

  async function handleConfirmRouting(eventId: string, target: string) {
    await eventsApi.confirmRouting(eventId, target)
    setEvents(prev =>
      prev.map(e => e.eventId === eventId ? { ...e, status: 'responded', routingDecision: 'human_confirmed' } : e)
    )
  }

  async function handleInviteBuyer(name: string, role: StakeholderRole) {
    const res = await buyerApi.invite({ dealId, name, role })
    if (res.success && res.data) {
      setDeal(prev => ({
        ...prev,
        stakeholders: [
          ...prev.stakeholders,
          {
            participantId: `buyer_${Date.now()}`,
            workspaceId:   `${dealId}_${role}`,
            role,
            name,
            side:          'buyer',
            connectionStatus: 'share_link_only',
            shareUrl:      res.data!.shareUrl,
            shareToken:    res.data!.shareToken,
            initStatus:    'pending',
          },
        ],
      }))
      return { shareUrl: res.data.shareUrl }
    }
    /* Demo fallback */
    return { shareUrl: `https://www.aicoo.io/share/demo_${Date.now()}` }
  }

  async function handleConnect(workspaceId: string) {
    await buyerApi.connect(dealId, workspaceId)
    setDeal(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.map(s =>
        s.workspaceId === workspaceId ? { ...s, connectionStatus: 'pending' } : s
      ),
    }))
  }

  async function handleRefreshBrief() {
    setBriefLoading(true)
    const res = await coordinationApi.getBrief(dealId, briefRole)
    if (res.success && res.data) {
      setBrief(res.data)
    } else {
      /* Demo fallback brief */
      setBrief({
        dealStatus:            'Technical Evaluation stage. Legal review initiated. Security documentation in progress.',
        openQuestions:         context.openQuestions,
        lastThreeEvents:       events.slice(0, 3).map(e => e.summary),
        suggestedTalkingPoints:[
          'Confirm EU data residency coverage in the DPA draft.',
          'Share SOC 2 Type II report timeline with IT lead.',
          'Align on procurement approval threshold to plan commercial review.',
        ],
        riskFlags: ['Legal review may delay close date if DPA turnaround exceeds 5 days.'],
      })
    }
    setBriefLoading(false)
  }

  async function handleBookMeeting(title: string, startTime: string, durationMinutes: number): Promise<boolean> {
    const res = await coordinationApi.scheduleMeeting({
      dealId,
      title,
      startTime,
      durationMinutes,
      attendees: ['jordan@seller.com', 'dana@seller.com', 'sam@acmecorp.com'],
    })
    return res.success ?? true
  }

  /* ─── Render ─────────────────────────────── */

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* ── Page Header ───────────────────────── */}
      <div className="mb-6">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-teal-500 hover:text-teal-700 mb-3 transition-colors"
        >
          <ArrowLeft size={12} />
          All Deal Rooms
        </a>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-logo flex items-center justify-center text-white text-lg font-semibold">
              {deal.prospectCompany.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-teal-900 tracking-tight">{deal.dealName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${stageColorMap[deal.stage] ?? stageColorMap['Discovery']}`}>
                  {deal.stage}
                </span>
                <span className="text-xs text-teal-400">{deal.stakeholders.length} agents provisioned</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Aicoo Coordination Progress Bar ───── */}
      <div className="mb-6 bg-white rounded-xl border border-cream-300 shadow-card p-4">
        <p className="dr-eyebrow mb-3">Aicoo Coordination Checkpoints</p>
        <div className="grid grid-cols-5 gap-2">
          {checkpoints.map((cp, i) => (
            <div
              key={cp.id}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all
                ${cp.active
                  ? `${cp.bg} border-transparent`
                  : 'bg-cream-50 border-cream-200'
                }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center
                ${cp.active ? 'bg-white shadow-sm' : 'bg-cream-200'}`}
              >
                <CheckCircle2 size={12} className={cp.active ? cp.color : 'text-cream-400'} />
              </div>
              <p className={`text-xs font-medium text-center leading-tight
                ${cp.active ? cp.color.replace('text-', 'text-') : 'text-cream-400'}`}
              >
                {cp.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────── */}
      <div className="flex items-center gap-1 border-b border-cream-300 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all
              ${activeTab === tab.id
                ? 'border-teal-500 text-teal-700'
                : 'border-transparent text-teal-400 hover:text-teal-600'
              }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────── */}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <ContextSummaryCard context={context} />
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-cream-300 shadow-card p-4">
              <p className="dr-section-title mb-3">Deal Snapshot</p>
              <div className="space-y-3">
                <Row label="Company"     value={deal.prospectCompany} />
                <Row label="Stage"       value={deal.stage} />
                <Row label="Agents"      value={`${deal.stakeholders.length} workspaces`} />
                <Row label="Last Event"  value={new Date(deal.lastActivityAt).toLocaleDateString()} />
                <Row label="Group ID"    value={deal.groupId} mono />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
        <StakeholderGrid
          stakeholders={deal.stakeholders}
          onRetry={async (wsId) => console.log('Retry init for', wsId)}
        />
      )}

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <EventFeed
            events={events}
            loading={eventLoading}
            onConfirm={handleConfirmRouting}
            onSend={handleSendEvent}
            dealId={dealId}
          />
          <div className="space-y-4">
            {/* Routing legend */}
            <div className="bg-white rounded-xl border border-cream-300 shadow-card p-4">
              <p className="dr-section-title mb-3">Routing Logic</p>
              {[
                { cat: 'Legal',        target: 'Legal Contact',     color: 'bg-amber-400' },
                { cat: 'Technical',    target: 'Sales Engineer',     color: 'bg-sky-400'   },
                { cat: 'Commercial',   target: 'Account Executive',  color: 'bg-teal-400'  },
                { cat: 'Relationship', target: 'Account Executive',  color: 'bg-mint-400'  },
                { cat: 'Escalation',   target: 'Full Team Broadcast',color: 'bg-red-400'   },
              ].map(r => (
                <div key={r.cat} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${r.color}`} />
                    <span className="text-xs text-teal-700">{r.cat}</span>
                  </div>
                  <span className="text-xs font-mono text-teal-500">{r.target}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'coordination' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Buyer onboarding */}
          <div className="space-y-4">
            <BuyerInvitePanel
              dealId={dealId}
              onInvite={handleInviteBuyer}
            />
            <ConnectionStatusPanel
              stakeholders={deal.stakeholders}
              onConnect={handleConnect}
            />
          </div>

          {/* Right: Briefing and scheduling */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-cream-300 shadow-card p-4">
              <label className="dr-label">Brief for Role</label>
              <select
                className="dr-input"
                value={briefRole}
                onChange={e => setBriefRole(e.target.value as StakeholderRole)}
              >
                {deal.stakeholders.filter(s => s.side === 'seller').map(s => (
                  <option key={s.workspaceId} value={s.role}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <PreCallBriefing
              brief={brief}
              loading={briefLoading}
              onRefresh={handleRefreshBrief}
              role={briefRole}
            />

            <CalendarBooking
              dealId={dealId}
              calendarEnabled={deal.calendarEnabled}
              onBook={handleBookMeeting}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Utility row ────────────────────────────── */

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-cream-100 last:border-0">
      <span className="text-xs text-teal-400">{label}</span>
      <span className={`text-xs font-medium text-teal-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
