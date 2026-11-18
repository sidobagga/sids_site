import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import polyline from '@mapbox/polyline'

type RawActivity = {
  id: number
  name: string
  type: string
  sport_type?: string
  distance?: number
  moving_time?: number
  total_elevation_gain?: number
  start_date_local?: string
  map?: {
    summary_polyline?: string | null
  }
  start_latlng?: [number, number]
  end_latlng?: [number, number]
  average_heartrate?: number
  __bounds?: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
}

type ActivityFeature = {
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
  bounds: {
    minLat: number
    minLng: number
    maxLat: number
    maxLng: number
  } | null
  averageHeartrate: number | null
}

let cachedActivities: ActivityFeature[] | null = null

async function loadActivities(): Promise<ActivityFeature[]> {
  if (cachedActivities) {
    return cachedActivities
  }

  const filePath = path.join(process.cwd(), 'personal_activities_20251025_183705_clean.json')
  const raw = await fs.readFile(filePath, 'utf8')
  const activities: RawActivity[] = JSON.parse(raw)

  const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

  const sanitizeLatLng = (value: unknown): [number, number] | null => {
    if (!Array.isArray(value) || value.length !== 2) {
      return null
    }

    const [lat, lng] = value
    return isFiniteNumber(lat) && isFiniteNumber(lng) ? [lat, lng] : null
  }

  cachedActivities = activities
    .map((activity) => {
      const rawPolyline = activity.map?.summary_polyline
      const summaryPolyline = typeof rawPolyline === 'string' && rawPolyline.length > 0 ? rawPolyline : null

      let bounds: ActivityFeature['bounds'] | null = activity.__bounds ?? null

      if (!bounds && summaryPolyline) {
        try {
          const decoded = polyline.decode(summaryPolyline)
          const validPoints = decoded.filter(
            ([lat, lng]) => isFiniteNumber(lat) && isFiniteNumber(lng),
          )

          if (validPoints.length > 0) {
            let minLat = validPoints[0][0]
            let maxLat = validPoints[0][0]
            let minLng = validPoints[0][1]
            let maxLng = validPoints[0][1]

            for (const [lat, lng] of validPoints) {
              if (lat < minLat) minLat = lat
              if (lat > maxLat) maxLat = lat
              if (lng < minLng) minLng = lng
              if (lng > maxLng) maxLng = lng
            }

            bounds = { minLat, maxLat, minLng, maxLng }
          }
        } catch (error) {
          console.error(`Failed to decode polyline for activity ${activity.id}:`, error)
        }
      }

      const startLatLng = sanitizeLatLng(activity.start_latlng)
      const endLatLng = sanitizeLatLng(activity.end_latlng)

      if (!bounds && startLatLng) {
        const [lat, lng] = startLatLng
        bounds = { minLat: lat, maxLat: lat, minLng: lng, maxLng: lng }
      }

      if (!bounds) {
        return null
      }

      return {
        id: activity.id,
        name: activity.name,
        type: activity.type,
        sportType: activity.sport_type ?? activity.type,
        distance: activity.distance ?? null,
        movingTime: activity.moving_time ?? null,
        totalElevationGain: activity.total_elevation_gain ?? null,
        startDateLocal: activity.start_date_local ?? null,
        polyline: summaryPolyline,
        startLatLng,
        endLatLng,
        bounds,
        averageHeartrate: activity.average_heartrate ?? null,
      }
    })
    .filter((activity): activity is NonNullable<typeof activity> => activity !== null)

  return cachedActivities
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const sportType = url.searchParams.get('sportType')

    const activities = await loadActivities()

    const filtered = sportType
      ? activities.filter((activity) => activity.sportType === sportType || activity.type === sportType)
      : activities

    return NextResponse.json(filtered, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Failed to load activities', error)
    return NextResponse.json({ message: 'Failed to load activities' }, { status: 500 })
  }
}
