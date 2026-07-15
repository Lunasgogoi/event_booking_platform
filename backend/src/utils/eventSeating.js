const LEGACY_SECTION_CODE = 'GEN'

function getRowLabel(index) {
  let value = index + 1
  let label = ''

  while (value > 0) {
    value -= 1
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26)
  }

  return label
}

function buildSeatsFromSections(sections) {
  return sections.flatMap((section) =>
    Array.from({ length: section.rows }, (_, rowIndex) => {
      const row = getRowLabel(rowIndex)

      return Array.from({ length: section.seatsPerRow }, (_, positionIndex) => ({
        number: `${section.code}-${row}${positionIndex + 1}`,
        section: section.name,
        sectionCode: section.code,
        row,
        position: positionIndex + 1,
        price: section.price,
        status: 'available',
      }))
    }).flat(),
  )
}

function hasConfiguredSections(event) {
  return event.seatingMode === 'sections' && event.sections?.length > 0
}

function getEventSections(event) {
  if (!hasConfiguredSections(event)) {
    return [
      {
        name: 'General',
        code: LEGACY_SECTION_CODE,
        selectionMode: 'choose_seat',
        rows: Math.ceil(event.totalSeats / 10),
        seatsPerRow: Math.min(event.totalSeats, 10),
        capacity: event.totalSeats,
        availableSeats: event.availableSeats,
        price: event.priceFrom,
      },
    ]
  }

  return event.sections.map((section) => {
    const seats = event.seats.filter((seat) => seat.sectionCode === section.code)

    return {
      name: section.name,
      code: section.code,
      selectionMode: section.selectionMode,
      rows: section.rows,
      seatsPerRow: section.seatsPerRow,
      capacity: section.rows * section.seatsPerRow,
      availableSeats: seats.filter((seat) => seat.status === 'available').length,
      price: section.price,
    }
  })
}

function getSection(event, sectionCode) {
  const normalizedCode = String(sectionCode || '').trim().toUpperCase()
  return getEventSections(event).find((section) => section.code === normalizedCode)
}

function getSeatsForSection(event, sectionCode) {
  const normalizedCode = String(sectionCode || '').trim().toUpperCase()

  if (!hasConfiguredSections(event)) {
    return normalizedCode === LEGACY_SECTION_CODE ? event.seats : []
  }

  return event.seats.filter((seat) => seat.sectionCode === normalizedCode)
}

function findAdjacentSeats(seats, quantity, unavailableSeatNumbers = new Set()) {
  const availableSeats = seats.filter(
    (seat) => seat.status === 'available' && !unavailableSeatNumbers.has(seat.number),
  )
  const seatsByRow = new Map()

  availableSeats.forEach((seat) => {
    const row = seat.row || 'A'
    const rowSeats = seatsByRow.get(row) || []
    rowSeats.push(seat)
    seatsByRow.set(row, rowSeats)
  })

  for (const rowSeats of seatsByRow.values()) {
    rowSeats.sort((left, right) => (left.position || 0) - (right.position || 0))

    for (let index = 0; index <= rowSeats.length - quantity; index += 1) {
      const group = rowSeats.slice(index, index + quantity)
      const isAdjacent = group.every(
        (seat, groupIndex) => groupIndex === 0 || seat.position === group[groupIndex - 1].position + 1,
      )

      if (isAdjacent) return group
    }
  }

  return []
}

module.exports = {
  LEGACY_SECTION_CODE,
  buildSeatsFromSections,
  findAdjacentSeats,
  getEventSections,
  getRowLabel,
  getSection,
  getSeatsForSection,
  hasConfiguredSections,
}
