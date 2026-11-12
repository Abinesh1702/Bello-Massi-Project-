import { Clock } from 'lucide-react'
import Card, { CardHeader } from '../../common/Card'
import Badge from '../../common/Badge'
import Button from '../../common/Button'

/**
 * Honest placeholder for a widget whose module arrives in a later phase.
 * Always has a real action (navigates to the module's Coming Soon page).
 */
export default function PlaceholderPanel({ title, description, icon: Icon = Clock, to, actionLabel = 'Open module', children }) {
  return (
    <Card className="flex flex-col">
      <CardHeader title={title} icon={Icon} action={<Badge tone="accent">Later phase</Badge>} />
      <p className="text-sm text-muted">{description}</p>
      {children && <div className="mt-4">{children}</div>}
      {to && (
        <div className="mt-auto pt-4">
          <Button variant="secondary" size="sm" to={to}>{actionLabel}</Button>
        </div>
      )}
    </Card>
  )
}
