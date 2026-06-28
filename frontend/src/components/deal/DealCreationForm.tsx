'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronRight, ArrowLeft } from 'lucide-react'
import { Button, Card, Badge } from '@/components/ui'
import type { StakeholderRole, DealStage, CreateDealPayload } from '@/lib/types'
import { dealsApi } from '@/lib/api'

interface ParticipantEntry {
  id:   string
  name: string
  role: StakeholderRole
}

const SELLER_ROLES: { value: StakeholderRole; label: string }[] = [
  { value: 'ae',           label: 'Account Executive' },
  { value: 'se',           label: 'Sales Engineer' },
  { value: 'seller_legal', label: 'Legal Contact' },
]

const STAGES: DealStage[] = [
  'Discovery',
  'Technical Evaluation',
  'Legal Review',
  'Commercial',
]

const stageColors: Record<string, 'teal' | 'sky' | 'mint' | 'amber'> = {
  'Discovery':            'teal',
  'Technical Evaluation': 'sky',
  'Legal Review':         'amber',
  'Commercial':           'mint',
}

export default function DealCreationForm() {
  const router = useRouter()

  const [step, setStep]       = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [dealName,        setDealName]        = useState('')
  const [prospectCompany, setProspectCompany] = useState('')
  const [stage,           setStage]           = useState<DealStage>('Discovery')
  const [participants, setParticipants]       = useState<ParticipantEntry[]>([
    { id: '1', name: 'Jordan Lee', role: 'ae' },
  ])

  function addParticipant() {
    setParticipants(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', role: 'se' },
    ])
  }

  function updateParticipant(id: string, field: 'name' | 'role', value: string) {
    setParticipants(prev =>
      prev.map(p => p.id === id ? { ...p, [field]: value } : p)
    )
  }

  function removeParticipant(id: string) {
    setParticipants(prev => prev.filter(p => p.id !== id))
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    const payload: CreateDealPayload = {
      dealName,
      prospectCompany,
      stage,
      participants: participants
        .filter(p => p.name.trim())
        .map(p => ({ name: p.name.trim(), role: p.role })),
    }

    const res = await dealsApi.create(payload)

    if (res.success) {
      router.push(`/deals/${res.data.dealId}`)
    } else {
      setError(res.message ?? 'Failed to create deal room.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-teal-500 hover:text-teal-700 mb-4 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to deals
        </a>
        <h1 className="text-2xl font-semibold text-teal-900 tracking-tight">
          Create a Deal Room
        </h1>
        <p className="text-sm text-teal-600 mt-1">
          Provision agent workspaces for every stakeholder on both sides of the deal.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {([1, 2] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
              ${step >= s ? 'bg-teal-500 text-white' : 'bg-cream-200 text-teal-400'}`}>
              {s}
            </div>
            <span className={`text-xs font-medium ${step >= s ? 'text-teal-700' : 'text-teal-400'}`}>
              {s === 1 ? 'Deal Details' : 'Seller Team'}
            </span>
            {s < 2 && <ChevronRight size={12} className="text-cream-400" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Deal Details ────────────────── */}
      {step === 1 && (
        <Card padding="lg" className="animate-slide-up">
          <h2 className="dr-section-title mb-5">Deal information</h2>

          <div className="space-y-4">
            <div>
              <label className="dr-label">Deal Name</label>
              <input
                className="dr-input"
                placeholder="e.g. Acme Corp Enterprise License"
                value={dealName}
                onChange={e => setDealName(e.target.value)}
              />
            </div>

            <div>
              <label className="dr-label">Prospect Company</label>
              <input
                className="dr-input"
                placeholder="e.g. Acme Corp"
                value={prospectCompany}
                onChange={e => setProspectCompany(e.target.value)}
              />
            </div>

            <div>
              <label className="dr-label">Deal Stage</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {STAGES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStage(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                      ${stage === s
                        ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                        : 'bg-white text-teal-700 border-cream-300 hover:border-teal-300 hover:bg-teal-50'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setStep(2)}
              disabled={!dealName.trim() || !prospectCompany.trim()}
              icon={<ChevronRight size={14} />}
            >
              Next: Add Team
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 2: Seller Team ─────────────────── */}
      {step === 2 && (
        <div className="space-y-4 animate-slide-up">
          <Card padding="lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="dr-section-title">Seller team members</h2>
              <span className="text-xs text-teal-500">Each person gets their own agent workspace.</span>
            </div>

            <div className="space-y-3">
              {participants.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-teal-50 flex items-center justify-center text-xs font-semibold text-teal-600 shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    className="dr-input flex-1"
                    placeholder="Full name"
                    value={p.name}
                    onChange={e => updateParticipant(p.id, 'name', e.target.value)}
                  />
                  <select
                    className="dr-input w-44 shrink-0"
                    value={p.role}
                    onChange={e => updateParticipant(p.id, 'role', e.target.value as StakeholderRole)}
                  >
                    {SELLER_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {participants.length > 1 && (
                    <button
                      onClick={() => removeParticipant(p.id)}
                      className="p-1.5 text-teal-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={<Plus size={13} />}
              onClick={addParticipant}
              className="mt-3"
            >
              Add team member
            </Button>
          </Card>

          {/* Summary card */}
          <Card padding="md" className="bg-teal-50 border-teal-100">
            <p className="text-xs font-semibold text-teal-700 mb-2">What gets created</p>
            <ul className="space-y-1">
              {participants.filter(p => p.name.trim()).map(p => (
                <li key={p.id} className="flex items-center gap-2 text-xs text-teal-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  Agent workspace for {p.name} ({SELLER_ROLES.find(r => r.value === p.role)?.label})
                </li>
              ))}
              <li className="flex items-center gap-2 text-xs text-teal-600">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Deal context seeded with {dealName}
              </li>
              <li className="flex items-center gap-2 text-xs text-teal-600">
                <span className="w-1.5 h-1.5 rounded-full bg-mint-400" />
                Tool schemas verified via GET /tools
              </li>
            </ul>
          </Card>

          {error && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={participants.filter(p => p.name.trim()).length === 0}
            >
              {loading ? 'Provisioning Agents...' : 'Create Deal Room'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
