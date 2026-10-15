export function driverActions(status) {
  return ({ OFFERED: ['accept', 'decline'], ACCEPTED: ['start', 'cancel'], IN_PROGRESS: ['complete'] })[status] || [];
}
export function filterDriverTrips(rides, search, status) {
  const query = search.trim().toLowerCase().replace(/^#/, '');
  return rides.filter((ride) => (status === 'ALL' || ride.status === status)
    && [ride.id, ride.passenger?.name, ride.fare.pickupLabel, ride.fare.dropoffLabel,
      ride.fare.source === 'WALK_IN' ? 'walk-in' : 'app booking'].join(' ').toLowerCase().includes(query));
}
