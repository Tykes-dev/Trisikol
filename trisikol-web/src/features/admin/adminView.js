const activeStatuses = new Set(['REQUESTED', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS']);

export function terminalName(terminals, id) {
  return terminals.find((terminal) => terminal.id === id)?.name || 'Unassigned TODA';
}

export function filterDrivers(drivers, terminals, search, status) {
  const query = search.trim().toLowerCase();
  return drivers.filter(({ account, vehicle }) => {
    const matchesStatus = status === 'all' || (status === 'enabled' ? vehicle.enabled : !vehicle.enabled);
    const text = [account.name, account.mobile, vehicle.bodyNumber, vehicle.plateNumber,
      vehicle.vehicleModel, terminalName(terminals, vehicle.terminalId)].join(' ').toLowerCase();
    return matchesStatus && text.includes(query);
  });
}

export function filterRides(rides, search, status) {
  const query = search.trim().toLowerCase().replace(/^#/, '');
  return rides.filter((ride) => {
    const matchesStatus = status === 'all' || (status === 'active' ? activeStatuses.has(ride.status) : ride.status === status);
    const text = [ride.id, ride.driver?.name, ride.passenger?.name, ride.fare.pickupLabel,
      ride.fare.dropoffLabel, ride.fare.terminalName, ride.fare.source === 'WALK_IN' ? 'Walk-in' : 'App booking'].join(' ').toLowerCase();
    return matchesStatus && text.includes(query);
  });
}
