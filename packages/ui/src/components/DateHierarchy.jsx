import { useState, useEffect } from 'react'
import { useAdmin } from '../hooks/useAdmin.jsx'

const MONTHS_FR = [
  'Jan','Fév','Mar','Avr','Mai','Jun',
  'Jul','Aoû','Sep','Oct','Nov','Déc',
]

// Drill-down date : Toutes → 2024 → Jan 2024 → 15 Jan 2024
// Props:
//   field     — nom du champ DateTime (ex: "createdAt")
//   modelKey  — modèle en minuscule
//   onChange  — callback({ dateStart, dateEnd }) | null
export default function DateHierarchy({ field, modelKey, onChange }) {
  const { authFetch } = useAdmin()

  const [year,  setYear]  = useState(null)
  const [month, setMonth] = useState(null)
  const [day,   setDay]   = useState(null)

  const [availYears,  setAvailYears]  = useState([])
  const [availMonths, setAvailMonths] = useState([])
  const [availDays,   setAvailDays]   = useState([])
  const [loading,     setLoading]     = useState(false)

  // Charger les années disponibles au montage
  useEffect(() => {
    setLoading(true)
    // Charger tous les enregistrements pour extraire les années distinctes
    // On utilise perPage=9999 — acceptable car c'est juste pour les dates
    authFetch(`/${modelKey}?perPage=9999&sortField=${field}&sortDir=asc`)
      .then(res => {
        const years = getDistinctYears(res.data ?? [], field)
        setAvailYears(years)
      })
      .catch(() => setAvailYears([]))
      .finally(() => setLoading(false))
  }, [modelKey, field])

  // Quand l'année change → charger les mois
  useEffect(() => {
    if (!year) { setAvailMonths([]); setMonth(null); setDay(null); return }

    const start = new Date(year, 0, 1).toISOString()
    const end   = new Date(year + 1, 0, 1).toISOString()
    authFetch(`/${modelKey}?perPage=9999&filters[${field}][min]=${start}&filters[${field}][max]=${end}&sortField=${field}&sortDir=asc`)
      .then(res => {
        const months = getDistinctMonths(res.data ?? [], field)
        setAvailMonths(months)
      })
      .catch(() => setAvailMonths([]))
  }, [year])

  // Quand le mois change → charger les jours
  useEffect(() => {
    if (!year || month === null) { setAvailDays([]); setDay(null); return }

    const start = new Date(year, month, 1).toISOString()
    const end   = new Date(year, month + 1, 1).toISOString()
    authFetch(`/${modelKey}?perPage=9999&filters[${field}][min]=${start}&filters[${field}][max]=${end}&sortField=${field}&sortDir=asc`)
      .then(res => {
        const days = getDistinctDays(res.data ?? [], field)
        setAvailDays(days)
      })
      .catch(() => setAvailDays([]))
  }, [year, month])

  // Notifier le parent du filtre actif
  useEffect(() => {
    if (!year) { onChange(null); return }

    let dateStart, dateEnd
    if (day !== null) {
      dateStart = new Date(year, month, day).toISOString()
      dateEnd   = new Date(year, month, day + 1).toISOString()
    } else if (month !== null) {
      dateStart = new Date(year, month, 1).toISOString()
      dateEnd   = new Date(year, month + 1, 1).toISOString()
    } else {
      dateStart = new Date(year, 0, 1).toISOString()
      dateEnd   = new Date(year + 1, 0, 1).toISOString()
    }
    onChange({ dateStart, dateEnd })
  }, [year, month, day])

  function selectYear(y) {
    setYear(y === year ? null : y)
    setMonth(null)
    setDay(null)
  }

  function selectMonth(m) {
    setMonth(m === month ? null : m)
    setDay(null)
  }

  function selectDay(d) {
    setDay(d === day ? null : d)
  }

  if (loading) return null
  if (availYears.length === 0) return null

  return (
    <div style={{ fontSize: 12, color: 'var(--pk-sub)', marginBottom: 10 }}>
      {/* Fil d'Ariane */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <span
          onClick={() => { setYear(null); setMonth(null); setDay(null) }}
          style={{ cursor: 'pointer', color: year ? 'var(--pk-accent)' : 'var(--pk-muted)', fontWeight: 500 }}
        >
          Toutes les dates
        </span>

        {/* Années */}
        {availYears.map(y => (
          <span key={y}>
            <span style={{ color: 'var(--pk-border)' }}>/</span>
            <span
              onClick={() => selectYear(y)}
              style={{
                cursor: 'pointer', marginLeft: 4,
                color: year === y ? 'var(--pk-accent)' : 'var(--pk-sub)',
                fontWeight: year === y ? 600 : 400,
                textDecoration: year === y ? 'underline' : 'none',
              }}
            >
              {y}
            </span>
          </span>
        ))}
      </div>

      {/* Mois — visibles seulement si une année est sélectionnée */}
      {year && availMonths.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {availMonths.map(m => (
            <span
              key={m}
              onClick={() => selectMonth(m)}
              style={{
                cursor: 'pointer', padding: '2px 8px',
                borderRadius: 99,
                background: month === m ? 'var(--pk-accent-bg)' : 'transparent',
                color: month === m ? 'var(--pk-accent)' : 'var(--pk-sub)',
                border: `1px solid ${month === m ? 'var(--pk-accent)' : 'var(--pk-border)'}`,
                fontWeight: month === m ? 600 : 400,
                fontSize: 11,
              }}
            >
              {MONTHS_FR[m]}
            </span>
          ))}
        </div>
      )}

      {/* Jours — visibles seulement si un mois est sélectionné */}
      {year && month !== null && availDays.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {availDays.map(d => (
            <span
              key={d}
              onClick={() => selectDay(d)}
              style={{
                cursor: 'pointer',
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6,
                background: day === d ? 'var(--pk-accent)' : 'transparent',
                color: day === d ? '#fff' : 'var(--pk-sub)',
                border: `1px solid ${day === d ? 'var(--pk-accent)' : 'var(--pk-border)'}`,
                fontSize: 11, fontWeight: 500,
              }}
            >
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function getDistinctYears(data, field) {
  const set = new Set()
  for (const row of data) {
    if (row[field]) set.add(new Date(row[field]).getFullYear())
  }
  return [...set].sort((a, b) => b - a)
}

function getDistinctMonths(data, field) {
  const set = new Set()
  for (const row of data) {
    if (row[field]) set.add(new Date(row[field]).getMonth())
  }
  return [...set].sort((a, b) => a - b)
}

function getDistinctDays(data, field) {
  const set = new Set()
  for (const row of data) {
    if (row[field]) set.add(new Date(row[field]).getDate())
  }
  return [...set].sort((a, b) => a - b)
}
