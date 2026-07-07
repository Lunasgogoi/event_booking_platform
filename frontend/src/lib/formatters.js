export function formatINR(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN')}`
}

export function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatOrganizerStatus(status) {
  const labels = {
    none: 'Not requested',
    pending: 'Pending review',
    approved: 'Approved',
    rejected: 'Rejected',
    suspended: 'Suspended',
  }

  return labels[status || 'none'] || 'Not requested'
}

export function formatEventStatus(status) {
  const labels = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under review',
    changes_requested: 'Changes requested',
    approved: 'Approved',
    rejected: 'Rejected',
    published: 'Published',
    cancelled: 'Cancelled',
    completed: 'Completed',
  }

  return labels[status] || status
}
