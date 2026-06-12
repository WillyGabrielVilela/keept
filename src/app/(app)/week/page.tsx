import { redirect } from 'next/navigation'
import { getWeekId } from '@/lib/utils'

export default function WeekIndexPage() {
  redirect(`/week/${getWeekId(new Date())}`)
}
