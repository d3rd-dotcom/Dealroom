import Link from 'next/link'
import { ArrowRight, Users, Route, Database, GitMerge, CheckCircle2 } from 'lucide-react'

const checkpoints = [
  {
    icon: Users,
    color: 'text-teal-500',
    bg:   'bg-teal-50',
    label: 'Agent Identity',
    desc:  'Every stakeholder on both sides gets a live agent workspace.',
  },
  {
    icon: GitMerge,
    color: 'text-sky-500',
    bg:   'bg-sky-50',
    label: 'Agent Connection',
    desc:  'Seller and buyer agents connect across organizational boundaries.',
  },
  {
    icon: Route,
    color: 'text-mint-600',
    bg:   'bg-mint-50',
    label: 'Smart Routing',
    desc:  'Every question goes to the right person automatically.',
  },
  {
    icon: Database,
    color: 'text-teal-500',
    bg:   'bg-teal-50',
    label: 'Context Memory',
    desc:  'Deal context accumulates across every touchpoint.',
  },
  {
    icon: CheckCircle2,
    color: 'text-sky-500',
    bg:   'bg-sky-50',
    label: 'Human Control',
    desc:  'Agents propose. Humans approve. Work moves forward together.',
  },
]

const demoDeals = [
  { id: 'deal_42', name: 'Acme Corp Enterprise License', company: 'Acme Corp', stage: 'Technical Evaluation', agents: 4 },
  { id: 'deal_43', name: 'Orion Health Platform',        company: 'Orion Health', stage: 'Legal Review',    agents: 5 },
  { id: 'deal_44', name: 'Vertex Analytics Suite',       company: 'Vertex Inc',  stage: 'Commercial',       agents: 3 },
]

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">

      {/* ── Hero ─────────────────────────────── */}
      <div className="text-center mb-16">
        <p className="dr-eyebrow mb-4">Powered by Aicoo Agent Coordination</p>
        <h1 className="text-4xl sm:text-5xl font-semibold text-teal-900 tracking-tight mb-5 leading-tight">
          Every deal has a room.
          <br />
          <span className="gradient-logo bg-clip-text text-transparent">Every room has an agent.</span>
        </h1>
        <p className="text-base text-teal-600 max-w-xl mx-auto mb-8 leading-relaxed">
          Stop losing deals to coordination failure. DealRoom gives every stakeholder their own agent identity,
          routes each question to the right person, and accumulates context across every touchpoint.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/deals/new"
            className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700
                       text-white text-sm font-medium px-6 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            Create a Deal Room
            <ArrowRight size={15} />
          </Link>
          <Link
            href="/deals/deal_42"
            className="inline-flex items-center gap-2 bg-white hover:bg-cream-100 text-teal-700
                       text-sm font-medium px-6 py-2.5 rounded-lg border border-cream-300 shadow-card transition-colors"
          >
            View Demo Deal
          </Link>
        </div>
      </div>

      {/* ── Coordination Checkpoints ──────────── */}
      <div className="mb-16">
        <p className="dr-section-title text-center mb-8">Five Aicoo coordination capabilities in one product</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {checkpoints.map((cp, i) => (
            <div
              key={cp.label}
              className="bg-white rounded-xl border border-cream-300 shadow-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${cp.bg} flex items-center justify-center`}>
                  <cp.icon size={14} className={cp.color} />
                </div>
                <span className="text-xs font-semibold text-teal-500">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-teal-900 mb-1">{cp.label}</p>
                <p className="text-xs text-teal-600 leading-relaxed">{cp.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active Deals ─────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <p className="dr-section-title">Active Deal Rooms</p>
          <Link
            href="/deals/new"
            className="text-xs font-medium text-teal-500 hover:text-teal-700 transition-colors"
          >
            New Deal Room
          </Link>
        </div>

        <div className="grid gap-3">
          {demoDeals.map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="bg-white rounded-xl border border-cream-300 shadow-card hover:shadow-card-hover
                         transition-shadow p-5 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl gradient-logo flex items-center justify-center text-white text-sm font-semibold">
                  {deal.company.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-900">{deal.name}</p>
                  <p className="text-xs text-teal-500 mt-0.5">{deal.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:block">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full
                                   text-xs font-medium bg-sky-50 text-sky-700 ring-1 ring-sky-200">
                    {deal.stage}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-teal-500">
                  <Users size={12} />
                  <span>{deal.agents} agents</span>
                </div>
                <ArrowRight size={14} className="text-cream-400 group-hover:text-teal-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
