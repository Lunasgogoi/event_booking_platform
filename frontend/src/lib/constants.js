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
  status: 'draft',
  posterFile: null,
}

export const authFormDefaults = {
  name: '',
  email: '',
  password: '',
}
