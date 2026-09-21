import type { CityNode } from "./gameData";

export type LandConnection = {
  id: string;
  fromCode: string;
  toCode: string;
  distanceKm: number;
};

export function landConnectionId(a: string, b: string) {
  return [a, b].sort().join("::");
}

export function buildLandConnections(
  cities: CityNode[],
  distanceBetween: (a: CityNode, b: CityNode) => number,
  routeAllowed: (a: CityNode, b: CityNode) => boolean
): LandConnection[] {
  const connections = new Map<string, LandConnection>();

  const addConnection = (
    from: CityNode,
    to: CityNode,
    distanceKm: number
  ) => {
    if (from.code === to.code) return;
    const id = landConnectionId(from.code, to.code);
    if (connections.has(id)) return;
    connections.set(id, {
      id,
      fromCode: from.code,
      toCode: to.code,
      distanceKm,
    });
  };

  const skipsIntermediateCity = (
    from: CityNode,
    to: CityNode,
    directDistance: number
  ) =>
    cities.some((middle) => {
      if (
        middle.code === from.code ||
        middle.code === to.code
      ) {
        return false;
      }

      const firstLeg = distanceBetween(from, middle);
      if (
        firstLeg < 70 ||
        firstLeg > directDistance * 0.92
      ) {
        return false;
      }

      const secondLeg = distanceBetween(middle, to);
      if (
        secondLeg < 70 ||
        secondLeg > directDistance * 0.92
      ) {
        return false;
      }

      return (
        firstLeg + secondLeg <=
        directDistance * 1.1
      );
    });

  cities.forEach((city) => {
    const nearby = cities
      .filter((candidate) => candidate.code !== city.code)
      .map((candidate) => ({
        city: candidate,
        distance: distanceBetween(city, candidate),
      }))
      .filter(({ distance }) => distance <= 1050)
      .sort((a, b) => a.distance - b.distance);

    const sameCountry = nearby
      .filter(
        ({ city: candidate, distance }) =>
          candidate.countryCode === city.countryCode &&
          distance <= 950 &&
          !skipsIntermediateCity(
            city,
            candidate,
            distance
          ) &&
          routeAllowed(city, candidate)
      )
      .slice(0, 4);

    sameCountry.forEach(({ city: candidate, distance }) =>
      addConnection(city, candidate, distance)
    );

    const crossBorder = nearby
      .filter(
        ({ city: candidate, distance }) =>
          candidate.countryCode !== city.countryCode &&
          distance <= 680 &&
          !skipsIntermediateCity(
            city,
            candidate,
            distance
          ) &&
          routeAllowed(city, candidate)
      )
      .slice(0, 3);

    crossBorder.forEach(({ city: candidate, distance }) =>
      addConnection(city, candidate, distance)
    );

    const currentDegree = Array.from(connections.values()).filter(
      (connection) =>
        connection.fromCode === city.code ||
        connection.toCode === city.code
    ).length;

    if (currentDegree === 0) {
      const fallback = nearby.find(
        ({ distance, city: candidate }) =>
          distance <= 1100 &&
          !skipsIntermediateCity(
            city,
            candidate,
            distance
          ) &&
          routeAllowed(city, candidate)
      );
      if (fallback) {
        addConnection(city, fallback.city, fallback.distance);
      }
    }
  });

  return Array.from(connections.values());
}

export function connectionBetween(
  connections: LandConnection[],
  a: string,
  b: string
) {
  const id = landConnectionId(a, b);
  return connections.find((connection) => connection.id === id);
}

export function connectedCityCodes(
  connections: LandConnection[],
  cityCode: string
) {
  const result = new Set<string>();
  connections.forEach((connection) => {
    if (connection.fromCode === cityCode) {
      result.add(connection.toCode);
    }
    if (connection.toCode === cityCode) {
      result.add(connection.fromCode);
    }
  });
  return result;
}

export function connectionRelation(
  connection: LandConnection,
  cityOwners: Record<string, string | null>,
  player: string
): "friendly" | "attack" | "frontline" | "neutral" {
  const aOwner = cityOwners[connection.fromCode] ?? null;
  const bOwner = cityOwners[connection.toCode] ?? null;

  if (aOwner === player && bOwner === player) return "friendly";
  if (
    (aOwner === player && bOwner && bOwner !== player) ||
    (bOwner === player && aOwner && aOwner !== player)
  ) {
    return "attack";
  }
  if (aOwner && bOwner && aOwner !== bOwner) return "frontline";
  return "neutral";
}
