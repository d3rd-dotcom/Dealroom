'use client'
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

/* ══════════════════════════════════════════════
   BUTTON
   ══════════════════════════════════════════════ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant
  size?:     ButtonSize
  loading?:  boolean
  icon?:     ReactNode
  iconRight?: ReactNode
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-700 focus-visible:ring-teal-500 shadow-sm',
  secondary:
    'bg-teal-50 text-teal-700 hover:bg-teal-100 active:bg-teal-200 focus-visible:ring-teal-400 border border-teal-200',
  ghost:
    'bg-transparent text-teal-700 hover:bg-cream-200 active:bg-cream-300 focus-visible:ring-teal-400',
  danger:
    'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 focus-visible:ring-red-400 border border-red-200',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-7 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, children, disabled, className = '', ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
)
Button.displayName = 'Button'

/* ══════════════════════════════════════════════
   CARD
   ══════════════════════════════════════════════ */

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const cardPadding = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' }

export function Card({ hover, padding = 'md', className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-cream-300 shadow-card ${
        hover ? 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer' : ''
      } ${cardPadding[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════
   BADGE
   ══════════════════════════════════════════════ */

type BadgeVariant = 'teal' | 'sky' | 'mint' | 'amber' | 'red' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  dot?:     boolean
  children: ReactNode
  className?: string
}

const badgeVariants: Record<BadgeVariant, string> = {
  teal:    'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
  sky:     'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  mint:    'bg-mint-50 text-mint-700 ring-1 ring-mint-200',
  amber:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  red:     'bg-red-50 text-red-600 ring-1 ring-red-200',
  neutral: 'bg-cream-100 text-teal-600 ring-1 ring-cream-300',
}

const dotColors: Record<BadgeVariant, string> = {
  teal:    'bg-teal-500',
  sky:     'bg-sky-500',
  mint:    'bg-mint-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  neutral: 'bg-cream-400',
}

export function Badge({ variant = 'neutral', dot, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${badgeVariants[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}

/* ══════════════════════════════════════════════
   STATUS INDICATOR
   ══════════════════════════════════════════════ */

type StatusType = 'active' | 'pending' | 'failed' | 'share_link_only' | 'not_invited'

interface StatusIndicatorProps {
  status:  StatusType
  label?:  string
  size?:   'sm' | 'md'
}

const statusConfig: Record<StatusType, { color: string; label: string; pulse: boolean }> = {
  active:         { color: 'bg-mint-500',    label: 'Connected',        pulse: false },
  pending:        { color: 'bg-amber-400',   label: 'Awaiting Accept',  pulse: true  },
  share_link_only:{ color: 'bg-sky-400',     label: 'Link Shared',      pulse: false },
  failed:         { color: 'bg-red-500',     label: 'Failed',           pulse: false },
  not_invited:    { color: 'bg-cream-400',   label: 'Not Invited',      pulse: false },
}

export function StatusIndicator({ status, label, size = 'md' }: StatusIndicatorProps) {
  const cfg = statusConfig[status]
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex">
        {cfg.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-40`} />
        )}
        <span className={`relative inline-flex rounded-full ${dotSize} ${cfg.color}`} />
      </span>
      <span className={`${size === 'sm' ? 'text-xs' : 'text-xs'} font-medium text-teal-700`}>
        {label ?? cfg.label}
      </span>
    </span>
  )
}

/* ══════════════════════════════════════════════
   LOADING SPINNER
   ══════════════════════════════════════════════ */

interface SpinnerProps {
  size?:  'sm' | 'md' | 'lg'
  label?: string
}

const spinnerSizes = { sm: 16, md: 24, lg: 36 }

export function LoadingSpinner({ size = 'md', label }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2
        size={spinnerSizes[size]}
        className="animate-spin text-teal-500"
        strokeWidth={2}
      />
      {label && <p className="text-xs text-teal-600 font-medium">{label}</p>}
    </div>
  )
}

/* ══════════════════════════════════════════════
   DIVIDER
   ══════════════════════════════════════════════ */

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-cream-300 ${className}`} />
}

/* ══════════════════════════════════════════════
   EMPTY STATE
   ══════════════════════════════════════════════ */

interface EmptyStateProps {
  icon?:    ReactNode
  title:    string
  message?: string
  action?:  ReactNode
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-4 text-teal-400">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-teal-900 mb-1">{title}</p>
      {message && <p className="text-xs text-teal-600 max-w-xs mb-4">{message}</p>}
      {action}
    </div>
  )
}
