#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import polyline from '@mapbox/polyline'

const args = process.argv.slice(2)

if (args.length < 1) {
  console.error('Usage: node scripts/clean-activities.mjs <input-json> [output-json]')
  process.exit(1)
}

const inputPath = path.resolve(process.cwd(), args[0])
const outputPath = path.resolve(
  process.cwd(),
  args[1] ?? inputPath.replace(/\.json$/i, '_clean.json'),
)

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function sanitizeLatLng(value) {
  if (!Array.isArray(value) || value.length !== 2) {
    return null
  }

  const [lat, lng] = value
  return isFiniteNumber(lat) && isFiniteNumber(lng) ? [lat, lng] : null
}

const raw = fs.readFileSync(inputPath, 'utf8')
const activities = JSON.parse(raw)

const cleaned = []
let droppedCount = 0

for (const activity of activities) {
  const rawPolyline = activity?.map?.summary_polyline
  const summaryPolyline = typeof rawPolyline === 'string' && rawPolyline.length > 0 ? rawPolyline : null

  let bounds = null

  if (summaryPolyline) {
    try {
      const decoded = polyline.decode(summaryPolyline)
      const validPoints = decoded.filter(([lat, lng]) => isFiniteNumber(lat) && isFiniteNumber(lng))

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
      console.warn(`Skipping invalid polyline for activity ${activity.id}:`, error.message)
    }
  }

  const startLatLng = sanitizeLatLng(activity.start_latlng)
  const endLatLng = sanitizeLatLng(activity.end_latlng)

  if (!bounds && startLatLng) {
    const [lat, lng] = startLatLng
    bounds = { minLat: lat, maxLat: lat, minLng: lng, maxLng: lng }
  }

  const hasValidBounds =
    bounds && [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng].every(isFiniteNumber)

  if (!hasValidBounds) {
    droppedCount += 1
    continue
  }

  cleaned.push({
    ...activity,
    start_latlng: startLatLng,
    end_latlng: endLatLng,
    map: {
      ...activity.map,
      summary_polyline: summaryPolyline,
    },
    __bounds: bounds,
  })
}

fs.writeFileSync(outputPath, JSON.stringify(cleaned, null, 2))

console.log(`Cleaned activities written to ${outputPath}`)
console.log(`Kept ${cleaned.length} activities, dropped ${droppedCount}`)
