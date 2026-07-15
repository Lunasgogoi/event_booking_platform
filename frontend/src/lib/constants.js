export const categories = ['All', 'Music', 'Comedy', 'Business', 'Sports', 'Food']

export const contactCategories = [
  { value: 'booking', label: 'Booking issue' },
  { value: 'event', label: 'Event information' },
  { value: 'account', label: 'Account access' },
  { value: 'payment', label: 'Payment question' },
  { value: 'organizer', label: 'Organizer support' },
  { value: 'other', label: 'Other' },
]

export const supportEmail = 'support@ticketo.events'

export const eventSectionDefaults = {
  name: 'Front section',
  code: 'FRONT',
  selectionMode: 'choose_seat',
  rows: 5,
  seatsPerRow: 10,
  price: '',
}

export const eventFormDefaults = {
  title: '',
  description: '',
  category: 'Music',
  venueName: '',
  address: '',
  city: '',
  startsAt: '',
  priceFrom: '',
  totalSeats: '',
  seatingMode: 'single',
  sections: [eventSectionDefaults],
  status: 'draft',
  posterFile: null,
}

export const authFormDefaults = {
  name: '',
  email: '',
  password: '',
}
