export const money = (value) => `₱${Number(value || 0).toFixed(2)}`;
export const isActive = (ride) => ['REQUESTED', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS'].includes(ride.status);
export const statusText = (status) => ({ REQUESTED: 'Waiting for a queued driver', OFFERED: 'Waiting for driver acceptance',
  ACCEPTED: 'Driver accepted', IN_PROGRESS: 'Trip in progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' }[status] || status);
