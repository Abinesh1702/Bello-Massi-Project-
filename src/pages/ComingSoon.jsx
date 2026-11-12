import { ArrowLeft, CalendarClock, CheckCircle2, Hammer, Layers } from 'lucide-react'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import PageHeader from '../components/common/PageHeader'
import { appConfig } from '../config/appConfig'
import { canAccessItem } from '../config/navigation'
import { getRoles } from '../services/rbacService'

const rolesWithAccess = (item) => getRoles().filter((r) => r.status === 'active' && canAccessItem(item, r.code))

/** Professional placeholder for modules scheduled in later phases. */
export default function ComingSoon({ item }) {
  const Icon = item.icon || Layers
  const groupLabel = item.group?.label
  return (
    <>
      <PageHeader
        title={item.label}
        description={groupLabel ? `${groupLabel} module` : 'Module'}
        actions={<Button variant="secondary" icon={ArrowLeft} to="/dashboard">Back to Dashboard</Button>}
      />
      <Card className="relative overflow-hidden" padded={false}>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#232B5F] via-[#34427A] to-[#F5A623]" aria-hidden />
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-brand">
              <Icon size={26} aria-hidden />
            </span>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge tone="accent" dot>Coming soon</Badge>
              <Badge tone="neutral">Planned module</Badge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{item.label}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted max-w-xl">{item.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button to="/dashboard" icon={ArrowLeft}>Back to Dashboard</Button>
              <Button variant="secondary" to="/settings?tab=about">About this prototype</Button>
            </div>
          </div>
          <dl className="grid gap-3 self-start">
            <div className="rounded-xl border border-line bg-surface-2/60 p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted"><Hammer size={14} /> Current development phase</dt>
              <dd className="mt-1.5 text-sm font-medium text-ink">Phase {appConfig.currentPhase} — {appConfig.currentPhaseName}</dd>
            </div>
            <div className="rounded-xl border border-line bg-surface-2/60 p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted"><CalendarClock size={14} /> Status</dt>
              <dd className="mt-1.5 text-sm font-medium text-ink">Scheduled for a later phase — navigation, route and access rules are ready.</dd>
            </div>
            <div className="rounded-xl border border-line bg-surface-2/60 p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted"><CheckCircle2 size={14} /> Available to</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {rolesWithAccess(item).map((r) => <Badge key={r.code} tone="brand">{r.name}</Badge>)}
              </dd>
            </div>
          </dl>
        </div>
      </Card>
    </>
  )
}
