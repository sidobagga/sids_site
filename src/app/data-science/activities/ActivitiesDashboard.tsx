'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import type { Bounds, ActivitiesMapProps } from './ActivitiesMap'
import { format, parseISO } from 'date-fns'

type Activity = {
  id: number
  name: string
  type: string
  sportType: string
  distance: number | null
  movingTime: number | null
  totalElevationGain: number | null
  startDateLocal: string | null
  polyline: string | null
  startLatLng: [number, number] | null
  endLatLng: [number, number] | null
  bounds: Bounds | null
  averageHeartrate: number | null
}

type DateRange = {
  start: string
  end: string
}

const defaultDateRange: DateRange = { start: '', end: '' }

const metersToMiles = (meters: number) => meters / 1609.34
const secondsToHours = (seconds: number) => seconds / 3600

const ActivitiesMap = dynamic<ActivitiesMapProps>(() => import('./ActivitiesMap'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading map…</div>,
})

function intersects(bounds: Bounds, mapBounds: Bounds): boolean {
  return (
    bounds.minLat <= mapBounds.maxLat &&
    bounds.maxLat >= mapBounds.minLat &&
    bounds.minLng <= mapBounds.maxLng &&
    bounds.maxLng >= mapBounds.minLng
  )
}

export default function ActivitiesDashboard() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [isMapFilterActive, setIsMapFilterActive] = useState(true)
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null)
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0)

  useEffect(() => {
    async function loadActivities() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/activities')
        if (!response.ok) {
          throw new Error('Failed to load activities')
        }
        const data: Activity[] = await response.json()
        setActivities(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        setIsLoading(false)
      }
    }

    loadActivities()
  }, [])

  useEffect(() => {
    // Whenever date range changes, request map to refit to filtered activities
    setFitBoundsTrigger((value) => value + 1)
  }, [dateRange.start, dateRange.end])

  const dateFilteredActivities = useMemo(() => {
    if (!dateRange.start && !dateRange.end) {
      return activities
    }

    return activities.filter((activity) => {
      if (!activity.startDateLocal) return false
      const timestamp = parseISO(activity.startDateLocal)
      const afterStart = dateRange.start ? timestamp >= parseISO(dateRange.start) : true
      const beforeEnd = dateRange.end ? timestamp <= parseISO(dateRange.end) : true
      return afterStart && beforeEnd
    })
  }, [activities, dateRange.start, dateRange.end])

  const filteredActivities = useMemo(() => {
    if (!isMapFilterActive || !mapBounds) {
      return dateFilteredActivities
    }

    return dateFilteredActivities.filter((activity) => {
      if (!activity.bounds) {
        return false
      }
      return intersects(activity.bounds, mapBounds)
    })
  }, [dateFilteredActivities, isMapFilterActive, mapBounds])

  const activityStats = useMemo(() => {
    if (filteredActivities.length === 0) {
      return null
    }

    const totalDistance = filteredActivities.reduce((sum, activity) => sum + (activity.distance ?? 0), 0)
    const totalTime = filteredActivities.reduce((sum, activity) => sum + (activity.movingTime ?? 0), 0)

    const bySport = filteredActivities.reduce<Record<string, number>>((acc, activity) => {
      const key = activity.sportType || activity.type
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    return {
      count: filteredActivities.length,
      totalMiles: metersToMiles(totalDistance),
      totalHours: secondsToHours(totalTime),
      bySport,
    }
  }, [filteredActivities])

  function handleDateChange(key: keyof DateRange, value: string) {
    setDateRange((prev) => ({ ...prev, [key]: value }))
  }

  function clearDateRange() {
    setDateRange(defaultDateRange)
  }

  function toggleMapFilter() {
    setIsMapFilterActive((value) => !value)
  }

  function resetMapBounds() {
    setMapBounds(null)
    setFitBoundsTrigger((value) => value + 1)
  }

  if (isLoading) {
    return <p>Loading activities…</p>
  }

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <label htmlFor="date-start" className="block text-sm font-medium">
            Start date
          </label>
          <input
            id="date-start"
            type="date"
            value={dateRange.start}
            onChange={(event) => handleDateChange('start', event.target.value)}
            className="w-full rounded border border-slate-300 bg-white p-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="date-end" className="block text-sm font-medium">
            End date
          </label>
          <input
            id="date-end"
            type="date"
            value={dateRange.end}
            onChange={(event) => handleDateChange('end', event.target.value)}
            className="w-full rounded border border-slate-300 bg-white p-2 text-sm"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={clearDateRange}
            className="rounded border border-slate-300 px-3 py-2 text-sm transition hover:bg-slate-100"
          >
            Clear dates
          </button>
          <button
            type="button"
            onClick={resetMapBounds}
            className="rounded border border-slate-300 px-3 py-2 text-sm transition hover:bg-slate-100"
          >
            Reset map view
          </button>
        </div>
        <label className="flex items-center space-x-2 text-sm">
          <input
            type="checkbox"
            checked={isMapFilterActive}
            onChange={toggleMapFilter}
            className="h-4 w-4"
          />
          <span>Limit results to current map extent</span>
        </label>
      </section>

      {activityStats ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Activities</div>
            <div className="text-2xl font-semibold">{activityStats.count.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Miles</div>
            <div className="text-2xl font-semibold">{activityStats.totalMiles.toFixed(1)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Hours</div>
            <div className="text-2xl font-semibold">{activityStats.totalHours.toFixed(1)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:col-span-3">
            <div className="text-sm text-slate-500">By Sport</div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
              {Object.entries(activityStats.bySport)
                .sort(([, a], [, b]) => b - a)
                .map(([sport, count]) => (
                  <span
                    key={sport}
                    className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium"
                  >
                    {sport}: {count}
                  </span>
                ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
          Narrower date or map filters currently return no activities.
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="h-[600px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <ActivitiesMap
            activities={filteredActivities}
            allActivities={dateFilteredActivities}
            onBoundsChange={setMapBounds}
            fitBoundsTrigger={fitBoundsTrigger}
          />
        </div>
        <div className="max-h-[600px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold">{filteredActivities.length} activities</h3>
          <ul className="space-y-3 text-sm">
            {filteredActivities.map((activity) => (
              <li key={activity.id} className="rounded border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{activity.name}</span>
                  {activity.startDateLocal ? (
                    <time dateTime={activity.startDateLocal} className="text-slate-500">
                      {format(parseISO(activity.startDateLocal), 'MMM d, yyyy')}
                    </time>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{activity.sportType}</span>
                  {activity.distance ? <span>{metersToMiles(activity.distance).toFixed(1)} mi</span> : null}
                  {activity.movingTime ? <span>{Math.round(activity.movingTime / 60)} min</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
