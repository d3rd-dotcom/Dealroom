'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Users, Route, Database, GitMerge, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { dealsApi } from '@/lib/api'

const checkpoints = [
  {
    icon: Users,
    color: 'text-teal-500',
    bg: 'bg-teal-50',
    label: 'Agent Identity',
    desc: 'Every stakeholder on both sides gets a live agent workspace.',
  },
  {
    icon: GitMerge,
    color: 'text-sky-500',
    bg: 'bg-sky-50',
    label: 'Agent Connection',
    desc: 'Seller and buyer agents connect across organizational boundaries.',
  },
  {
    icon: Route,
    color: 'text-mint-600',
    bg: 'bg-mint-50',
    label: 'Smart Routing',
    desc: 'Every question goes to the right person automatically.',
  },
  {
    icon: Database,
    color: 'text-teal-500',
    bg: 'bg-teal-50',
    label: 'Context Memory',
    desc: 'Deal context accumulates across every touchpoint.',
  },
  {
    icon: CheckCircle2,
    color: 'text-sky-500',
    bg: 'bg-sky-50',
    label: 'Human Control',
    desc: 'Agents propose. Humans approve. Work moves forward together.',
  },
]

export default function HomePage() {
  const router = useRouter()
  const [lookupId, setLookupId] = useState('')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  // There is no GET /api/deals list endpoint in the backend yet, so the
  // landing page cannot show a real list of active deal rooms. This jump
  // box confirms a deal id exists before navigating, rather than showing
  // fabricated demo cards that would 404 against the live backend.
  async function handleJumpToDeal() {
    const id = lookupId.trim()
    if (!id) return
    setChecking(true)
    setLookupError(null)
    const res = await dealsApi.get(id)
    setChecking(false)
    if (res.success) {
      router.push(`/deals/${id}`)
    } else {
      setLookupError(res.message)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <p className="dr-eyebrow mb-4">Powered by Aicoo Agent Coordination</p>
        <h1 className="text-4xl sm:text-5xl font-semibold text-teal-900 tracking-tight mb-5 leading-tight">
          Every deal has a room.
          <br />
          <span className="gradient-logo bg-clip-text text-transparent">
            Every room has an agent.
          </span>
        </h1>
        <p className="text-base text-teal-600 max-w-xl mx-auto mb-8 leading-relaxed">
          Stop losing deals to coordination failure. DealRoom gives every
          stakeholder their own agent identity, routes each question to the
          right person, and accumulates context across every touchpoint.
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
        </div>
      </div>

      {/* Coordination Checkpoints */}
      <div className="mb-16">
        <p className="dr-section-title text-center mb-8">
          Five Aicoo coordination capabilities in one product
        </p>
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
                <span className="text-xs font-semibold text-teal-500">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-teal-900 mb-1">{cp.label}</p>
                <p className="text-xs text-teal-600 leading-relaxed">{cp.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Jump to an existing deal room by id */}
      <div className="max-w-md mx-auto">
        <p className="dr-section-title text-center mb-3">Open an existing deal room</p>
        <div className="flex items-center gap-2">
          <input
            className="dr-input"
            placeholder="Paste a deal id, e.g. a1b2c3d4e5f6"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJumpToDeal()}
          />
          <Button onClick={handleJumpToDeal} loading={checking} disabled={!lookupId.trim()}>
            Open
          </Button>
        </div>
        {lookupError && (
          <p className="text-xs text-red-500 text-center mt-2">{lookupError}</p>
        )}
      </div>
    </div>
  )
}
