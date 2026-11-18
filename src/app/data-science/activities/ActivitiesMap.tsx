'use client'

import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import type { GeoJSONOptions } from 'leaflet'
import { useCallback, useEffect, useMemo } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import polyline from '@mapbox/polyline'
import type { Feature, FeatureCollection, Geometry, LineString, Point } from 'geojson'

export type Bounds = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

type FeatureProps = {
  id: number
  color: string
  name: string
  sportType: string
}

function isValidBounds(bounds: Bounds | null | undefined): bounds is Bounds {
  if (!bounds) return false
  return [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng].every((value) =>
    Number.isFinite(value),
  )
}

type Activity = {
  id: number
  name: string
  sportType: string
  polyline: string | null
  startLatLng: [number, number] | null
  bounds: Bounds | null
}

export type ActivitiesMapProps = {
  activities: Activity[]
  allActivities: Activity[]
  onBoundsChange: (bounds: Bounds | null) => void
  fitBoundsTrigger: number
}

function getStrokeColor(sport: string): string {
  const normalized = sport.toLowerCase()

  if (normalized.includes('run')) return '#ef4444'
  if (normalized.includes('ride') || normalized.includes('bike')) return '#3b82f6'
  if (normalized.includes('walk')) return '#22c55e'
  if (normalized.includes('hike')) return '#f97316'
  if (normalized.includes('swim')) return '#0ea5e9'

  return '#a855f7'
}

function combineBounds(boundsList: Bounds[]): Bounds | null {
  const validBounds = boundsList.filter(isValidBounds)
  if (validBounds.length === 0) return null

  return validBounds.reduce<Bounds | null>((acc, bounds) => {
    if (!acc) return { ...bounds }

    return {
      minLat: Math.min(acc.minLat, bounds.minLat),
      maxLat: Math.max(acc.maxLat, bounds.maxLat),
      minLng: Math.min(acc.minLng, bounds.minLng),
      maxLng: Math.max(acc.maxLng, bounds.maxLng),
    }
  }, null)
}

type FitBoundsEffectProps = {
  bounds: Bounds | null
  trigger: number
}

function FitBoundsEffect({ bounds, trigger }: FitBoundsEffectProps) {
  const map = useMap()

  useEffect(() => {
    if (!isValidBounds(bounds)) return

    const leafletBounds = L.latLngBounds(
      [bounds.minLat, bounds.minLng],
      [bounds.maxLat, bounds.maxLng],
    )

    if (!leafletBounds.isValid()) return

    map.whenReady(() => {
      map.fitBounds(leafletBounds, { padding: [24, 24], maxZoom: 14 })
    })
  }, [bounds, trigger, map])

  return null
}

type BoundsReporterProps = {
  onBoundsChange: (bounds: Bounds | null) => void
}

function BoundsReporter({ onBoundsChange }: BoundsReporterProps) {
  const map = useMap()

  const reportBounds = useCallback(() => {
    const bounds = map.getBounds()
    if (!bounds || typeof bounds.getSouthWest !== 'function' || typeof bounds.getNorthEast !== 'function') {
      return
    }

    const southWest = bounds.getSouthWest()
    const northEast = bounds.getNorthEast()

    if (!southWest || !northEast) return

    const nextBounds: Bounds = {
      minLat: southWest.lat,
      maxLat: northEast.lat,
      minLng: southWest.lng,
      maxLng: northEast.lng,
    }

    if (!isValidBounds(nextBounds)) return

    onBoundsChange(nextBounds)
  }, [map, onBoundsChange])

  useEffect(() => {
    map.whenReady(reportBounds)
  }, [map, reportBounds])

  useMapEvents({
    moveend: reportBounds,
    zoomend: reportBounds,
  })

  return null
}

export default function ActivitiesMap({
  activities,
  allActivities,
  onBoundsChange,
  fitBoundsTrigger,
}: ActivitiesMapProps) {
  const featureCollection = useMemo<FeatureCollection<Geometry, FeatureProps>>(() => {
    const features: Feature<Geometry, FeatureProps>[] = []

    activities.forEach((activity) => {
      const color = getStrokeColor(activity.sportType)

      if (activity.polyline) {
        try {
          const decoded = polyline.decode(activity.polyline) as [number, number][]

          if (decoded.length > 1) {
            const coordinates = decoded.map(([lat, lng]) => [lng, lat]) // GeoJSON expects [lng, lat]
            const geometry: LineString = {
              type: 'LineString',
              coordinates,
            }

            features.push({
              type: 'Feature',
              geometry,
              properties: {
                id: activity.id,
                color,
                name: activity.name,
                sportType: activity.sportType,
              },
            })
            return
          }
        } catch (error) {
          console.error(`Failed to decode polyline for activity ${activity.id}`, error)
        }
      }

      if (activity.startLatLng) {
        const [lat, lng] = activity.startLatLng
        const geometry: Point = {
          type: 'Point',
          coordinates: [lng, lat],
        }

        features.push({
          type: 'Feature',
          geometry,
          properties: {
            id: activity.id,
            color,
            name: activity.name,
            sportType: activity.sportType,
          },
        })
      }
    })

    return {
      type: 'FeatureCollection',
      features,
    }
  }, [activities])

  const coordsToLatLng = useCallback<NonNullable<GeoJSONOptions['coordsToLatLng']>>((coords) => {
    const [lng, lat] = coords as [number, number]
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Invalid coordinate')
    }
    return L.latLng(lat, lng)
  }, [])

  const filterFeature = useCallback((feature: Feature<Geometry, FeatureProps>) => {
    if (!feature?.geometry) return false

    if (feature.geometry.type === 'LineString') {
      const geometry = feature.geometry as LineString
      return (
        Array.isArray(geometry.coordinates) &&
        geometry.coordinates.length > 1 &&
        geometry.coordinates.every(
          (pair) =>
            Array.isArray(pair) &&
            pair.length === 2 &&
            pair.every((value) => Number.isFinite(value)),
        )
      )
    }

    if (feature.geometry.type === 'Point') {
      const geometry = feature.geometry as Point
      return (
        Array.isArray(geometry.coordinates) &&
        geometry.coordinates.length === 2 &&
        geometry.coordinates.every((value) => Number.isFinite(value))
      )
    }

    return false
  }, [])

  const styleFeature = useCallback((feature?: Feature<Geometry, FeatureProps>) => {
    const color = feature?.properties?.color ?? '#a855f7'
    return {
      color,
      weight: 3,
      opacity: 0.7,
    }
  }, [])

  const pointToLayer = useCallback((feature: Feature<Geometry, FeatureProps>, latlng: L.LatLng) => {
    const color = feature?.properties?.color ?? '#a855f7'
    return L.circleMarker(latlng, {
      radius: 4,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.85,
    })
  }, [])

  const targetBounds = useMemo(() => {
    const candidates = activities.length > 0 ? activities : allActivities
    const boundsList = candidates
      .map((activity) => activity.bounds)
      .filter((bounds): bounds is Bounds => Boolean(bounds))

    return combineBounds(boundsList)
  }, [activities, allActivities])

  return (
    <MapContainer
      center={[37.773972, -122.431297]}
      zoom={11}
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BoundsReporter onBoundsChange={onBoundsChange} />
      {targetBounds && <FitBoundsEffect bounds={targetBounds} trigger={fitBoundsTrigger} />}
      <GeoJSON
        key={`${fitBoundsTrigger}-${featureCollection.features.length}`}
        data={featureCollection}
        style={styleFeature}
        pointToLayer={pointToLayer}
        filter={filterFeature}
        coordsToLatLng={coordsToLatLng}
      />
    </MapContainer>
  )
}
