import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import "./styles.css";
import {
  UNIT_DEFINITIONS,
  UNIT_BY_ID,
  type UnitDefinition,
} from "./unitData";
import { UNIT_ICON_BY_ID } from "./unitIcons";
import {
  STRATEGIES,
  applyStrategy,
  strategyById,
} from "./strategyData";
import {
  CITIES,
  COUNTRIES,
  COUNTRY_BY_CODE,
  cityHasPort,
  type CityNode,
  type CountryDefinition,
} from "./gameData";
import {
  CITY_STRUCTURES,
  EMPTY_CITY_STRUCTURES,
  type CityStructureDefinition,
  type CityStructureLevels,
} from "./cityStructures";

type Screen = "lobby" | "setup" | "homeland" | "game";
type Resources = { gold: number; steel: number; oil: number };
type WorldFeature = {
  id?: string | number;
  properties?: { name?: string };
  geometry: any;
};
type Garrison = Record<string, Record<string, number>>;
type ProductionOrder = {
  id: number;
  player: string;
  cityCode: string;
  unitId: string;
  quantity: number;
  readyTurn: number;
};
type MovementOrder = {
  id: number;
  player: string;
  kind: "move" | "attack";
  fromCode: string | null;
  fromArmyId: number | null;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  targetCityCode: string | null;
  unitId: string;
  quantity: number;
  distanceKm: number;
  departureTurn: number;
  arrivalTurn: number;
};

type FieldArmy = {
  id: number;
  player: string;
  x: number;
  y: number;
  units: Record<string, number>;
};
type CapitalHold = {
  holder: string | null;
  turns: number;
};

const TERRAIN_MAP_URL =
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Blue_Marble_2002.jpg/3840px-Blue_Marble_2002.jpg";
const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 500;
const WORLD_COPIES = [-WORLD_WIDTH, 0, WORLD_WIDTH];
const AI_COLORS: Record<string, string> = {
  Dogan: "#c84a44",
  Nova: "#3ab779",
};
const DEFAULT_PLAYER = "Atlas";

function project([lon, lat]: [number, number]) {
  return [
    ((lon + 180) / 360) * WORLD_WIDTH,
    ((90 - lat) / 180) * WORLD_HEIGHT,
  ] as const;
}

function unproject([x, y]: [number, number]) {
  return [
    (wrapWorldX(x) / WORLD_WIDTH) * 360 - 180,
    90 - (y / WORLD_HEIGHT) * 180,
  ] as const;
}

function ringPath(ring: number[][]) {
  if (!ring.length) return "";
  const points = ring.map((point) =>
    project([point[0], point[1]])
  );
  return (
    "M" +
    points
      .map(([x, y], index) =>
        (index ? "L" : "") + x.toFixed(2) + "," + y.toFixed(2)
      )
      .join("") +
    "Z"
  );
}

function geometryToPath(geometry: any): string {
  if (!geometry) return "";
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(ringPath).join("");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .flatMap((polygon: number[][][]) => polygon.map(ringPath))
      .join("");
  }
  return "";
}

function pointInRing(
  lon: number,
  lat: number,
  ring: number[][]
) {
  let inside = false;
  for (
    let i = 0, j = ring.length - 1;
    i < ring.length;
    j = i++
  ) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const denominator =
      Math.abs(yj - yi) < 1e-12 ? 1e-12 : yj - yi;
    const intersects =
      yi > lat !== yj > lat &&
      lon <
        ((xj - xi) * (lat - yi)) /
          denominator +
          xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function geometryContainsPoint(
  geometry: any,
  lon: number,
  lat: number
) {
  const polygonContains = (polygon: number[][][]) => {
    if (!polygon.length) return false;
    if (!pointInRing(lon, lat, polygon[0])) return false;
    for (let index = 1; index < polygon.length; index += 1) {
      if (pointInRing(lon, lat, polygon[index])) {
        return false;
      }
    }
    return true;
  };

  if (geometry?.type === "Polygon") {
    return polygonContains(geometry.coordinates);
  }
  if (geometry?.type === "MultiPolygon") {
    return geometry.coordinates.some(polygonContains);
  }
  return false;
}

function isLandPoint(
  features: WorldFeature[],
  lon: number,
  lat: number
) {
  return features.some((feature) =>
    geometryContainsPoint(feature.geometry, lon, lat)
  );
}

function routeStaysOnSurface(
  features: WorldFeature[],
  source: { lon: number; lat: number },
  target: { lon: number; lat: number },
  surface: "land" | "naval" | "air",
  coastalDeparture = false,
  coastalArrival = false
) {
  if (surface === "air") return true;

  let dLon = target.lon - source.lon;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;

  const steps = 18;
  const startStep =
    surface === "naval" && coastalDeparture ? 4 : 1;
  const endStep =
    surface === "naval" && coastalArrival
      ? steps - 3
      : steps;

  for (let step = startStep; step <= endStep; step += 1) {
    const ratio = step / steps;
    let lon = source.lon + dLon * ratio;
    if (lon > 180) lon -= 360;
    if (lon < -180) lon += 360;
    const lat =
      source.lat + (target.lat - source.lat) * ratio;
    const isLand = isLandPoint(features, lon, lat);

    if (surface === "land" && !isLand) return false;
    if (surface === "naval" && isLand) return false;
  }

  return true;
}


const GEO_NAME_TO_CODE: Record<string, string> = {
  "Turkey": "TUR",
  "Germany": "DEU",
  "France": "FRA",
  "United Kingdom": "GBR",
  "Italy": "ITA",
  "Spain": "ESP",
  "Poland": "POL",
  "United States of America": "USA",
  "United States": "USA",
  "Russia": "RUS",
  "China": "CHN",
  "Japan": "JPN",
  "India": "IND",
  "Brazil": "BRA",
  "Australia": "AUS",
  "Portugal": "PRT",
  "Ireland": "IRL",
  "Netherlands": "NLD",
  "Belgium": "BEL",
  "Switzerland": "CHE",
  "Austria": "AUT",
  "Czechia": "CZE",
  "Czech Republic": "CZE",
  "Czech Rep.": "CZE",
  "Slovakia": "SVK",
  "Hungary": "HUN",
  "Romania": "ROU",
  "Bulgaria": "BGR",
  "Greece": "GRC",
  "Denmark": "DNK",
  "Norway": "NOR",
  "Sweden": "SWE",
  "Finland": "FIN",
  "Ukraine": "UKR",
  "Belarus": "BLR",
  "Lithuania": "LTU",
  "Latvia": "LVA",
  "Estonia": "EST",
  "Serbia": "SRB",
  "Croatia": "HRV",
  "Slovenia": "SVN",
  "Bosnia and Herzegovina": "BIH",
  "Bosnia and Herz.": "BIH",
  "Albania": "ALB",
  "North Macedonia": "MKD",
  "Macedonia": "MKD",
  "Montenegro": "MNE",
};

function featureCountryCode(feature: WorldFeature) {
  const id = String(feature.id ?? "")
    .trim()
    .toUpperCase();
  if (id) return id;
  return (
    GEO_NAME_TO_CODE[feature.properties?.name ?? ""] ??
    ""
  );
}

function geometryOuterRings(geometry: any): number[][][] {
  if (geometry?.type === "Polygon") {
    return geometry.coordinates?.[0]
      ? [geometry.coordinates[0]]
      : [];
  }
  if (geometry?.type === "MultiPolygon") {
    return (geometry.coordinates ?? [])
      .map((polygon: number[][][]) => polygon?.[0])
      .filter(Boolean);
  }
  return [];
}

function ringSignedArea(ring: number[][]) {
  let area = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function ringCentroid(ring: number[][]): [number, number] {
  const area = ringSignedArea(ring);
  if (Math.abs(area) < 1e-9) {
    const sums = ring.reduce(
      (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
      [0, 0]
    );
    return [
      sums[0] / Math.max(1, ring.length),
      sums[1] / Math.max(1, ring.length),
    ];
  }

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const cross = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  const factor = 1 / (6 * area);
  return [cx * factor, cy * factor];
}

function geometryRepresentativePoint(
  geometry: any
): [number, number] {
  const rings = geometryOuterRings(geometry);
  if (!rings.length) return [0, 0];

  const largest = rings.reduce((best, ring) =>
    Math.abs(ringSignedArea(ring)) >
    Math.abs(ringSignedArea(best))
      ? ring
      : best
  );

  const centroid = ringCentroid(largest);
  if (
    geometryContainsPoint(
      geometry,
      centroid[0],
      centroid[1]
    )
  ) {
    return centroid;
  }

  const sample = largest[Math.floor(largest.length / 3)] ??
    largest[0] ??
    [0, 0];
  return [sample[0], sample[1]];
}

function geometryBounds(geometry: any) {
  const rings = geometryOuterRings(geometry);
  const points = rings.flat();
  if (!points.length) {
    return {
      minLon: 0,
      maxLon: 0,
      minLat: 0,
      maxLat: 0,
    };
  }
  return points.reduce(
    (bounds, [lon, lat]) => ({
      minLon: Math.min(bounds.minLon, lon),
      maxLon: Math.max(bounds.maxLon, lon),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat),
    }),
    {
      minLon: Number.POSITIVE_INFINITY,
      maxLon: Number.NEGATIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
    }
  );
}

function generatedCityPoints(
  geometry: any,
  count: number
): [number, number][] {
  const center = geometryRepresentativePoint(geometry);
  const rings = geometryOuterRings(geometry);
  const largest = rings.length
    ? rings.reduce((best, ring) =>
        Math.abs(ringSignedArea(ring)) >
        Math.abs(ringSignedArea(best))
          ? ring
          : best
      )
    : [];

  const points: [number, number][] = [center];
  if (!largest.length || count <= 1) return points;

  for (let i = 1; i < count; i += 1) {
    const index = Math.floor(
      ((i * largest.length) / count + largest.length * 0.11) %
        largest.length
    );
    const boundary = largest[index] ?? largest[0];
    let factor = 0.48;
    let candidate: [number, number] = [
      center[0] + (boundary[0] - center[0]) * factor,
      center[1] + (boundary[1] - center[1]) * factor,
    ];

    while (
      factor > 0.12 &&
      !geometryContainsPoint(
        geometry,
        candidate[0],
        candidate[1]
      )
    ) {
      factor -= 0.08;
      candidate = [
        center[0] + (boundary[0] - center[0]) * factor,
        center[1] + (boundary[1] - center[1]) * factor,
      ];
    }

    points.push(candidate);
  }
  return points;
}

function generatedRegion(lon: number, lat: number) {
  if (lat > 35 && lon >= -25 && lon <= 60) return "Avrupa";
  if (lat > 10 && lon > 60) return "Asya";
  if (lat < -10 && lon > 100) return "Okyanusya";
  if (lon < -30 && lat > 5) return "Kuzey Amerika";
  if (lon < -30 && lat <= 5) return "Güney Amerika";
  if (lon >= -25 && lon <= 60 && lat <= 35) return "Afrika / Orta Doğu";
  return "Dünya";
}

function generatedResource(code: string): "Altın" | "Çelik" | "Petrol" {
  const score = [...code].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );
  return score % 3 === 0
    ? "Petrol"
    : score % 3 === 1
      ? "Çelik"
      : "Altın";
}

const LANDLOCKED_COUNTRY_CODES = new Set([
  "AFG","AND","ARM","AUT","BLR","BTN","BOL","BWA",
  "BFA","BDI","CAF","TCD","CZE","ETH","HUN","KAZ",
  "KGZ","LAO","LSO","LIE","LUX","MKD","MWI","MLI",
  "MDA","MNG","NPL","NER","PRY","RWA","SMR","SRB",
  "SVK","SSD","SWZ","CHE","TJK","TKM","UGA","UZB",
  "VAT","ZMB","ZWE"
]);

function wrapWorldX(value: number) {
  return ((value % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH;
}

function shortestWrappedTargetX(sourceX: number, targetX: number) {
  const options = [
    targetX - WORLD_WIDTH,
    targetX,
    targetX + WORLD_WIDTH,
  ];
  return options.reduce((best, value) =>
    Math.abs(value - sourceX) < Math.abs(best - sourceX)
      ? value
      : best
  );
}

function haversinePoints(
  a: { lon: number; lat: number },
  b: { lon: number; lat: number }
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  let dLon = b.lon - a.lon;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const dLonRad = toRad(dLon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLonRad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function haversineKm(a: CityNode, b: CityNode) {
  return haversinePoints(a, b);
}

function movementRangeKm(unit: UnitDefinition) {
  // movement stat is converted into a realistic per-turn world distance.
  // Land units advance hundreds of km per turn; aircraft and ships cover more.
  const kmPerMovementPoint =
    unit.domain === "air"
      ? 180
      : unit.domain === "naval"
        ? 150
        : 105;

  const minimumRange =
    unit.domain === "air"
      ? 700
      : unit.domain === "naval"
        ? 600
        : 180;

  return Math.round(
    Math.max(
      minimumRange,
      unit.stats.movement * kmPerMovementPoint
    )
  );
}

function productionTurns(unit: UnitDefinition) {
  if (unit.domain === "naval") return 3;
  if (
    unit.id === "heavy_tank" ||
    unit.id === "fighter" ||
    unit.id === "bomber"
  ) {
    return 2;
  }
  return 1;
}

function productionCost(unit: UnitDefinition, quantity: number) {
  const gold = unit.stats.cost * quantity;
  const steel =
    unit.domain === "land"
      ? Math.round(unit.stats.cost * 0.18 * quantity)
      : Math.round(unit.stats.cost * 0.08 * quantity);
  const oil =
    unit.domain === "air" || unit.domain === "naval"
      ? Math.round(unit.stats.cost * 0.16 * quantity)
      : Math.round(unit.stats.cost * 0.03 * quantity);
  return { gold, steel, oil };
}

function unitDefensePower(units: Record<string, number>) {
  return Object.entries(units).reduce((sum, [unitId, quantity]) => {
    const unit = UNIT_BY_ID[unitId];
    if (!unit) return sum;
    return (
      sum +
      quantity *
        Math.max(1, unit.stats.defense) *
        Math.max(1, unit.stats.hp / 7)
    );
  }, 0);
}

function unitAttackPower(
  units: Record<string, number>,
  transform?: (unit: UnitDefinition) => UnitDefinition
) {
  return Object.entries(units).reduce((sum, [unitId, quantity]) => {
    const base = UNIT_BY_ID[unitId];
    if (!base) return sum;
    const unit = transform ? transform(base) : base;
    return (
      sum +
      quantity *
        Math.max(1, unit.stats.attack) *
        (1 + unit.stats.critical / 25) *
        Math.max(0.7, unit.stats.hp / 7)
    );
  }, 0);
}

function scaleArmy(
  units: Record<string, number>,
  survivorRatio: number
) {
  const next: Record<string, number> = {};
  Object.entries(units).forEach(([unitId, quantity]) => {
    const left = Math.max(
      0,
      Math.round(quantity * survivorRatio)
    );
    if (left > 0) next[unitId] = left;
  });
  return next;
}

function mergeArmy(
  target: Record<string, number>,
  incoming: Record<string, number>
) {
  const next = { ...target };
  Object.entries(incoming).forEach(([unitId, quantity]) => {
    next[unitId] = (next[unitId] ?? 0) + quantity;
  });
  return next;
}

function startingGarrison(
  city: CityNode,
  hasPort = cityHasPort(city.code)
) {
  const base: Record<string, number> = city.isCapital
    ? {
        infantry: 80,
        militia: 30,
        light_tank: 14,
        heavy_tank: 5,
        fighter: 5,
        attack_helicopter: 4,
        transport_plane: 3,
      }
    : {
        infantry: 12 + city.recruitCapacity * 4,
        militia: 6,
        light_tank:
          Math.max(0, city.recruitCapacity - 1) * 2,
      };

  if (hasPort) {
    base.support_ship = city.isCapital ? 3 : 2;
    base.destroyer = city.isCapital ? 2 : 1;
  }

  return base;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [world, setWorld] = useState<WorldFeature[]>([]);
  const [mapError, setMapError] = useState("");

  const [commander, setCommander] = useState(DEFAULT_PLAYER);
  const currentPlayer = commander.trim() || DEFAULT_PLAYER;
  const [roomName, setRoomName] = useState("Global War");
  const [startingMoney, setStartingMoney] = useState(10000);
  const [turnMinutes, setTurnMinutes] = useState(4);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [selectedStrategy, setSelectedStrategy] = useState("balanced");
  const [playerColor, setPlayerColor] = useState("#2b95eb");
  const [victoryHoldTurns, setVictoryHoldTurns] = useState(2);
  const [maxGameTurns, setMaxGameTurns] = useState(50);
  const [setupTab, setSetupTab] =
    useState<"basic" | "victory" | "advanced">("basic");

  const [selectedHomeland, setSelectedHomeland] = useState("");
  const [resources, setResources] = useState<Resources>({
    gold: 0,
    steel: 0,
    oil: 0,
  });
  const [aiResources, setAiResources] = useState<
    Record<string, Resources>
  >({});
  const [turn, setTurn] = useState(1);
  const [countryOwners, setCountryOwners] = useState<
    Record<string, string | null>
  >({});
  const [cityOwners, setCityOwners] = useState<
    Record<string, string | null>
  >({});
  const [garrisons, setGarrisons] = useState<Garrison>({});
  const [productionQueue, setProductionQueue] = useState<
    ProductionOrder[]
  >([]);
  const [movementQueue, setMovementQueue] = useState<
    MovementOrder[]
  >([]);
  const [fieldArmies, setFieldArmies] = useState<FieldArmy[]>([]);
  const [selectedFieldArmyId, setSelectedFieldArmyId] = useState<
    number | null
  >(null);
  const [fieldArmyPanelOpen, setFieldArmyPanelOpen] =
    useState(false);
  const [moveSourceArmyId, setMoveSourceArmyId] = useState<
    number | null
  >(null);
  const [moveDragTarget, setMoveDragTarget] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const moveDragRef = useRef<{ pointerId: number } | null>(null);
  const [capitalHolds, setCapitalHolds] = useState<
    Record<string, CapitalHold>
  >({});
  const [homeCountries, setHomeCountries] = useState<
    Record<string, string>
  >({});
  const [winner, setWinner] = useState<string | null>(null);

  const [selectedCountry, setSelectedCountry] = useState("TUR");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [cityPanelOpen, setCityPanelOpen] = useState(false);
  const [cityWindowPosition, setCityWindowPosition] = useState({
    x: 30,
    y: 46,
  });
  const cityWindowDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [productionUsedThisTurn, setProductionUsedThisTurn] =
    useState<Record<string, number>>({});
  const productionUsedRef = useRef<Record<string, number>>({});
  const [cityStructures, setCityStructures] = useState<
    Record<string, CityStructureLevels>
  >({});
  const [cityTab, setCityTab] =
    useState<"production" | "movement">("production");
  const [moveDraft, setMoveDraft] = useState<
    Record<string, number>
  >({});
  const [moveSourceCode, setMoveSourceCode] = useState<
    string | null
  >(null);
  const [notice, setNotice] = useState(
    "Yeni bir oyun oluşturarak başlayabilirsin."
  );
  const [lastTurnEvents, setLastTurnEvents] = useState<string[]>([]);

  const [mapZoom, setMapZoom] = useState(1);
  const [mapCenter, setMapCenter] = useState({
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
  });
  const dragRef = useRef<{
    x: number;
    y: number;
    centerX: number;
    centerY: number;
    moved: boolean;
  } | null>(null);
  const orderIdRef = useRef(1);

  useEffect(() => {
    fetch(WORLD_GEOJSON_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Harita verisi alınamadı.");
        }
        return response.json();
      })
      .then((data) => {
        setWorld(data.features ?? []);
      })
      .catch((error) => {
        setMapError(error instanceof Error ? error.message : "Harita hatası");
      });
  }, []);

  const generatedWorldData = useMemo(() => {
    const extraCountries: CountryDefinition[] = [];
    const extraCities: CityNode[] = [];
    const extraPortCodes = new Set<string>();

    world.forEach((feature) => {
      const code = featureCountryCode(feature);
      if (
        !/^[A-Z]{3}$/.test(code) ||
        code === "ATA" ||
        COUNTRY_BY_CODE[code]
      ) {
        return;
      }

      const name =
        feature.properties?.name?.trim() || code;
      const [centerLon, centerLat] =
        geometryRepresentativePoint(feature.geometry);
      const bounds = geometryBounds(feature.geometry);
      const lonSpan = Math.max(
        0.2,
        Math.min(
          80,
          Math.abs(bounds.maxLon - bounds.minLon)
        )
      );
      const latSpan = Math.max(
        0.2,
        Math.abs(bounds.maxLat - bounds.minLat)
      );
      const sizeScore =
        lonSpan *
        latSpan *
        Math.max(
          0.25,
          Math.cos((centerLat * Math.PI) / 180)
        );

      const cityCount =
        sizeScore > 700
          ? 5
          : sizeScore > 220
            ? 4
            : sizeScore > 70
              ? 3
              : sizeScore > 12
                ? 2
                : 1;

      const purchasePrice =
        900 +
        cityCount * 650 +
        Math.min(1800, Math.round(sizeScore * 1.8));

      extraCountries.push({
        code,
        name,
        region: generatedRegion(centerLon, centerLat),
        purchasePrice,
        primaryResource: generatedResource(code),
      });

      const cityPoints = generatedCityPoints(
        feature.geometry,
        cityCount
      );
      const directionNames = [
        "Başkent",
        "Kuzey Bölgesi",
        "Güney Bölgesi",
        "Batı Bölgesi",
        "Doğu Bölgesi",
      ];

      cityPoints.forEach(([lon, lat], index) => {
        const isCapital = index === 0;
        const capacity = isCapital
          ? cityCount >= 4
            ? 3
            : 2
          : cityCount >= 5 && index === 1
            ? 2
            : 1;
        const cityCode = `${code}-AUTO${index + 1}`;
        extraCities.push({
          code: cityCode,
          countryCode: code,
          name: isCapital
            ? `${name} Başkent`
            : `${name} ${directionNames[index] ?? `Bölge ${index}`}`,
          lon,
          lat,
          isCapital,
          recruitCapacity: capacity,
          income:
            230 +
            capacity * 120 +
            Math.round(Math.min(260, sizeScore / 3)),
          growth:
            14 +
            capacity * 8 +
            Math.round(Math.min(24, sizeScore / 45)),
        });

        const portIndex = cityCount > 1 ? 1 : 0;
        if (
          index === portIndex &&
          !LANDLOCKED_COUNTRY_CODES.has(code)
        ) {
          extraPortCodes.add(cityCode);
        }
      });
    });

    return {
      countries: [...COUNTRIES, ...extraCountries],
      cities: [...CITIES, ...extraCities],
      portCodes: extraPortCodes,
    };
  }, [world]);

  const allCountries = generatedWorldData.countries;
  const allCities = generatedWorldData.cities;
  const allCountryByCode = useMemo(
    () =>
      Object.fromEntries(
        allCountries.map((country) => [
          country.code,
          country,
        ])
      ) as Record<string, CountryDefinition>,
    [allCountries]
  );
  const allCitiesForCountry = (code: string) =>
    allCities.filter(
      (city) => city.countryCode === code
    );
  const hasPortCode = (cityCode: string) =>
    cityHasPort(cityCode) ||
    generatedWorldData.portCodes.has(cityCode);
  const structuresForCity = (cityCode: string) => ({
    ...EMPTY_CITY_STRUCTURES,
    ...(cityStructures[cityCode] ?? {}),
  });
  const effectiveRecruitCapacity = (city: CityNode) =>
    city.recruitCapacity +
    structuresForCity(city.code).recruitment;

  const strategy = strategyById(selectedStrategy);
  const selectedCity = allCities.find(
    (city) => city.code === selectedCityCode
  );
  const selectedCityOwner = selectedCity
    ? cityOwners[selectedCity.code] ?? null
    : null;
  const selectedGarrison = selectedCity
    ? garrisons[selectedCity.code] ?? {}
    : {};
  const selectedCountryDefinition =
    allCountryByCode[selectedCountry];
  const selectedCountryCities =
    allCitiesForCountry(selectedCountry);
  const selectedCountryOwnedCities =
    selectedCountryCities.filter(
      (city) => cityOwners[city.code] === currentPlayer
    );
  const selectedStrategicOwner =
    countryOwners[selectedCountry] ?? null;
  const selectedStrategicOwnedCities =
    selectedStrategicOwner
      ? selectedCountryCities.filter(
          (city) =>
            cityOwners[city.code] ===
            selectedStrategicOwner
        )
      : [];
  const selectedNeutralCities =
    selectedCountryCities.filter(
      (city) => !cityOwners[city.code]
    );
  const selectedCityStructures = selectedCity
    ? structuresForCity(selectedCity.code)
    : EMPTY_CITY_STRUCTURES;
  const selectedCityRecruitCapacity = selectedCity
    ? effectiveRecruitCapacity(selectedCity)
    : 0;
  const selectedCapital = selectedCountryCities.find(
    (city) => city.isCapital
  );
  const selectedCapitalOwner = selectedCapital
    ? cityOwners[selectedCapital.code] ?? null
    : null;

  const mapViewWidth = WORLD_WIDTH / mapZoom;
  const mapViewHeight = WORLD_HEIGHT / mapZoom;
  const mapViewBox = `${mapCenter.x - mapViewWidth / 2} ${mapCenter.y - mapViewHeight / 2} ${mapViewWidth} ${mapViewHeight}`;

  const selectedHomelandData =
    allCountryByCode[selectedHomeland];
  const homelandCities = selectedHomeland
    ? allCitiesForCountry(selectedHomeland)
    : [];
  const homelandCapital = homelandCities.find(
    (city) => city.isCapital
  );

  const selectedFieldArmy = selectedFieldArmyId
    ? fieldArmies.find((army) => army.id === selectedFieldArmyId)
    : undefined;

  const moveSelectionEntries = Object.entries(moveDraft).filter(
    ([, quantity]) => quantity > 0
  );
  const moveSelectionCount = moveSelectionEntries.reduce(
    (sum, [, quantity]) => sum + quantity,
    0
  );
  const selectedMoveDomains = new Set(
    moveSelectionEntries
      .map(([unitId]) => UNIT_BY_ID[unitId]?.domain)
      .filter(Boolean)
  );
  const selectedLandCount = moveSelectionEntries.reduce(
    (sum, [unitId, quantity]) =>
      UNIT_BY_ID[unitId]?.domain === "land"
        ? sum + quantity
        : sum,
    0
  );
  const selectedSupportShips =
    moveDraft.support_ship ?? 0;
  const selectedTransportPlanes =
    moveDraft.transport_plane ?? 0;
  const seaTransportCapacity =
    selectedSupportShips *
    (UNIT_BY_ID.support_ship?.stats.capacity ?? 0);
  const airTransportCapacity =
    selectedTransportPlanes *
    (UNIT_BY_ID.transport_plane?.stats.capacity ?? 0);
  const hasLand = selectedMoveDomains.has("land");
  const hasNaval = selectedMoveDomains.has("naval");
  const hasAir = selectedMoveDomains.has("air");
  const validSeaTransport =
    hasLand &&
    hasNaval &&
    !hasAir &&
    selectedSupportShips > 0 &&
    selectedLandCount <= seaTransportCapacity;
  const validAirTransport =
    hasLand &&
    hasAir &&
    !hasNaval &&
    selectedTransportPlanes > 0 &&
    selectedLandCount <= airTransportCapacity;

  const moveSurface:
    | "none"
    | "land"
    | "naval"
    | "air"
    | "naval_transport"
    | "air_transport"
    | "mixed" =
    moveSelectionEntries.length === 0
      ? "none"
      : validSeaTransport
        ? "naval_transport"
        : validAirTransport
          ? "air_transport"
          : [hasLand, hasNaval, hasAir].filter(Boolean).length > 1
            ? "mixed"
            : hasLand
              ? "land"
              : hasNaval
                ? "naval"
                : "air";

  const transportCapacityIssue =
    hasLand && hasNaval && !hasAir
      ? selectedSupportShips <= 0
        ? "Deniz nakliyesi için en az 1 Destek Gemisi seç."
        : selectedLandCount > seaTransportCapacity
          ? `Gemi kapasitesi yetersiz: ${selectedLandCount}/${seaTransportCapacity} kara birimi.`
          : ""
      : hasLand && hasAir && !hasNaval
        ? selectedTransportPlanes <= 0
          ? "Hava nakliyesi için en az 1 Nakliye Uçağı seç."
          : selectedLandCount > airTransportCapacity
            ? `Nakliye uçağı kapasitesi yetersiz: ${selectedLandCount}/${airTransportCapacity} kara birimi.`
            : ""
        : hasLand && hasAir && hasNaval
          ? "Kara, hava ve deniz birliklerini tek taşıma grubunda birleştiremezsin."
          : "";

  const transportModeLabel =
    moveSurface === "naval_transport"
      ? `Deniz nakliyesi · ${selectedLandCount}/${seaTransportCapacity}`
      : moveSurface === "air_transport"
        ? `Hava nakliyesi · ${selectedLandCount}/${airTransportCapacity}`
        : "";

  const activeMoveSourceCity = moveSourceCode
    ? allCities.find((city) => city.code === moveSourceCode)
    : undefined;
  const activeMoveSourceArmy = moveSourceArmyId
    ? fieldArmies.find((army) => army.id === moveSourceArmyId)
    : undefined;

  const activeMoveSource = activeMoveSourceCity
    ? (() => {
        const [x, y] = project([
          activeMoveSourceCity.lon,
          activeMoveSourceCity.lat,
        ]);
        return {
          sourceKind: "city" as const,
          id: activeMoveSourceCity.code,
          label: activeMoveSourceCity.name,
          x,
          y,
          lon: activeMoveSourceCity.lon,
          lat: activeMoveSourceCity.lat,
        };
      })()
    : activeMoveSourceArmy
      ? (() => {
          const [lon, lat] = unproject([
            activeMoveSourceArmy.x,
            activeMoveSourceArmy.y,
          ]);
          return {
            sourceKind: "army" as const,
            id: activeMoveSourceArmy.id,
            label: "Saha Birliği",
            x: activeMoveSourceArmy.x,
            y: activeMoveSourceArmy.y,
            lon,
            lat,
          };
        })()
      : undefined;

  const previewMoveSource =
    activeMoveSource ??
    (cityPanelOpen &&
    cityTab === "movement" &&
    selectedCityOwner === currentPlayer &&
    selectedCity
      ? (() => {
          const [x, y] = project([
            selectedCity.lon,
            selectedCity.lat,
          ]);
          return {
            sourceKind: "city" as const,
            id: selectedCity.code,
            label: selectedCity.name,
            x,
            y,
            lon: selectedCity.lon,
            lat: selectedCity.lat,
          };
        })()
      : fieldArmyPanelOpen &&
          selectedFieldArmy?.player === currentPlayer
        ? (() => {
            const [lon, lat] = unproject([
              selectedFieldArmy.x,
              selectedFieldArmy.y,
            ]);
            return {
              sourceKind: "army" as const,
              id: selectedFieldArmy.id,
              label: "Saha Birliği",
              x: selectedFieldArmy.x,
              y: selectedFieldArmy.y,
              lon,
              lat,
            };
          })()
        : undefined);

  const activeMoveRangeKm = useMemo(() => {
    if (!moveSelectionEntries.length) return 0;
    const movingUnits = moveSelectionEntries
      .map(([unitId]) => UNIT_BY_ID[unitId])
      .filter((unit): unit is UnitDefinition => Boolean(unit))
      .filter((unit) =>
        moveSurface === "naval_transport"
          ? unit.domain === "naval"
          : moveSurface === "air_transport"
            ? unit.domain === "air"
            : true
      );
    const ranges = movingUnits.map((unit) =>
      movementRangeKm(applyStrategy(unit, selectedStrategy))
    );
    return ranges.length ? Math.min(...ranges) : 0;
  }, [moveDraft, selectedStrategy, moveSurface]);
  const activeMoveRangeRadius =
    (activeMoveRangeKm / 40075) * WORLD_WIDTH;

  useEffect(() => {
    if (screen !== "game") return;

    if (
      cityPanelOpen &&
      cityTab === "movement" &&
      selectedCity &&
      selectedCityOwner === currentPlayer
    ) {
      if (moveSelectionCount > 0) {
        setMoveSourceCode(selectedCity.code);
        setMoveSourceArmyId(null);
        setNotice(
          `${selectedCity.name}: ${moveSelectionCount} birlik seçildi. Sarı birlik işaretini yeşil alan içinde sürükle.`
        );
      } else if (
        moveSourceCode === selectedCity.code &&
        !moveDragRef.current
      ) {
        setMoveSourceCode(null);
        setMoveDragTarget(null);
      }
      return;
    }

    if (
      fieldArmyPanelOpen &&
      selectedFieldArmy?.player === currentPlayer
    ) {
      if (moveSelectionCount > 0) {
        setMoveSourceArmyId(selectedFieldArmy.id);
        setMoveSourceCode(null);
        setNotice(
          `Saha birliği: ${moveSelectionCount} birlik seçildi. Sarı birlik işaretini yeşil alan içinde tekrar sürükleyebilirsin.`
        );
      } else if (
        moveSourceArmyId === selectedFieldArmy.id &&
        !moveDragRef.current
      ) {
        setMoveSourceArmyId(null);
        setMoveDragTarget(null);
      }
    }
  }, [
    screen,
    cityPanelOpen,
    cityTab,
    selectedCityCode,
    selectedCityOwner,
    fieldArmyPanelOpen,
    selectedFieldArmyId,
    currentPlayer,
    moveSelectionCount,
  ]);

  const playerCountries = allCountries.filter(
    (country) => countryOwners[country.code] === currentPlayer
  );

  function setZoom(nextZoom: number) {
    const zoom = Math.max(1, Math.min(4.5, nextZoom));
    setMapZoom(zoom);
    setMapCenter((current) => {
      const viewHeight = WORLD_HEIGHT / zoom;
      return {
        x: wrapWorldX(current.x),
        y: Math.max(
          viewHeight / 2,
          Math.min(
            WORLD_HEIGHT - viewHeight / 2,
            current.y
          )
        ),
      };
    });
  }

  function resetMap() {
    setMapZoom(1);
    setMapCenter({
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
    });
  }

  function pointerWorldPosition(
    event: ReactPointerEvent<SVGSVGElement>
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x =
      mapCenter.x -
      mapViewWidth / 2 +
      ((event.clientX - rect.left) / Math.max(1, rect.width)) *
        mapViewWidth;
    const y =
      mapCenter.y -
      mapViewHeight / 2 +
      ((event.clientY - rect.top) / Math.max(1, rect.height)) *
        mapViewHeight;
    return {
      x,
      y: Math.max(0, Math.min(WORLD_HEIGHT, y)),
    };
  }

  function handleMapDown(
    event: ReactPointerEvent<SVGSVGElement>
  ) {
    if (event.button !== 0 || moveDragRef.current) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      centerX: mapCenter.x,
      centerY: mapCenter.y,
      moved: false,
    };
  }

  function handleMapMove(
    event: ReactPointerEvent<SVGSVGElement>
  ) {
    if (moveDragRef.current) {
      setMoveDragTarget(pointerWorldPosition(event));
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pixelDx = event.clientX - drag.x;
    const pixelDy = event.clientY - drag.y;
    if (Math.abs(pixelDx) + Math.abs(pixelDy) > 4) {
      drag.moved = true;
    }
    const dx =
      (pixelDx / Math.max(1, rect.width)) * mapViewWidth;
    const dy =
      (pixelDy / Math.max(1, rect.height)) * mapViewHeight;
    const halfHeight = mapViewHeight / 2;
    setMapCenter({
      x: wrapWorldX(drag.centerX - dx),
      y: Math.max(
        halfHeight,
        Math.min(
          WORLD_HEIGHT - halfHeight,
          drag.centerY - dy
        )
      ),
    });
  }

  function handleMapUp(
    event: ReactPointerEvent<SVGSVGElement>
  ) {
    if (
      moveDragRef.current &&
      (moveSourceCode || moveSourceArmyId)
    ) {
      const target = moveDragTarget ?? pointerWorldPosition(event);
      issueFreeMovement(target.x, target.y);
      moveDragRef.current = null;
      setMoveDragTarget(null);
      return;
    }
    dragRef.current = null;
  }

  function handleWheel(
    event: ReactWheelEvent<SVGSVGElement>
  ) {
    event.preventDefault();
    setZoom(
      mapZoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15)
    );
  }

  function effectiveUnit(unit: UnitDefinition) {
    return applyStrategy(unit, selectedStrategy);
  }

  function beginCampaign(countryCode: string) {
    const country = allCountryByCode[countryCode];
    if (!country) return;
    if (country.purchasePrice > startingMoney) {
      setNotice("Bu ülke için başlangıç paran yeterli değil.");
      return;
    }

    const opponents = ["RUS", "FRA", "USA", "CHN", "DEU", "JPN"]
      .filter((code) => code !== countryCode)
      .slice(0, 2);
    const [doganCountry, novaCountry] = opponents;

    setHomeCountries({
      [currentPlayer]: countryCode,
      ...(doganCountry ? { Dogan: doganCountry } : {}),
      ...(novaCountry ? { Nova: novaCountry } : {}),
    });
    const initialAiResources: Record<string, Resources> = {};
    if (doganCountry) {
      const botCountry = allCountryByCode[doganCountry];
      initialAiResources.Dogan = {
        gold: Math.max(
          3000,
          startingMoney - (botCountry?.purchasePrice ?? 0)
        ),
        steel: 900,
        oil: 720,
      };
    }
    if (novaCountry) {
      const botCountry = allCountryByCode[novaCountry];
      initialAiResources.Nova = {
        gold: Math.max(
          3000,
          startingMoney - (botCountry?.purchasePrice ?? 0)
        ),
        steel: 900,
        oil: 720,
      };
    }
    setAiResources(initialAiResources);
    setWinner(null);

    const nextCountryOwners: Record<string, string | null> = {};
    allCountries.forEach((item) => {
      nextCountryOwners[item.code] = null;
    });
    nextCountryOwners[countryCode] = currentPlayer;
    if (doganCountry) nextCountryOwners[doganCountry] = "Dogan";
    if (novaCountry) nextCountryOwners[novaCountry] = "Nova";

    const nextCityOwners: Record<string, string | null> = {};
    const nextGarrisons: Garrison = {};
    allCities.forEach((city) => {
      let owner: string | null = null;
      if (city.countryCode === countryCode) owner = currentPlayer;
      if (city.countryCode === doganCountry) owner = "Dogan";
      if (city.countryCode === novaCountry) owner = "Nova";
      nextCityOwners[city.code] = owner;
      if (owner) {
        nextGarrisons[city.code] = startingGarrison(
          city,
          hasPortCode(city.code)
        );
      }
    });

    setCountryOwners(nextCountryOwners);
    setCityOwners(nextCityOwners);
    setGarrisons(nextGarrisons);
    setCityStructures({});
    setProductionQueue([]);
    productionUsedRef.current = {};
    setProductionUsedThisTurn({});
    setMovementQueue([]);
    setFieldArmies([]);
    setSelectedFieldArmyId(null);
    setFieldArmyPanelOpen(false);
    setMoveSourceArmyId(null);
    setCapitalHolds({});
    setLastTurnEvents([]);
    setResources({
      gold: startingMoney - country.purchasePrice,
      steel: 900,
      oil: 720,
    });
    setTurn(1);
    setSelectedCountry(countryCode);
    const capital = allCitiesForCountry(countryCode).find(
      (city) => city.isCapital
    );
    if (capital) {
      setSelectedCityCode(capital.code);
      const [x, y] = project([capital.lon, capital.lat]);
      setMapCenter({ x, y });
      setMapZoom(2.7);
    }
    setCityPanelOpen(false);
    setMoveSourceCode(null);
    setMoveDraft({});
    setNotice(
      `${country.name} satın alındı. ${country.purchasePrice.toLocaleString("tr-TR")} Altın ödendi; kalan ${(
        startingMoney - country.purchasePrice
      ).toLocaleString("tr-TR")} Altın.`
    );
    setScreen("game");
  }

  function buildCityStructure(
    city: CityNode,
    structure: CityStructureDefinition
  ) {
    if (cityOwners[city.code] !== currentPlayer) {
      setNotice(
        "Şehir yapıları yalnızca kendi kontrolündeki şehirlerde kurulabilir."
      );
      return;
    }

    const levels = structuresForCity(city.code);
    const currentLevel = levels[structure.id] ?? 0;

    if (currentLevel >= structure.maxLevel) {
      setNotice(
        `${structure.name} zaten maksimum seviye ${structure.maxLevel}.`
      );
      return;
    }

    const levelMultiplier = currentLevel + 1;
    const goldCost = structure.goldCost * levelMultiplier;
    const steelCost = structure.steelCost * levelMultiplier;
    const oilCost = structure.oilCost * levelMultiplier;

    if (
      resources.gold < goldCost ||
      resources.steel < steelCost ||
      resources.oil < oilCost
    ) {
      setNotice(
        `${structure.name} için yeterli kaynağın yok.`
      );
      return;
    }

    setResources((current) => ({
      gold: current.gold - goldCost,
      steel: current.steel - steelCost,
      oil: current.oil - oilCost,
    }));

    setCityStructures((current) => ({
      ...current,
      [city.code]: {
        ...EMPTY_CITY_STRUCTURES,
        ...(current[city.code] ?? {}),
        [structure.id]: currentLevel + 1,
      },
    }));

    setNotice(
      `${city.name}: ${structure.name} seviye ${currentLevel + 1} tamamlandı.`
    );
  }

  function queueProduction(
    city: CityNode,
    unit: UnitDefinition,
    requestedQuantity: number
  ) {
    if (cityOwners[city.code] !== currentPlayer) {
      setNotice("Sadece kendi şehrinde üretim yapabilirsin.");
      return;
    }

    if (requestedQuantity <= 0) return;

    if (unit.domain === "naval" && !hasPortCode(city.code)) {
      setNotice(
        `${city.name} şehrinde liman yok. Deniz birlikleri yalnızca liman şehirlerinde üretilebilir.`
      );
      return;
    }

    const alreadyProduced =
      productionUsedRef.current[city.code] ?? 0;
    const recruitCapacity =
      effectiveRecruitCapacity(city);
    const remainingCapacity = Math.max(
      0,
      recruitCapacity - alreadyProduced
    );

    if (remainingCapacity <= 0) {
      setNotice(
        `${city.name} bu turdaki ${recruitCapacity} birimlik üretim kapasitesini tamamen kullandı.`
      );
      return;
    }

    const quantity = Math.min(
      requestedQuantity,
      remainingCapacity
    );
    const unitWithStrategy = effectiveUnit(unit);
    const cost = productionCost(unitWithStrategy, quantity);

    if (
      resources.gold < cost.gold ||
      resources.steel < cost.steel ||
      resources.oil < cost.oil
    ) {
      setNotice("Üretim için yeterli kaynağın yok.");
      return;
    }

    const nextUsed = alreadyProduced + quantity;
    productionUsedRef.current = {
      ...productionUsedRef.current,
      [city.code]: nextUsed,
    };
    setProductionUsedThisTurn((current) => ({
      ...current,
      [city.code]: nextUsed,
    }));

    setResources((current) => ({
      gold: current.gold - cost.gold,
      steel: current.steel - cost.steel,
      oil: current.oil - cost.oil,
    }));

    setGarrisons((current) => ({
      ...current,
      [city.code]: {
        ...(current[city.code] ?? {}),
        [unit.id]:
          (current[city.code]?.[unit.id] ?? 0) + quantity,
      },
    }));

    const clipped = quantity < requestedQuantity;
    setNotice(
      clipped
        ? `${city.name}: kapasite nedeniyle ${requestedQuantity} yerine ${quantity} × ${unit.name} üretildi. Bu tur kapasite ${nextUsed}/${recruitCapacity}.`
        : `${city.name}: ${quantity} × ${unit.name} anında üretildi. Bu tur kapasite ${nextUsed}/${recruitCapacity}. Aynı tur taşıyabilirsin.`
    );
  }

  function handleCityClick(city: CityNode) {
    if (moveSourceCode || moveSourceArmyId) {
      setNotice(
        "Serbest hareket modundasın. Sarı birlik işaretini tutup yeşil alan içinde hedef noktaya sürükle."
      );
      return;
    }
    setSelectedFieldArmyId(null);
    setFieldArmyPanelOpen(false);
    setSelectedCountry(city.countryCode);
    setSelectedCityCode(city.code);
    setCityTab("production");
    setMoveDraft({});
    setCityPanelOpen(true);
  }

  function issueFreeMovement(targetXRaw: number, targetY: number) {
    const sourceCity = moveSourceCode
      ? allCities.find((city) => city.code === moveSourceCode)
      : undefined;
    const sourceArmy = moveSourceArmyId
      ? fieldArmies.find((army) => army.id === moveSourceArmyId)
      : undefined;

    if (!sourceCity && !sourceArmy) return;

    if (transportCapacityIssue) {
      setNotice(transportCapacityIssue);
      return;
    }

    if (moveSurface === "none") {
      setNotice("Önce taşınacak birlik miktarını seç.");
      return;
    }

    if (moveSurface === "mixed") {
      setNotice(
        "Bu birlik grubu birlikte hareket edemez. Kara birliklerini denizde Destek Gemisiyle, havada Nakliye Uçağıyla taşımalısın."
      );
      return;
    }

    const sourcePoint = sourceCity
      ? (() => {
          const [x, y] = project([
            sourceCity.lon,
            sourceCity.lat,
          ]);
          return {
            x,
            y,
            lon: sourceCity.lon,
            lat: sourceCity.lat,
            label: sourceCity.name,
          };
        })()
      : (() => {
          const [lon, lat] = unproject([
            sourceArmy!.x,
            sourceArmy!.y,
          ]);
          return {
            x: sourceArmy!.x,
            y: sourceArmy!.y,
            lon,
            lat,
            label: "Saha Birliği",
          };
        })();

    const targetX = wrapWorldX(targetXRaw);
    const [targetLon, targetLat] = unproject([targetX, targetY]);
    const targetPoint = { lon: targetLon, lat: targetLat };
    const distanceKm = haversinePoints(
      sourcePoint,
      targetPoint
    );

    if (distanceKm > activeMoveRangeKm) {
      setNotice(
        `Hareket reddedildi: hedef ${Math.round(
          distanceKm
        ).toLocaleString("tr-TR")} km uzakta. Birliğin menzili ${Math.round(
          activeMoveRangeKm
        ).toLocaleString("tr-TR")} km.`
      );
      return;
    }

    const nearestCity = allCities.reduce<{
      city: CityNode | null;
      distance: number;
    }>(
      (best, city) => {
        const distance = haversinePoints(city, targetPoint);
        return distance < best.distance
          ? { city, distance }
          : best;
      },
      { city: null, distance: Number.POSITIVE_INFINITY }
    );

    const targetCity =
      nearestCity.city && nearestCity.distance <= 120
        ? nearestCity.city
        : null;
    const targetIsPort =
      Boolean(targetCity) &&
      hasPortCode(targetCity!.code);
    const targetIsFriendlyPort =
      targetIsPort &&
      cityOwners[targetCity!.code] === currentPlayer;
    const targetIsLand = isLandPoint(
      world,
      targetLon,
      targetLat
    );
    const sourceIsLand = isLandPoint(
      world,
      sourcePoint.lon,
      sourcePoint.lat
    );

    if (
      moveSurface === "land" &&
      sourceArmy &&
      !sourceIsLand
    ) {
      setNotice(
        "Kara birlikleri denizde tek başına hareket edemez. Aynı gruptaki Destek Gemisini de seç."
      );
      return;
    }

    if (moveSurface === "land" && !targetIsLand) {
      setNotice(
        "Kara birlikleri denize bırakılamaz. Kara bölgesine bırak."
      );
      return;
    }

    if (
      moveSurface === "naval" &&
      targetIsLand &&
      !targetIsFriendlyPort
    ) {
      setNotice(
        "Deniz birlikleri karaya bırakılamaz. Denize veya kendi limanına bırak."
      );
      return;
    }

    if (
      moveSurface === "naval_transport" &&
      targetIsLand &&
      !targetIsPort
    ) {
      setNotice(
        "Deniz çıkarması için hedef bir liman şehri olmalı. Konvoyu önce denizde ilerletip sonra liman şehrine sürükleyebilirsin."
      );
      return;
    }

    if (
      moveSurface === "air_transport" &&
      !targetIsLand
    ) {
      setNotice(
        "Nakliye uçağındaki kara birlikleri denize indirilemez. Kara noktasına veya şehre bırak."
      );
      return;
    }

    if (
      (moveSurface === "naval" ||
        moveSurface === "naval_transport") &&
      sourceCity &&
      !hasPortCode(sourceCity.code)
    ) {
      setNotice(
        `${sourceCity.name} liman şehri değil. Deniz hareketi yalnızca limandan başlatılabilir.`
      );
      return;
    }

    const routeSurface:
      | "land"
      | "naval"
      | "air" =
      moveSurface === "naval_transport"
        ? "naval"
        : moveSurface === "air_transport"
          ? "air"
          : moveSurface;

    const routeAllowed =
      routeSurface === "air" ||
      routeStaysOnSurface(
        world,
        sourcePoint,
        targetPoint,
        routeSurface,
        Boolean(
          sourceCity &&
            routeSurface === "naval" &&
            hasPortCode(sourceCity.code)
        ),
        Boolean(
          targetIsPort &&
            routeSurface === "naval"
        )
      );

    if (!routeAllowed) {
      setNotice(
        routeSurface === "land"
          ? "Bu rota denizden geçiyor. Kara birlikleri nakliye olmadan su üzerinden taşınamaz."
          : "Bu rota karadan geçiyor. Deniz filosu kara üzerinden ilerleyemez."
      );
      return;
    }

    const targetOwner = targetCity
      ? cityOwners[targetCity.code] ?? null
      : null;

    if (
      targetCity &&
      targetOwner !== currentPlayer &&
      moveSurface === "naval"
    ) {
      setNotice(
        "Savaş gemileri tek başına şehir işgal edemez. Çıkarma için kara birlikleriyle birlikte Destek Gemisi seç."
      );
      return;
    }

    const sourceUnits = sourceCity
      ? { ...(garrisons[sourceCity.code] ?? {}) }
      : { ...(sourceArmy?.units ?? {}) };
    const orders: MovementOrder[] = [];
    const arrivalTurn = turn + 1;

    Object.entries(moveDraft).forEach(
      ([unitId, requested]) => {
        if (requested <= 0) return;
        const baseUnit = UNIT_BY_ID[unitId];
        if (!baseUnit) return;

        const available = sourceUnits[unitId] ?? 0;
        const quantity = Math.min(requested, available);
        if (quantity <= 0) return;

        sourceUnits[unitId] = available - quantity;
        orders.push({
          id: orderIdRef.current++,
          player: currentPlayer,
          kind:
            targetCity &&
            targetOwner !== currentPlayer
              ? "attack"
              : "move",
          fromCode: sourceCity?.code ?? null,
          fromArmyId: sourceArmy?.id ?? null,
          sourceX: sourcePoint.x,
          sourceY: sourcePoint.y,
          targetX,
          targetY,
          targetCityCode: targetCity?.code ?? null,
          unitId,
          quantity,
          distanceKm,
          departureTurn: turn,
          arrivalTurn,
        });
      }
    );

    if (!orders.length) {
      setNotice("Taşınabilir birlik bulunamadı.");
      return;
    }

    if (sourceCity) {
      setGarrisons((current) => ({
        ...current,
        [sourceCity.code]: sourceUnits,
      }));
    } else if (sourceArmy) {
      setFieldArmies((current) =>
        current
          .map((army) =>
            army.id === sourceArmy.id
              ? { ...army, units: sourceUnits }
              : army
          )
          .filter((army) =>
            Object.values(army.units).some(
              (quantity) => quantity > 0
            )
          )
      );
    }

    setMovementQueue((current) => [
      ...current,
      ...orders,
    ]);
    setMoveSourceCode(null);
    setMoveSourceArmyId(null);
    setMoveDraft({});
    setMoveDragTarget(null);
    setFieldArmyPanelOpen(false);
    setSelectedFieldArmyId(null);

    if (targetCity) {
      setSelectedCountry(targetCity.countryCode);
      setSelectedCityCode(targetCity.code);
    }

    const modeText =
      moveSurface === "naval_transport"
        ? "Deniz nakliyesi"
        : moveSurface === "air_transport"
          ? "Hava nakliyesi"
          : moveSurface === "air" &&
              targetCity &&
              targetOwner !== currentPlayer
            ? "Hava saldırısı"
            : "Hareket";

    setNotice(
      targetCity
        ? `${modeText}: ${sourcePoint.label} → ${targetCity.name} · ${Math.round(
            distanceKm
          ).toLocaleString("tr-TR")} km · varış Tur ${arrivalTurn}.`
        : `${modeText}: ${sourcePoint.label} → harita noktası · ${Math.round(
            distanceKm
          ).toLocaleString("tr-TR")} km · varış Tur ${arrivalTurn}.`
    );
  }

  function processTurn() {
    if (winner) {
      setNotice("Oyun sona erdi. Yeni oyun başlatabilirsin.");
      return;
    }
    if (turn >= maxGameTurns) {
      setNotice("Maksimum oyun turuna ulaşıldı.");
      return;
    }

    const nextTurn = turn + 1;
    const nextGarrisons: Garrison = {};
    Object.entries(garrisons).forEach(([cityCode, units]) => {
      nextGarrisons[cityCode] = { ...units };
    });

    const nextCityOwners = { ...cityOwners };
    const nextCountryOwners = { ...countryOwners };
    const combatLog: string[] = [];
    const nextAiResources: Record<string, Resources> =
      Object.fromEntries(
        Object.entries(aiResources).map(
          ([player, stock]) => [
            player,
            { ...stock },
          ]
        )
      );

    const aiOrders: MovementOrder[] = [];
    const aiProduced: Record<
      string,
      Record<string, number>
    > = {};
    const aiPlayers = ["Dogan", "Nova"].filter(
      (player) => Boolean(homeCountries[player])
    );

    aiPlayers.forEach((player) => {
      const stock =
        nextAiResources[player] ??
        { gold: 5000, steel: 900, oil: 720 };
      nextAiResources[player] = stock;

      const ownedCities = allCities.filter(
        (city) => nextCityOwners[city.code] === player
      );

      // AI production is immediate, just like player production.
      ownedCities.forEach((city) => {
        const capacity = effectiveRecruitCapacity(city);
        if (capacity <= 0) return;

        const preferredUnit =
          city.isCapital && nextTurn % 3 === 0
            ? UNIT_BY_ID.light_tank
            : UNIT_BY_ID.infantry;
        if (!preferredUnit) return;

        const unitCost = productionCost(preferredUnit, 1);
        const affordable = Math.min(
          Math.floor(stock.gold / Math.max(1, unitCost.gold)),
          Math.floor(stock.steel / Math.max(1, unitCost.steel)),
          unitCost.oil > 0
            ? Math.floor(stock.oil / unitCost.oil)
            : capacity
        );
        const quantity = Math.max(
          0,
          Math.min(capacity, affordable)
        );
        if (quantity <= 0) return;

        const totalCost = productionCost(
          preferredUnit,
          quantity
        );
        stock.gold -= totalCost.gold;
        stock.steel -= totalCost.steel;
        stock.oil -= totalCost.oil;

        nextGarrisons[city.code] = {
          ...(nextGarrisons[city.code] ?? {}),
          [preferredUnit.id]:
            (nextGarrisons[city.code]?.[
              preferredUnit.id
            ] ?? 0) + quantity,
        };

        aiProduced[player] = {
          ...(aiProduced[player] ?? {}),
          [preferredUnit.id]:
            (aiProduced[player]?.[
              preferredUnit.id
            ] ?? 0) + quantity,
        };
      });

      const producedEntries = Object.entries(
        aiProduced[player] ?? {}
      );
      if (producedEntries.length > 0) {
        combatLog.push(
          `${player} üretim: ${producedEntries
            .map(([unitId, quantity]) => {
              const unit = UNIT_BY_ID[unitId];
              return `${quantity} × ${unit?.name ?? unitId}`;
            })
            .join(", ")}.`
        );
      }

      // Stronger cities act first. Each bot can open at most two fronts per turn.
      const sourceCities = [...ownedCities].sort(
        (a, b) =>
          unitAttackPower(
            nextGarrisons[b.code] ?? {}
          ) -
          unitAttackPower(
            nextGarrisons[a.code] ?? {}
          )
      );

      let actions = 0;
      sourceCities.forEach((sourceCity) => {
        if (actions >= 2) return;

        const sourceArmy =
          nextGarrisons[sourceCity.code] ?? {};
        const infantry = sourceArmy.infantry ?? 0;
        const lightTank = sourceArmy.light_tank ?? 0;
        const heavyTank = sourceArmy.heavy_tank ?? 0;

        const reserveInfantry =
          sourceCity.isCapital ? 30 : 8;
        const movingInfantry = Math.max(
          0,
          Math.min(
            24,
            Math.floor(
              (infantry - reserveInfantry) * 0.55
            )
          )
        );
        const movingLightTank = Math.max(
          0,
          Math.min(6, Math.floor(lightTank * 0.45))
        );
        const movingHeavyTank = Math.max(
          0,
          Math.min(2, Math.floor(heavyTank * 0.35))
        );

        if (
          movingInfantry +
            movingLightTank +
            movingHeavyTank <
          5
        ) {
          return;
        }

        const moveUnits: Record<string, number> = {};
        if (movingInfantry > 0)
          moveUnits.infantry = movingInfantry;
        if (movingLightTank > 0)
          moveUnits.light_tank = movingLightTank;
        if (movingHeavyTank > 0)
          moveUnits.heavy_tank = movingHeavyTank;

        const selectedUnits = Object.keys(moveUnits)
          .map((unitId) => UNIT_BY_ID[unitId])
          .filter(Boolean) as UnitDefinition[];
        const rangeKm = Math.min(
          ...selectedUnits.map(movementRangeKm)
        );

        const candidates = allCities
          .filter(
            (city) =>
              city.code !== sourceCity.code &&
              nextCityOwners[city.code] !== player
          )
          .map((city) => ({
            city,
            distance: haversinePoints(
              sourceCity,
              city
            ),
          }))
          .filter(
            ({ city, distance }) =>
              distance <= rangeKm &&
              routeStaysOnSurface(
                world,
                sourceCity,
                city,
                "land",
                false,
                false
              )
          )
          .sort((a, b) => {
            const aOwner =
              nextCityOwners[a.city.code] ?? null;
            const bOwner =
              nextCityOwners[b.city.code] ?? null;
            const aPriority =
              aOwner === currentPlayer
                ? 0
                : a.city.isCapital
                  ? 1
                  : aOwner
                    ? 2
                    : 3;
            const bPriority =
              bOwner === currentPlayer
                ? 0
                : b.city.isCapital
                  ? 1
                  : bOwner
                    ? 2
                    : 3;
            return (
              aPriority - bPriority ||
              a.distance - b.distance
            );
          });

        let target = candidates[0];

        if (!target) {
          const enemyCities = allCities.filter(
            (city) =>
              nextCityOwners[city.code] !== player
          );
          const sourceEnemyDistance =
            enemyCities.reduce(
              (best, enemyCity) =>
                Math.min(
                  best,
                  haversinePoints(
                    sourceCity,
                    enemyCity
                  )
                ),
              Number.POSITIVE_INFINITY
            );

          const reinforcementTarget = ownedCities
            .filter(
              (city) =>
                city.code !== sourceCity.code
            )
            .map((city) => {
              const distance =
                haversinePoints(sourceCity, city);
              const enemyDistance =
                enemyCities.reduce(
                  (best, enemyCity) =>
                    Math.min(
                      best,
                      haversinePoints(
                        city,
                        enemyCity
                      )
                    ),
                  Number.POSITIVE_INFINITY
                );
              return {
                city,
                distance,
                enemyDistance,
              };
            })
            .filter(
              ({ city, distance, enemyDistance }) =>
                distance <= rangeKm &&
                enemyDistance + 80 <
                  sourceEnemyDistance &&
                routeStaysOnSurface(
                  world,
                  sourceCity,
                  city,
                  "land",
                  false,
                  false
                )
            )
            .sort(
              (a, b) =>
                a.enemyDistance -
                  b.enemyDistance ||
                a.distance - b.distance
            )[0];

          if (reinforcementTarget) {
            target = {
              city: reinforcementTarget.city,
              distance:
                reinforcementTarget.distance,
            };
          }
        }

        if (!target) return;

        const [sourceX, sourceY] = project([
          sourceCity.lon,
          sourceCity.lat,
        ]);
        const [targetX, targetY] = project([
          target.city.lon,
          target.city.lat,
        ]);
        const targetOwner =
          nextCityOwners[target.city.code] ?? null;

        Object.entries(moveUnits).forEach(
          ([unitId, quantity]) => {
            const available =
              nextGarrisons[sourceCity.code]?.[
                unitId
              ] ?? 0;
            const moved = Math.min(
              quantity,
              available
            );
            if (moved <= 0) return;

            nextGarrisons[sourceCity.code][unitId] =
              available - moved;
            aiOrders.push({
              id: orderIdRef.current++,
              player,
              kind:
                targetOwner === player
                  ? "move"
                  : "attack",
              fromCode: sourceCity.code,
              fromArmyId: null,
              sourceX,
              sourceY,
              targetX,
              targetY,
              targetCityCode: target.city.code,
              unitId,
              quantity: moved,
              distanceKm: target.distance,
              departureTurn: turn,
              arrivalTurn: nextTurn,
            });
          }
        );

        actions += 1;
        combatLog.push(
          `${player}: ${sourceCity.name} → ${target.city.name} için birlik emri verdi (${Math.round(
            target.distance
          ).toLocaleString("tr-TR")} km).`
        );
      });
    });

    const ordersForResolution = [
      ...movementQueue,
      ...aiOrders,
    ];

    const arrivingMovementOrders = ordersForResolution.filter(
      (order) => order.arrivalTurn <= nextTurn
    );
    const inTransitMovementOrders = ordersForResolution.filter(
      (order) => order.arrivalTurn > nextTurn
    );

    const nextFieldArmies = fieldArmies.map((army) => ({
      ...army,
      units: { ...army.units },
    }));

    const fieldOrders = arrivingMovementOrders.filter(
      (order) => !order.targetCityCode
    );

    fieldOrders.forEach((order) => {
      const existingArmy = nextFieldArmies.find(
        (army) =>
          army.player === order.player &&
          Math.abs(army.x - order.targetX) < 1 &&
          Math.abs(army.y - order.targetY) < 1
      );

      if (existingArmy) {
        existingArmy.units[order.unitId] =
          (existingArmy.units[order.unitId] ?? 0) +
          order.quantity;
      } else {
        nextFieldArmies.push({
          id: orderIdRef.current++,
          player: order.player,
          x: order.targetX,
          y: order.targetY,
          units: { [order.unitId]: order.quantity },
        });
      }
    });

    type CityAttackGroup = {
      player: string;
      targetCityCode: string;
      units: Record<string, number>;
      sourceX: number;
      sourceY: number;
      fromCode: string | null;
    };

    const cityGroups = new Map<string, CityAttackGroup>();

    arrivingMovementOrders
      .filter((order) => Boolean(order.targetCityCode))
      .forEach((order) => {
        const targetCode = order.targetCityCode!;
        const originKey =
          order.fromCode ??
          `army-${order.fromArmyId ?? "field"}-${order.sourceX.toFixed(
            1
          )}-${order.sourceY.toFixed(1)}`;
        const key =
          targetCode +
          "::" +
          order.player +
          "::" +
          originKey;
        const current = cityGroups.get(key) ?? {
          player: order.player,
          targetCityCode: targetCode,
          units: {},
          sourceX: order.sourceX,
          sourceY: order.sourceY,
          fromCode: order.fromCode,
        };
        current.units[order.unitId] =
          (current.units[order.unitId] ?? 0) +
          order.quantity;
        cityGroups.set(key, current);
      });

    cityGroups.forEach((group) => {
      const targetCity = allCities.find(
        (city) => city.code === group.targetCityCode
      );
      if (!targetCity) return;

      const targetOwner =
        nextCityOwners[targetCity.code] ?? null;

      if (targetOwner === group.player) {
        nextGarrisons[targetCity.code] = mergeArmy(
          nextGarrisons[targetCity.code] ?? {},
          group.units
        );
        combatLog.push(
          `${targetCity.name}: ${Object.values(group.units).reduce(
            (sum, quantity) => sum + quantity,
            0
          )} birlik şehre ulaştı.`
        );
        return;
      }

      const defenders =
        nextGarrisons[targetCity.code] ?? {};
      const rawDefensePower = unitDefensePower(defenders);
      const capitalDefenseMultiplier =
        targetCity.isCapital ? 1.18 : 1;
      const targetStructures =
        structuresForCity(targetCity.code);

      const hasLandUnits = Object.entries(
        group.units
      ).some(
        ([unitId, quantity]) =>
          quantity > 0 &&
          UNIT_BY_ID[unitId]?.domain === "land"
      );
      const hasNavalUnits = Object.entries(
        group.units
      ).some(
        ([unitId, quantity]) =>
          quantity > 0 &&
          UNIT_BY_ID[unitId]?.domain === "naval"
      );
      const hasAirUnits = Object.entries(
        group.units
      ).some(
        ([unitId, quantity]) =>
          quantity > 0 &&
          UNIT_BY_ID[unitId]?.domain === "air"
      );
      const fortificationMultiplier =
        1 + targetStructures.fortification * 0.2;
      const antiAirMultiplier =
        hasAirUnits
          ? 1 + targetStructures.anti_air * 0.3
          : 1;
      const defensePower =
        rawDefensePower *
        capitalDefenseMultiplier *
        fortificationMultiplier *
        antiAirMultiplier;

      const amphibiousLanding =
        hasLandUnits && hasNavalUnits;
      const airborneLanding =
        hasLandUnits &&
        hasAirUnits &&
        !hasNavalUnits &&
        (group.units.transport_plane ?? 0) > 0;
      const landingModifier = amphibiousLanding
        ? 0.82
        : airborneLanding
          ? 0.9
          : 1;

      const radarAirModifier =
        hasAirUnits
          ? Math.max(
              0.7,
              1 - targetStructures.radar * 0.08
            )
          : 1;
      const attackPower =
        unitAttackPower(
          group.units,
          group.player === currentPlayer
            ? effectiveUnit
            : undefined
        ) *
        landingModifier *
        radarAirModifier;

      const attackerCount = Object.values(group.units).reduce(
        (sum, quantity) => sum + quantity,
        0
      );
      const defenderCount = Object.values(defenders).reduce(
        (sum, quantity) => sum + quantity,
        0
      );
      const hasOccupyingLand = hasLandUnits;

      if (!hasOccupyingLand) {
        const defenderLossRatio =
          defensePower <= 0
            ? 0
            : Math.min(
                0.58,
                attackPower /
                  Math.max(1, defensePower * 1.5)
              );
        const reducedDefenders = scaleArmy(
          defenders,
          1 - defenderLossRatio
        );
        nextGarrisons[targetCity.code] = reducedDefenders;

        const attackerSurvivorRatio =
          defensePower <= 0
            ? 1
            : Math.max(
                0.35,
                1 -
                  Math.min(
                    0.65,
                    defensePower /
                      Math.max(1, attackPower * 2.3)
                  )
              );
        const returning = scaleArmy(
          group.units,
          attackerSurvivorRatio
        );
        const returningCount = Object.values(returning).reduce(
          (sum, quantity) => sum + quantity,
          0
        );
        const defenderLeft = Object.values(
          reducedDefenders
        ).reduce(
          (sum, quantity) => sum + quantity,
          0
        );

        if (returningCount > 0) {
          if (
            group.fromCode &&
            nextCityOwners[group.fromCode] === group.player
          ) {
            nextGarrisons[group.fromCode] = mergeArmy(
              nextGarrisons[group.fromCode] ?? {},
              returning
            );
          } else {
            const existingReturn = nextFieldArmies.find(
              (army) =>
                army.player === group.player &&
                Math.abs(army.x - group.sourceX) < 1 &&
                Math.abs(army.y - group.sourceY) < 1
            );
            if (existingReturn) {
              existingReturn.units = mergeArmy(
                existingReturn.units,
                returning
              );
            } else {
              nextFieldArmies.push({
                id: orderIdRef.current++,
                player: group.player,
                x: group.sourceX,
                y: group.sourceY,
                units: returning,
              });
            }
          }
        }

        const raidType = Object.keys(group.units).some(
          (unitId) =>
            UNIT_BY_ID[unitId]?.domain === "air"
        )
          ? "Hava saldırısı"
          : "Bombardıman";

        combatLog.push(
          `${targetCity.name}: ${raidType} tamamlandı · saldıran ${attackerCount} → ${returningCount}, savunan ${defenderCount} → ${defenderLeft}. Şehir işgal edilmedi.`
        );
        return;
      }

      if (
        defensePower <= 0 ||
        attackPower >= defensePower * 0.92
      ) {
        const attackerLossRatio =
          defensePower <= 0
            ? 0
            : Math.min(
                0.72,
                defensePower /
                  Math.max(1, attackPower * 1.9)
              );
        const survivors = scaleArmy(
          group.units,
          1 - attackerLossRatio
        );
        const survivorCount = Object.values(survivors).reduce(
          (sum, quantity) => sum + quantity,
          0
        );

        nextGarrisons[targetCity.code] = survivors;
        nextCityOwners[targetCity.code] = group.player;

        const captureType = amphibiousLanding
          ? "Deniz çıkarması"
          : airborneLanding
            ? "Hava indirmesi"
            : "Kara saldırısı";
        combatLog.push(
          `${targetCity.name} ele geçirildi: ${group.player} · ${captureType} · saldıran ${attackerCount} → ${survivorCount}, savunan ${defenderCount} → 0.`
        );
      } else {
        const defenderLossRatio = Math.min(
          0.68,
          attackPower /
            Math.max(1, defensePower * 1.45)
        );
        const reducedDefenders = scaleArmy(
          defenders,
          1 - defenderLossRatio
        );
        nextGarrisons[targetCity.code] = reducedDefenders;

        const attackerSurvivorRatio = Math.max(
          0.08,
          1 -
            Math.min(
              0.9,
              defensePower /
                Math.max(1, attackPower * 1.22)
            )
        );
        const retreating = scaleArmy(
          group.units,
          attackerSurvivorRatio
        );
        const retreatCount = Object.values(retreating).reduce(
          (sum, quantity) => sum + quantity,
          0
        );
        const defenderLeft = Object.values(
          reducedDefenders
        ).reduce(
          (sum, quantity) => sum + quantity,
          0
        );

        if (retreatCount > 0) {
          if (
            group.fromCode &&
            nextCityOwners[group.fromCode] === group.player
          ) {
            nextGarrisons[group.fromCode] = mergeArmy(
              nextGarrisons[group.fromCode] ?? {},
              retreating
            );
          } else {
            const existingRetreat = nextFieldArmies.find(
              (army) =>
                army.player === group.player &&
                Math.abs(army.x - group.sourceX) < 1 &&
                Math.abs(army.y - group.sourceY) < 1
            );
            if (existingRetreat) {
              existingRetreat.units = mergeArmy(
                existingRetreat.units,
                retreating
              );
            } else {
              nextFieldArmies.push({
                id: orderIdRef.current++,
                player: group.player,
                x: group.sourceX,
                y: group.sourceY,
                units: retreating,
              });
            }
          }
        }

        const failedType = amphibiousLanding
          ? "deniz çıkarmasını"
          : airborneLanding
            ? "hava indirmesini"
            : "saldırıyı";
        combatLog.push(
          `${targetCity.name} ${failedType} püskürttü: saldıran ${attackerCount} → ${retreatCount}, savunan ${defenderCount} → ${defenderLeft}.`
        );
      }
    });

    const completed = productionQueue.filter(
      (order) => order.readyTurn <= nextTurn
    );
    const pending = productionQueue.filter(
      (order) => order.readyTurn > nextTurn
    );
    const validPending = pending.filter(
      (order) =>
        nextCityOwners[order.cityCode] === order.player
    );

    completed.forEach((order) => {
      if (
        nextCityOwners[order.cityCode] !== order.player
      ) {
        combatLog.push(
          `${order.cityCode}: şehir el değiştirdiği için üretim iptal oldu.`
        );
        return;
      }

      nextGarrisons[order.cityCode] = {
        ...(nextGarrisons[order.cityCode] ?? {}),
        [order.unitId]:
          (nextGarrisons[order.cityCode]?.[order.unitId] ??
            0) + order.quantity,
      };

      const city = allCities.find(
        (item) => item.code === order.cityCode
      );
      const unit = UNIT_BY_ID[order.unitId];
      if (city && unit) {
        combatLog.push(
          `${city.name}: ${order.quantity} × ${unit.name} üretimi tamamlandı.`
        );
      }
    });

    const nextHolds = { ...capitalHolds };

    allCountries.forEach((country) => {
      const capital = allCitiesForCountry(country.code).find(
        (city) => city.isCapital
      );
      if (!capital) return;

      const capitalOwner =
        nextCityOwners[capital.code] ?? null;
      const strategicOwner =
        nextCountryOwners[country.code] ?? null;

      if (
        capitalOwner &&
        capitalOwner !== strategicOwner
      ) {
        const previous = nextHolds[country.code];
        const turns =
          previous?.holder === capitalOwner
            ? previous.turns + 1
            : 1;

        nextHolds[country.code] = {
          holder: capitalOwner,
          turns,
        };

        combatLog.push(
          `${country.name} başkenti ${capitalOwner} kontrolünde: ${turns}/${victoryHoldTurns} tur.`
        );

        if (turns >= victoryHoldTurns) {
          if (nextCountryOwners[country.code] !== capitalOwner) {
            nextCountryOwners[country.code] =
              capitalOwner;
            combatLog.push(
              `${country.name}: stratejik ülke kontrolü ${capitalOwner} oyuncusuna geçti.`
            );
          }
        }
      } else {
        nextHolds[country.code] = {
          holder: capitalOwner,
          turns: 0,
        };
      }
    });

    let nextWinner: string | null = null;

    Object.entries(homeCountries).forEach(
      ([player, countryCode]) => {
        const hold = nextHolds[countryCode];
        if (
          !hold?.holder ||
          hold.turns < victoryHoldTurns
        ) {
          return;
        }

        if (
          player === currentPlayer &&
          hold.holder !== currentPlayer
        ) {
          nextWinner = hold.holder;
        }

        if (
          player !== currentPlayer &&
          hold.holder === currentPlayer
        ) {
          nextWinner = currentPlayer;
        }
      }
    );

    if (nextWinner) {
      combatLog.push(
        nextWinner === currentPlayer
          ? `ZAFER: düşman anavatan başkenti ${victoryHoldTurns} tur tutuldu.`
          : `YENİLGİ: anavatan başkentin ${victoryHoldTurns} tur düşman kontrolünde kaldı.`
      );
    }

    const ownedCities = allCities.filter(
      (city) =>
        nextCityOwners[city.code] === currentPlayer
    );
    const goldIncome = ownedCities.reduce(
      (sum, city) => {
        const bankLevel =
          structuresForCity(city.code).bank;
        return (
          sum +
          Math.round(
            city.growth * (1 + bankLevel * 0.15)
          )
        );
      },
      0
    );
    const steelIncome = ownedCities.reduce(
      (sum, city) =>
        sum +
        (allCountryByCode[city.countryCode]?.primaryResource ===
        "Çelik"
          ? 18
          : 4),
      0
    );
    const oilIncome = ownedCities.reduce(
      (sum, city) =>
        sum +
        (allCountryByCode[city.countryCode]?.primaryResource ===
        "Petrol"
          ? 18
          : 3),
      0
    );

    setResources((current) => ({
      gold: current.gold + goldIncome,
      steel: current.steel + steelIncome,
      oil: current.oil + oilIncome,
    }));

    aiPlayers.forEach((player) => {
      const stock =
        nextAiResources[player] ??
        { gold: 0, steel: 0, oil: 0 };
      const botCities = allCities.filter(
        (city) => nextCityOwners[city.code] === player
      );
      const botGoldIncome = botCities.reduce(
        (sum, city) => {
          const bankLevel =
            structuresForCity(city.code).bank;
          return (
            sum +
            Math.round(
              city.growth *
                (1 + bankLevel * 0.15)
            )
          );
        },
        0
      );
      const botSteelIncome = botCities.reduce(
        (sum, city) =>
          sum +
          (allCountryByCode[city.countryCode]
            ?.primaryResource === "Çelik"
            ? 18
            : 4),
        0
      );
      const botOilIncome = botCities.reduce(
        (sum, city) =>
          sum +
          (allCountryByCode[city.countryCode]
            ?.primaryResource === "Petrol"
            ? 18
            : 3),
        0
      );

      stock.gold += botGoldIncome;
      stock.steel += botSteelIncome;
      stock.oil += botOilIncome;
    });

    setAiResources(nextAiResources);
    setGarrisons(nextGarrisons);
    setCityOwners(nextCityOwners);
    setCountryOwners(nextCountryOwners);
    setCapitalHolds(nextHolds);
    setProductionQueue(validPending);
    productionUsedRef.current = {};
    setProductionUsedThisTurn({});
    setMovementQueue(inTransitMovementOrders);
    setFieldArmies(
      nextFieldArmies.filter((army) =>
        Object.values(army.units).some(
          (quantity) => quantity > 0
        )
      )
    );
    setTurn(nextTurn);
    setWinner(nextWinner);
    setLastTurnEvents(combatLog.slice(-8));

    setNotice(
      `Tur ${nextTurn}: +${goldIncome} Altın, +${steelIncome} Çelik, +${oilIncome} Petrol.${
        combatLog.length
          ? " " + combatLog[combatLog.length - 1]
          : ""
      }`
    );
  }

  function ownerColor(owner: string | null) {
    if (!owner) return "rgba(93,108,104,.12)";
    if (owner === currentPlayer) return playerColor;
    return AI_COLORS[owner] ?? "#8d8493";
  }

  function renderWorldMap(
    mode: "homeland" | "game"
  ) {
    return (
      <svg
        className="world-map"
        viewBox={mapViewBox}
        onPointerDown={handleMapDown}
        onPointerMove={handleMapMove}
        onPointerUp={handleMapUp}
        onPointerCancel={handleMapUp}
        onPointerLeave={handleMapUp}
        onWheel={handleWheel}
      >
        <defs>
          <mask
            id="ocean-tint-mask"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
          >
            <rect
              x="0"
              y="0"
              width={WORLD_WIDTH}
              height={WORLD_HEIGHT}
              fill="white"
            />
            {world.map((feature, index) => (
              <path
                key={"ocean-mask-" + index}
                d={geometryToPath(feature.geometry)}
                fill="black"
                stroke="black"
                strokeWidth="1"
              />
            ))}
          </mask>
        </defs>

        <rect
          x={-WORLD_WIDTH}
          y="0"
          width={WORLD_WIDTH * 3}
          height={WORLD_HEIGHT}
          className="ocean-base"
        />

        {WORLD_COPIES.map((offset) => (
          <g key={"world-" + offset}>
            <image
              href={TERRAIN_MAP_URL}
              x={offset}
              y="0"
              width={WORLD_WIDTH}
              height={WORLD_HEIGHT}
              preserveAspectRatio="none"
              className="terrain-base"
            />

            <g transform={`translate(${offset} 0)`}>
              <rect
                x="0"
                y="0"
                width={WORLD_WIDTH}
                height={WORLD_HEIGHT}
                className="ocean-color-layer"
                mask="url(#ocean-tint-mask)"
              />
            </g>

            <g transform={`translate(${offset} 0)`}>
              {world.map((feature, index) => {
                const rawCode = String(
                  feature.id ?? "country-" + index
                );
                const code = featureCountryCode(feature);
                const supported =
                  Boolean(allCountryByCode[code]);
                const isSelected =
                  mode === "homeland"
                    ? code === selectedHomeland
                    : code === selectedCountry;
                const strategicOwner =
                  countryOwners[code] ?? null;
                return (
                  <path
                    key={rawCode + "-" + offset}
                    d={geometryToPath(feature.geometry)}
                    className={
                      "country-shape " +
                      (supported ? "supported " : "") +
                      (isSelected ? "selected " : "")
                    }
                    style={{
                      fill:
                        mode === "game"
                          ? ownerColor(strategicOwner)
                          : isSelected
                            ? "#d6b22c"
                            : "transparent",
                      fillOpacity:
                        mode === "game"
                          ? strategicOwner
                            ? 0.22
                            : 0.025
                          : isSelected
                            ? 0.24
                            : 0,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (dragRef.current?.moved) return;
                      if (mode === "homeland") {
                        if (supported) {
                          setSelectedHomeland(code);
                        }
                      } else {
                        setSelectedCountry(code);
                        setCityPanelOpen(false);
                        setFieldArmyPanelOpen(false);
                        setSelectedFieldArmyId(null);
                      }
                    }}
                  >
                    <title>
                      {feature.properties?.name ?? code}
                    </title>
                  </path>
                );
              })}
            </g>

            {mode === "game" &&
              allCities.map((city) => {
                const [baseX, y] = project([
                  city.lon,
                  city.lat,
                ]);
                const x = baseX + offset;
                const owner =
                  cityOwners[city.code] ?? null;
                const isSelected =
                  selectedCityCode === city.code;
                const targetDistance =
                  activeMoveSource && activeMoveRangeKm > 0
                    ? haversinePoints(activeMoveSource, city)
                    : 0;
                const inTargetMode = Boolean(activeMoveSource);
                const isSameSourceCity =
                  activeMoveSource?.sourceKind === "city" &&
                  city.code === activeMoveSource.id;
                const isReachableTarget =
                  inTargetMode &&
                  !isSameSourceCity &&
                  targetDistance <= activeMoveRangeKm;
                const isMultiTurnTarget =
                  inTargetMode &&
                  !isSameSourceCity &&
                  targetDistance > activeMoveRangeKm;
                const compactMarker =
                  mapZoom < 1.65 &&
                  !isSelected &&
                  !isReachableTarget &&
                  !isMultiTurnTarget;
                return (
                  <g
                    key={city.code + "-" + offset}
                    className={
                      "city-marker " +
                      (isSelected ? "selected " : "") +
                      (isReachableTarget ? "reachable-target " : "") +
                      (isMultiTurnTarget ? "multi-turn-target " : "") +
                      (compactMarker ? "compact " : "")
                    }
                    transform={`translate(${x} ${y}) scale(${1 / mapZoom})`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (dragRef.current?.moved) return;
                      handleCityClick(city);
                    }}
                  >
                    <title>
                      {city.name} · Kapasite{" "}
                      {effectiveRecruitCapacity(city)}
                      {hasPortCode(city.code)
                        ? " · Liman"
                        : ""}
                    </title>
                    {city.isCapital ? (
                      <>
                        <circle
                          r={compactMarker ? 5.2 : 7}
                          className="capital-ring"
                          style={{
                            stroke: ownerColor(owner),
                          }}
                        />
                        <text className="capital-star">
                          ★
                        </text>
                      </>
                    ) : (
                      <circle
                        r={compactMarker ? 3.2 : 5.4}
                        className="city-node"
                        style={{
                          stroke: ownerColor(owner),
                        }}
                      />
                    )}
                    {!compactMarker && (
                      <text className="capacity-number">
                        {effectiveRecruitCapacity(city)}
                      </text>
                    )}
                    {!compactMarker &&
                      hasPortCode(city.code) && (
                        <text
                          className="port-marker"
                          x="8"
                          y="8"
                        >
                          ⚓
                        </text>
                      )}
                  </g>
                );
              })}

            {mode === "game" &&
              previewMoveSource &&
              activeMoveRangeRadius > 0 &&
              (() => {
                return (
                  <circle
                    cx={previewMoveSource.x + offset}
                    cy={previewMoveSource.y}
                    r={activeMoveRangeRadius}
                    className="movement-range-circle"
                  />
                );
              })()}

            {mode === "game" &&
              movementQueue.map((order) => {
                const sx = order.sourceX;
                const sy = order.sourceY;
                const tx = shortestWrappedTargetX(
                  sx,
                  order.targetX
                );
                const ty = order.targetY;
                const midX = (sx + tx) / 2 + offset;
                const midY = (sy + ty) / 2;
                const turnsLeft = Math.max(
                  1,
                  order.arrivalTurn - turn
                );
                return (
                  <g key={order.id + "-route-" + offset}>
                    <line
                      x1={sx + offset}
                      y1={sy}
                      x2={tx + offset}
                      y2={ty}
                      className={
                        order.kind === "attack"
                          ? "route attack"
                          : "route"
                      }
                    />
                    <g
                      transform={`translate(${midX} ${midY}) scale(${1 / mapZoom})`}
                      className="route-eta"
                    >
                      <rect
                        x="-13"
                        y="-7"
                        width="26"
                        height="14"
                        rx="4"
                      />
                      <text y="1">{turnsLeft}T</text>
                    </g>
                  </g>
                );
              })}

            {mode === "game" &&
              fieldArmies.map((army) => {
                const total = Object.values(army.units).reduce(
                  (sum, quantity) => sum + quantity,
                  0
                );
                const armyDomains = new Set(
                  Object.entries(army.units)
                    .filter(([, quantity]) => quantity > 0)
                    .map(
                      ([unitId]) =>
                        UNIT_BY_ID[unitId]?.domain
                    )
                    .filter(Boolean)
                );
                const armyHasLand =
                  armyDomains.has("land");
                const armyHasNaval =
                  armyDomains.has("naval");
                const armyHasAir =
                  armyDomains.has("air");
                const armyMarker =
                  armyHasLand && armyHasNaval
                    ? "⚓"
                    : armyHasLand && armyHasAir
                      ? "✈"
                      : armyHasNaval
                        ? "◆"
                        : armyHasAir
                          ? "✈"
                          : "▲";
                const armyModeClass =
                  armyHasLand && armyHasNaval
                    ? " convoy"
                    : armyHasLand && armyHasAir
                      ? " airlift"
                      : armyHasNaval
                        ? " fleet"
                        : armyHasAir
                          ? " air-group"
                          : " land-group";
                return (
                  <g
                    key={army.id + "-army-" + offset}
                    transform={`translate(${army.x + offset} ${army.y}) scale(${1 / mapZoom})`}
                    className={
                      "field-army-marker" +
                      armyModeClass +
                      " " +
                      (selectedFieldArmyId === army.id
                        ? "selected "
                        : "")
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      if (moveSourceCode || moveSourceArmyId) {
                        return;
                      }
                      if (army.player !== currentPlayer) {
                        setNotice(
                          "Bu saha birliği başka bir oyuncuya ait."
                        );
                        return;
                      }
                      setSelectedCityCode("");
                      setCityPanelOpen(false);
                      setSelectedFieldArmyId(army.id);
                      setFieldArmyPanelOpen(true);
                      setMoveDraft({});
                      setMoveSourceCode(null);
                      setMoveSourceArmyId(null);
                      setNotice(
                        "Saha birliği seçildi. Birlik miktarını seçerek bir sonraki hareketini yapabilirsin."
                      );
                    }}
                  >
                    <circle r="10" />
                    <text className="field-army-symbol" y="3">
                      {armyMarker}
                    </text>
                    <text className="field-army-total" y="16">
                      {total}
                    </text>
                  </g>
                );
              })}

            {mode === "game" &&
              activeMoveSource &&
              (() => {
                const sx = activeMoveSource.x;
                const sy = activeMoveSource.y;
                const currentTarget = moveDragTarget ?? {
                  x: sx,
                  y: sy,
                };
                const previewX = shortestWrappedTargetX(
                  sx,
                  currentTarget.x
                );
                const [previewLon, previewLat] = unproject([
                  currentTarget.x,
                  currentTarget.y,
                ]);
                const previewPoint = {
                  lon: previewLon,
                  lat: previewLat,
                };
                const previewDistance = haversinePoints(
                  activeMoveSource,
                  previewPoint
                );
                const previewIsLand = isLandPoint(
                  world,
                  previewLon,
                  previewLat
                );
                const previewNearestCity = allCities.reduce<{
                  city: CityNode | null;
                  distance: number;
                }>(
                  (best, city) => {
                    const distance = haversinePoints(
                      city,
                      previewPoint
                    );
                    return distance < best.distance
                      ? { city, distance }
                      : best;
                  },
                  {
                    city: null,
                    distance: Number.POSITIVE_INFINITY,
                  }
                );
                const previewCity =
                  previewNearestCity.city &&
                  previewNearestCity.distance <= 120
                    ? previewNearestCity.city
                    : null;
                const previewIsPort =
                  Boolean(previewCity) &&
                  hasPortCode(previewCity!.code);
                const previewFriendlyPort =
                  previewIsPort &&
                  cityOwners[previewCity!.code] ===
                    currentPlayer;

                const previewSurfaceInvalid =
                  Boolean(transportCapacityIssue) ||
                  moveSurface === "mixed" ||
                  moveSurface === "none" ||
                  (moveSurface === "land" &&
                    !previewIsLand) ||
                  (moveSurface === "naval" &&
                    previewIsLand &&
                    !previewFriendlyPort) ||
                  (moveSurface === "naval_transport" &&
                    previewIsLand &&
                    !previewIsPort) ||
                  (moveSurface === "air_transport" &&
                    !previewIsLand);

                const previewRouteSurface:
                  | "land"
                  | "naval"
                  | "air" =
                  moveSurface === "naval_transport"
                    ? "naval"
                    : moveSurface === "air_transport"
                      ? "air"
                      : moveSurface === "land" ||
                          moveSurface === "naval" ||
                          moveSurface === "air"
                        ? moveSurface
                        : "air";

                const previewRouteInvalid =
                  !previewSurfaceInvalid &&
                  previewRouteSurface !== "air" &&
                  !routeStaysOnSurface(
                    world,
                    activeMoveSource,
                    previewPoint,
                    previewRouteSurface,
                    Boolean(
                      activeMoveSource.sourceKind === "city" &&
                        previewRouteSurface === "naval" &&
                        hasPortCode(
                          String(activeMoveSource.id)
                        )
                    ),
                    Boolean(
                      previewIsPort &&
                        previewRouteSurface === "naval"
                    )
                  );

                const previewInvalid =
                  previewDistance > activeMoveRangeKm ||
                  previewSurfaceInvalid ||
                  previewRouteInvalid;

                const invalidLabel =
                  previewDistance > activeMoveRangeKm
                    ? "MENZİL DIŞI"
                    : transportCapacityIssue
                      ? "NAKLİYE KAPASİTESİ YETERSİZ"
                      : moveSurface === "mixed"
                        ? "GEÇERSİZ BİRLİK KARIŞIMI"
                        : moveSurface === "land" &&
                            !previewIsLand
                          ? "KARA BİRLİĞİ DENİZE GİDEMEZ"
                          : moveSurface === "naval" &&
                              previewIsLand &&
                              !previewFriendlyPort
                            ? "GEMİ KARAYA GİDEMEZ"
                            : moveSurface ===
                                  "naval_transport" &&
                                previewIsLand &&
                                !previewIsPort
                              ? "ÇIKARMA İÇİN LİMAN SEÇ"
                              : moveSurface ===
                                    "air_transport" &&
                                  !previewIsLand
                                ? "KARA NOKTASI SEÇ"
                                : previewRouteInvalid
                                  ? "ROTA UYGUN DEĞİL"
                                  : "";

                return (
                  <g className="free-move-drag-layer">
                    {moveDragTarget && (
                      <>
                        <line
                          x1={sx + offset}
                          y1={sy}
                          x2={previewX + offset}
                          y2={currentTarget.y}
                          className={
                            previewInvalid
                              ? "drag-preview-route invalid"
                              : "drag-preview-route"
                          }
                        />
                        <g
                          transform={`translate(${previewX + offset} ${currentTarget.y}) scale(${1 / mapZoom})`}
                          className={
                            previewInvalid
                              ? "drop-preview-marker invalid"
                              : "drop-preview-marker"
                          }
                        >
                          <circle r="7" />
                          <text y="15">
                            {previewInvalid
                              ? invalidLabel + " · "
                              : ""}
                            {Math.round(
                              previewDistance
                            ).toLocaleString("tr-TR")} km
                          </text>
                        </g>
                      </>
                    )}
                    <g
                      transform={`translate(${sx + offset} ${sy}) scale(${1 / mapZoom})`}
                      className="draggable-army-token"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(
                          event.pointerId
                        );
                        moveDragRef.current = {
                          pointerId: event.pointerId,
                        };
                        setMoveDragTarget({ x: sx, y: sy });
                      }}
                    >
                      <circle r="10" />
                      <path d="M-5 3 L0 -6 L5 3 Z" />
                      <text y="17">{moveSelectionCount}</text>
                    </g>
                  </g>
                );
              })()}

          </g>
        ))}
      </svg>
    );
  }

  if (screen === "lobby") {
    return (
      <div className="app lobby-screen">
        <header className="top-brand">
          <strong>IRON ATLAS</strong>
          <span>GLOBAL STRATEGY PROTOTYPE</span>
        </header>
        <main className="lobby-shell">
          <section className="lobby-hero">
            <span className="kicker">WORLD COMMAND</span>
            <h1>Dünya haritasında ülkeni seç, ordunu kur ve fethet.</h1>
            <p>
              Bu sürüm oynanabilir taslaktır: ülke satın alma,
              şehir üretimi, birlik taşıma, menzil, tur çözümü,
              savaş ve başkent kontrolü birlikte çalışır.
            </p>
            <div className="lobby-actions">
              <button
                className="primary-button"
                onClick={() => setScreen("setup")}
              >
                YENİ OYUN
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setStartingMoney(10000);
                  setSelectedStrategy("balanced");
                  setPlayerColor("#2b95eb");
                  setScreen("setup");
                }}
              >
                HIZLI KURULUM
              </button>
            </div>
          </section>
          <section className="lobby-modes">
            <article>
              <b>HIZLI</b>
              <span>1–12 dakikalık tur</span>
            </article>
            <article>
              <b>GÜNLÜK</b>
              <span>Uzun tur seçeneği için hazır altyapı</span>
            </article>
            <article>
              <b>40 OYUNCU</b>
              <span>Çok oyunculu backend sonraki aşama</span>
            </article>
          </section>
        </main>
      </div>
    );
  }

  if (screen === "setup") {
    const colors = [
      "#ff7a18",
      "#25b946",
      "#e64343",
      "#2b95eb",
      "#f2c72b",
      "#7d3bcb",
      "#21bfe6",
      "#ef6c9a",
      "#a56c12",
      "#6e55d8",
      "#0b8b79",
      "#7ca316",
      "#ef4b1d",
      "#2f87be",
      "#8b8664",
      "#18d4bc",
      "#94c29d",
      "#c99383",
      "#a73518",
      "#164278",
      "#9a2d62",
      "#666d68",
      "#ddd48d",
      "#eeeeee",
    ];

    return (
      <div className="app setup-screen">
        <header className="setup-header">
          <div>
            <span>IRON ATLAS</span>
            <strong>Yeni Oyun</strong>
          </div>
          <button onClick={() => setScreen("lobby")}>
            ← LOBİ
          </button>
        </header>

        <main className="setup-layout">
          <aside className="setup-map-card panel">
            <h2>Dünya Haritası</h2>
            <img
              src={TERRAIN_MAP_URL}
              alt="Dünya haritası"
            />
            <label>
              Komutan
              <input
                value={commander}
                onChange={(event) =>
                  setCommander(event.target.value)
                }
              />
            </label>
            <div className="color-picker">
              <span>Oyuncu rengin</span>
              <div>
                {colors.map((color) => (
                  <button
                    key={color}
                    className={
                      playerColor === color
                        ? "selected"
                        : ""
                    }
                    style={{ background: color }}
                    onClick={() =>
                      setPlayerColor(color)
                    }
                  />
                ))}
              </div>
            </div>
          </aside>

          <section className="setup-main panel">
            <div className="setup-tabs">
              <button
                className={
                  setupTab === "basic" ? "active" : ""
                }
                onClick={() => setSetupTab("basic")}
              >
                TEMEL
              </button>
              <button
                className={
                  setupTab === "victory" ? "active" : ""
                }
                onClick={() => setSetupTab("victory")}
              >
                ZAFER
              </button>
              <button
                className={
                  setupTab === "advanced"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSetupTab("advanced")
                }
              >
                GELİŞMİŞ
              </button>
            </div>

            {setupTab === "basic" && (
              <div className="settings-grid">
                <label>
                  Oyun adı
                  <input
                    value={roomName}
                    onChange={(event) =>
                      setRoomName(event.target.value)
                    }
                  />
                </label>
                <label>
                  Tur süresi
                  <select
                    value={turnMinutes}
                    onChange={(event) =>
                      setTurnMinutes(
                        Number(event.target.value)
                      )
                    }
                  >
                    {[1, 2, 4, 6, 8, 12].map(
                      (value) => (
                        <option
                          value={value}
                          key={value}
                        >
                          {value} dakika
                        </option>
                      )
                    )}
                  </select>
                </label>
                <label>
                  Başlangıç parası
                  <select
                    value={startingMoney}
                    onChange={(event) =>
                      setStartingMoney(
                        Number(event.target.value)
                      )
                    }
                  >
                    {[5000, 10000, 25000, 50000].map(
                      (value) => (
                        <option
                          value={value}
                          key={value}
                        >
                          {value.toLocaleString("tr-TR")} Altın
                        </option>
                      )
                    )}
                  </select>
                </label>
                <label>
                  Maksimum oyuncu
                  <select
                    value={maxPlayers}
                    onChange={(event) =>
                      setMaxPlayers(
                        Number(event.target.value)
                      )
                    }
                  >
                    {[2, 4, 10, 20, 40].map(
                      (value) => (
                        <option
                          value={value}
                          key={value}
                        >
                          {value}
                        </option>
                      )
                    )}
                  </select>
                </label>
                <label className="wide">
                  Strateji
                  <select
                    value={selectedStrategy}
                    onChange={(event) =>
                      setSelectedStrategy(
                        event.target.value
                      )
                    }
                  >
                    {STRATEGIES.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name} — {item.role}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="strategy-note wide">
                  <b>{strategy.name}</b>
                  <span>{strategy.description}</span>
                </div>
              </div>
            )}

            {setupTab === "victory" && (
              <div className="settings-grid">
                <div className="victory-card wide">
                  <span>Kazanma koşulu</span>
                  <b>
                    Düşman başkentini ele geçir ve
                    belirlenen tur boyunca tut.
                  </b>
                </div>
                <label>
                  Başkenti tut
                  <select
                    value={victoryHoldTurns}
                    onChange={(event) =>
                      setVictoryHoldTurns(
                        Number(event.target.value)
                      )
                    }
                  >
                    {[1, 2, 3, 4, 5].map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {value} tur
                        </option>
                      )
                    )}
                  </select>
                </label>
                <label>
                  Maksimum tur
                  <select
                    value={maxGameTurns}
                    onChange={(event) =>
                      setMaxGameTurns(
                        Number(event.target.value)
                      )
                    }
                  >
                    {[20, 30, 50, 75, 100].map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {value}
                        </option>
                      )
                    )}
                  </select>
                </label>
              </div>
            )}

            {setupTab === "advanced" && (
              <div className="advanced-draft">
                <div>
                  <b>Ek şehirler</b>
                  <span>Aktif</span>
                </div>
                <div>
                  <b>Nadir birlikler</b>
                  <span>Düşük</span>
                </div>
                <div>
                  <b>Maks. müttefik</b>
                  <span>3</span>
                </div>
                <div>
                  <b>Tekrar katılma</b>
                  <span>Açık</span>
                </div>
                <p>
                  Bu ayarlar taslak sürümde görsel olarak
                  hazır; backend geldikten sonra oda
                  kurallarına bağlanacak.
                </p>
              </div>
            )}

            <footer className="setup-footer">
              <div>
                <span>Bütçe</span>
                <b>
                  {startingMoney.toLocaleString("tr-TR")}
                </b>
              </div>
              <div>
                <span>Strateji</span>
                <b>{strategy.name}</b>
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setSelectedHomeland("");
                  resetMap();
                  setScreen("homeland");
                }}
              >
                ANAVATAN SEÇİMİNE GEÇ
              </button>
            </footer>
          </section>
        </main>
      </div>
    );
  }

  if (screen === "homeland") {
    const purchasePrice =
      selectedHomelandData?.purchasePrice ?? 0;
    const remaining =
      startingMoney - purchasePrice;
    return (
      <div className="app homeland-screen">
        <header className="map-topbar">
          <div>
            <b>IRON ATLAS</b>
            <span>
              Dünya haritasından anavatanını seç
            </span>
          </div>
          <button onClick={() => setScreen("setup")}>
            ← AYARLAR
          </button>
        </header>

        <main className="map-stage">
          {mapError ? (
            <div className="map-status">{mapError}</div>
          ) : world.length ? (
            renderWorldMap("homeland")
          ) : (
            <div className="map-status">
              Dünya haritası yükleniyor...
            </div>
          )}

          <div className="map-controls">
            <button onClick={() => setZoom(mapZoom * 1.2)}>
              +
            </button>
            <span>{Math.round(mapZoom * 100)}%</span>
            <button onClick={() => setZoom(mapZoom / 1.2)}>
              −
            </button>
            <button onClick={resetMap}>⟳</button>
          </div>

          <aside className="purchase-panel panel">
            <span className="kicker">ÜLKE SEÇİMİ</span>
            <h2>
              {selectedHomelandData?.name ??
                "Haritadan bir ülke seç"}
            </h2>

            {selectedHomelandData ? (
              <>
                <div className="purchase-stats">
                  <div>
                    <span>Bölge</span>
                    <b>{selectedHomelandData.region}</b>
                  </div>
                  <div>
                    <span>Başkent</span>
                    <b>
                      {homelandCapital?.name ?? "—"}
                    </b>
                  </div>
                  <div>
                    <span>Şehir</span>
                    <b>{homelandCities.length}</b>
                  </div>
                  <div>
                    <span>Üretim kapasitesi</span>
                    <b>
                      {homelandCities.reduce(
                        (sum, city) =>
                          sum + city.recruitCapacity,
                        0
                      )}
                    </b>
                  </div>
                  <div>
                    <span>Toplam gelir</span>
                    <b>
                      {homelandCities
                        .reduce(
                          (sum, city) =>
                            sum + city.income,
                          0
                        )
                        .toLocaleString("tr-TR")}
                    </b>
                  </div>
                  <div>
                    <span>Tur büyümesi</span>
                    <b>
                      +
                      {homelandCities
                        .reduce(
                          (sum, city) =>
                            sum + city.growth,
                          0
                        )
                        .toLocaleString("tr-TR")}
                    </b>
                  </div>
                </div>

                <div className="purchase-city-list">
                  {homelandCities.map((city) => (
                    <div key={city.code}>
                      <span>
                        {city.isCapital ? "★ " : ""}
                        {city.name}
                      </span>
                      <b>{city.recruitCapacity}</b>
                    </div>
                  ))}
                </div>

                <div className="purchase-price">
                  <div>
                    <span>Başlangıç bütçesi</span>
                    <b>
                      {startingMoney.toLocaleString(
                        "tr-TR"
                      )}
                    </b>
                  </div>
                  <div>
                    <span>Ülke fiyatı</span>
                    <b>
                      {purchasePrice.toLocaleString(
                        "tr-TR"
                      )}
                    </b>
                  </div>
                  <div>
                    <span>Kalan</span>
                    <b>
                      {Math.max(
                        0,
                        remaining
                      ).toLocaleString("tr-TR")}
                    </b>
                  </div>
                </div>

                <button
                  className="primary-button purchase-button"
                  disabled={remaining < 0}
                  onClick={() =>
                    beginCampaign(selectedHomeland)
                  }
                >
                  {remaining < 0
                    ? "YETERSİZ BÜTÇE"
                    : "ÜLKEYİ SATIN AL VE BAŞLA"}
                </button>
              </>
            ) : (
              <p className="empty-help">
                Türkiye, Almanya, Fransa, ABD, Rusya,
                Çin, Japonya ve diğer hazırlanmış
                ülkelerden birine tıkla.
              </p>
            )}
          </aside>
        </main>
      </div>
    );
  }

  const ownedCityCount = allCities.filter(
    (city) => cityOwners[city.code] === currentPlayer
  ).length;
  const countryHold =
    capitalHolds[selectedCountry];

  const commanderStatus = [
    currentPlayer,
    "Dogan",
    "Nova",
  ]
    .filter(
      (player, index, array) =>
        array.indexOf(player) === index &&
        Boolean(homeCountries[player])
    )
    .map((player) => {
      const homeCode = homeCountries[player];
      const homeCountry =
        allCountryByCode[homeCode];
      const controlledCities = allCities.filter(
        (city) => cityOwners[city.code] === player
      ).length;
      const homeCapital = allCitiesForCountry(
        homeCode
      ).find((city) => city.isCapital);
      const capitalOwner = homeCapital
        ? cityOwners[homeCapital.code] ?? null
        : null;
      const treasury =
        player === currentPlayer
          ? resources
          : aiResources[player] ?? {
              gold: 0,
              steel: 0,
              oil: 0,
            };

      return {
        player,
        homeCode,
        homeName: homeCountry?.name ?? homeCode,
        controlledCities,
        capitalOwner,
        gold: treasury.gold,
      };
    });

  return (
    <div className="app game-screen">
      <header className="game-hud">
        <div className="hud-brand">
          <b>IRON ATLAS</b>
          <span>{roomName}</span>
        </div>
        <div className="hud-chip">
          <span>TUR</span>
          <b>
            {turn}/{maxGameTurns}
          </b>
        </div>
        <div className="hud-chip">
          <span>ALTIN</span>
          <b>{resources.gold.toLocaleString("tr-TR")}</b>
        </div>
        <div className="hud-chip">
          <span>ÇELİK</span>
          <b>{resources.steel.toLocaleString("tr-TR")}</b>
        </div>
        <div className="hud-chip">
          <span>PETROL</span>
          <b>{resources.oil.toLocaleString("tr-TR")}</b>
        </div>
        <div className="hud-strategy">
          <span>STRATEJİ</span>
          <b>{strategy.name}</b>
        </div>
        <button
          className="end-turn-button"
          onClick={processTurn}
          disabled={Boolean(winner)}
        >
          TURU BİTİR
        </button>
      </header>

      <main className="game-map-stage">
        {renderWorldMap("game")}

        {winner && (
          <div className="game-outcome-overlay">
            <div className="game-outcome-card panel">
              <span className="kicker">
                OYUN SONA ERDİ
              </span>
              <h1>
                {winner === currentPlayer
                  ? "ZAFER"
                  : "YENİLGİ"}
              </h1>
              <p>
                {winner === currentPlayer
                  ? "Düşman anavatan başkentini gerekli süre boyunca kontrol altında tuttun."
                  : `${winner} anavatan başkentini gerekli süre boyunca kontrol etti.`}
              </p>
              <button
                className="primary-button"
                onClick={() => {
                  setWinner(null);
                  setScreen("setup");
                  setLastTurnEvents([]);
                  setNotice(
                    "Yeni oyun ayarlarını seçebilirsin."
                  );
                }}
              >
                YENİ OYUN
              </button>
            </div>
          </div>
        )}

        <div className="map-controls game-map-controls">
          <button onClick={() => setZoom(mapZoom * 1.2)}>
            +
          </button>
          <span>{Math.round(mapZoom * 100)}%</span>
          <button onClick={() => setZoom(mapZoom / 1.2)}>
            −
          </button>
          <button onClick={resetMap}>⟳</button>
        </div>

        <aside className="country-intel panel">
          <span className="kicker">SEÇİLİ ÜLKE</span>
          <h2>
            {selectedCountryDefinition?.name ??
              selectedCountry}
          </h2>
          <div>
            <span>Stratejik sahip</span>
            <b>
              {countryOwners[selectedCountry] ??
                "Tarafsız"}
            </b>
          </div>
          <div>
            <span>Stratejik kontrol</span>
            <b>
              {selectedStrategicOwnedCities.length}/
              {selectedCountryCities.length}
            </b>
          </div>
          <div>
            <span>Senin şehirlerin</span>
            <b>
              {selectedCountryOwnedCities.length}/
              {selectedCountryCities.length}
            </b>
          </div>
          <div>
            <span>Tarafsız şehir</span>
            <b>{selectedNeutralCities.length}</b>
          </div>
          <div>
            <span>Başkent</span>
            <b>{selectedCapitalOwner ?? "Tarafsız"}</b>
          </div>
          <div>
            <span>Başkent tutma</span>
            <b>
              {countryHold?.turns ?? 0}/
              {victoryHoldTurns}
            </b>
          </div>
          <div>
            <span>Toplam şehrin</span>
            <b>{ownedCityCount}</b>
          </div>
        </aside>

        <aside className="commander-status panel">
          <div className="commander-status-title">
            KOMUTANLAR
          </div>
          {commanderStatus.map((entry) => (
            <div
              className="commander-status-row"
              key={entry.player}
            >
              <span
                className="commander-color"
                style={{
                  background:
                    entry.player === currentPlayer
                      ? playerColor
                      : AI_COLORS[entry.player] ??
                        "#7a8288",
                }}
              />
              <div>
                <b>
                  {entry.player}
                  {entry.player === currentPlayer
                    ? " (Sen)"
                    : ""}
                </b>
                <span>{entry.homeName}</span>
              </div>
              <div className="commander-stats">
                <b>{entry.controlledCities} şehir</b>
                <span>
                  {entry.gold.toLocaleString("tr-TR")} A
                </span>
                <small
                  className={
                    entry.capitalOwner === entry.player
                      ? "capital-safe"
                      : "capital-danger"
                  }
                >
                  {entry.capitalOwner === entry.player
                    ? "★ Başkent güvende"
                    : "★ Başkent kayıp"}
                </small>
              </div>
            </div>
          ))}
        </aside>

        {cityPanelOpen && selectedCity && (
          <section
            className="city-window panel"
            style={{
              left: cityWindowPosition.x,
              top: cityWindowPosition.y,
            }}
          >
            <header
              className="city-window-drag-handle"
              onPointerDown={(event) => {
                if (
                  (event.target as HTMLElement).closest("button")
                ) {
                  return;
                }
                event.stopPropagation();
                event.currentTarget.setPointerCapture(
                  event.pointerId
                );
                cityWindowDragRef.current = {
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startY: event.clientY,
                  originX: cityWindowPosition.x,
                  originY: cityWindowPosition.y,
                };
              }}
              onPointerMove={(event) => {
                const drag = cityWindowDragRef.current;
                if (
                  !drag ||
                  drag.pointerId !== event.pointerId
                ) {
                  return;
                }
                event.stopPropagation();
                const maxX = Math.max(
                  0,
                  window.innerWidth - 410
                );
                const maxY = Math.max(
                  0,
                  window.innerHeight - 120
                );
                setCityWindowPosition({
                  x: Math.min(
                    maxX,
                    Math.max(
                      0,
                      drag.originX +
                        event.clientX -
                        drag.startX
                    )
                  ),
                  y: Math.min(
                    maxY,
                    Math.max(
                      0,
                      drag.originY +
                        event.clientY -
                        drag.startY
                    )
                  ),
                });
              }}
              onPointerUp={(event) => {
                if (
                  cityWindowDragRef.current?.pointerId ===
                  event.pointerId
                ) {
                  cityWindowDragRef.current = null;
                  event.stopPropagation();
                }
              }}
              onPointerCancel={() => {
                cityWindowDragRef.current = null;
              }}
            >
              <div>
                <b>{selectedCity.name}</b>
                <span>
                  {selectedCity.isCapital
                    ? "★ Başkent"
                    : "Şehir"}{" "}
                  · Kapasite{" "}
                  {selectedCityRecruitCapacity}
                  {hasPortCode(selectedCity.code)
                    ? " · ⚓ Liman"
                    : ""}
                </span>
              </div>
              <button
                onPointerDown={(event) =>
                  event.stopPropagation()
                }
                onClick={() =>
                  setCityPanelOpen(false)
                }
              >
                ×
              </button>
            </header>

            <div className="city-meta">
              <span>
                Sahip:{" "}
                <b>
                  {selectedCityOwner ?? "Tarafsız"}
                </b>
              </span>
              <span>
                Gelir: <b>{selectedCity.income}</b>
              </span>
              <span>
                Büyüme:{" "}
                <b>+{selectedCity.growth}</b>
              </span>
            </div>

            <div className="city-tabs">
              <button
                className={
                  cityTab === "production"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCityTab("production")
                }
              >
                ASKER BAS
              </button>
              <button
                className={
                  cityTab === "movement"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCityTab("movement")
                }
              >
                BİRLİK TAŞI
              </button>
            </div>

            {cityTab === "production" ? (
              <div className="unit-scroll">
                <div className="capacity-strip instant-production">
                  <span>Bu tur üretildi</span>
                  <b>
                    {productionUsedThisTurn[
                      selectedCity.code
                    ] ?? 0}
                    /{selectedCityRecruitCapacity}
                  </b>
                  <span>Kalan kapasite</span>
                  <b>
                    {Math.max(
                      0,
                      selectedCityRecruitCapacity -
                        (productionUsedThisTurn[
                          selectedCity.code
                        ] ?? 0)
                    )}
                  </b>
                </div>

                {UNIT_DEFINITIONS.map((unit) => {
                  const effective = effectiveUnit(unit);
                  const cost =
                    productionCost(effective, 1);
                  const requiresPort =
                    unit.domain === "naval" &&
                    !hasPortCode(selectedCity.code);

                  return (
                    <div
                      className="unit-row"
                      key={unit.id}
                    >
                      <div className="unit-thumb">
                        {UNIT_ICON_BY_ID[unit.id] ? (
                          <img
                            src={
                              UNIT_ICON_BY_ID[unit.id]
                            }
                            alt={unit.name}
                          />
                        ) : (
                          <span>
                            {unit.domain === "air"
                              ? "✈"
                              : unit.domain === "naval"
                                ? "◆"
                                : "▰"}
                          </span>
                        )}
                      </div>
                      <div className="unit-row-info">
                        <b>{unit.name}</b>
                        <span>
                          {cost.gold} A · {cost.steel} Ç
                          · {cost.oil} P
                        </span>
                        {requiresPort && (
                          <span className="port-required">
                            ⚓ Liman gerekli
                          </span>
                        )}
                      </div>
                      <div className="unit-pending">
                        {selectedGarrison[unit.id] ?? 0}
                      </div>
                      <button
                        disabled={
                          selectedCityOwner !==
                            currentPlayer ||
                          requiresPort ||
                          (productionUsedThisTurn[
                            selectedCity.code
                          ] ?? 0) >=
                            selectedCityRecruitCapacity
                        }
                        onClick={() =>
                          queueProduction(
                            selectedCity,
                            unit,
                            1
                          )
                        }
                      >
                        +1
                      </button>
                      <button
                        disabled={
                          selectedCityOwner !==
                            currentPlayer ||
                          requiresPort ||
                          (productionUsedThisTurn[
                            selectedCity.code
                          ] ?? 0) >=
                            selectedCityRecruitCapacity
                        }
                        onClick={() =>
                          queueProduction(
                            selectedCity,
                            unit,
                            5
                          )
                        }
                      >
                        +5
                      </button>
                      <button
                        disabled={
                          selectedCityOwner !==
                            currentPlayer ||
                          requiresPort ||
                          (productionUsedThisTurn[
                            selectedCity.code
                          ] ?? 0) >=
                            selectedCityRecruitCapacity
                        }
                        onClick={() =>
                          queueProduction(
                            selectedCity,
                            unit,
                            10
                          )
                        }
                      >
                        +10
                      </button>
                    </div>
                  );
                })}

                <div className="structure-section">
                  <div className="structure-section-title">
                    <div>
                      <b>ŞEHİR YAPILARI</b>
                      <span>
                        Yapılar anında tamamlanır ve şehirde kalır.
                      </span>
                    </div>
                  </div>

                  {CITY_STRUCTURES.map((structure) => {
                    const level =
                      selectedCityStructures[
                        structure.id
                      ] ?? 0;
                    const nextLevel = level + 1;
                    const maxed =
                      level >= structure.maxLevel;
                    const goldCost =
                      structure.goldCost * nextLevel;
                    const steelCost =
                      structure.steelCost * nextLevel;
                    const oilCost =
                      structure.oilCost * nextLevel;

                    return (
                      <div
                        className="structure-row"
                        key={structure.id}
                      >
                        <div className="structure-icon">
                          {structure.icon}
                        </div>
                        <div className="structure-info">
                          <b>{structure.name}</b>
                          <span>
                            Seviye {level}/
                            {structure.maxLevel} ·{" "}
                            {structure.description}
                          </span>
                          {!maxed && (
                            <small>
                              {goldCost} A ·{" "}
                              {steelCost} Ç ·{" "}
                              {oilCost} P
                            </small>
                          )}
                        </div>
                        <button
                          disabled={
                            maxed ||
                            selectedCityOwner !==
                              currentPlayer
                          }
                          onClick={() =>
                            buildCityStructure(
                              selectedCity,
                              structure
                            )
                          }
                        >
                          {maxed
                            ? "MAX"
                            : "+ SV" + nextLevel}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="unit-scroll movement-list">
                <p>
                  Birlik miktarını seç ve sarı işareti sürükle. Deniz aşmak için kara birlikleriyle Destek Gemisi, hava nakli için Nakliye Uçağı seç.
                </p>
                {UNIT_DEFINITIONS.filter(
                  (unit) =>
                    (selectedGarrison[unit.id] ??
                      0) > 0
                ).map((unit) => {
                  const available =
                    selectedGarrison[unit.id] ?? 0;
                  const selected =
                    moveDraft[unit.id] ?? 0;
                  return (
                    <div
                      className="move-row"
                      key={unit.id}
                    >
                      <div className="unit-thumb">
                        {UNIT_ICON_BY_ID[unit.id] ? (
                          <img
                            src={
                              UNIT_ICON_BY_ID[unit.id]
                            }
                            alt={unit.name}
                          />
                        ) : (
                          <span>▰</span>
                        )}
                      </div>
                      <div>
                        <b>{unit.name}</b>
                        <span>
                          Garnizon: {available}
                        </span>
                      </div>
                      <button
                        className="move-step"
                        onClick={() =>
                          setMoveDraft((current) => ({
                            ...current,
                            [unit.id]: Math.max(
                              0,
                              (current[unit.id] ?? 0) - 1
                            ),
                          }))
                        }
                      >
                        −
                      </button>
                      <input
                        type="range"
                        min="0"
                        max={available}
                        value={selected}
                        onChange={(event) =>
                          setMoveDraft((current) => ({
                            ...current,
                            [unit.id]: Number(
                              event.target.value
                            ),
                          }))
                        }
                      />
                      <button
                        className="move-step"
                        onClick={() =>
                          setMoveDraft((current) => ({
                            ...current,
                            [unit.id]: Math.min(
                              available,
                              (current[unit.id] ?? 0) + 1
                            ),
                          }))
                        }
                      >
                        +
                      </button>
                      <b className="move-selected-count">{selected}</b>
                      <button
                        onClick={() =>
                          setMoveDraft((current) => ({
                            ...current,
                            [unit.id]: available,
                          }))
                        }
                      >
                        ALL
                      </button>
                    </div>
                  );
                })}

                <div className="move-summary">
                  <span>Seçilen birlik</span>
                  <b>{moveSelectionCount}</b>
                  <span>1 tur menzili</span>
                  <b>
                    {moveSelectionCount > 0
                      ? Math.round(activeMoveRangeKm).toLocaleString("tr-TR") + " km"
                      : "—"}
                  </b>
                  {transportModeLabel && (
                    <>
                      <span>Nakliye</span>
                      <b className="transport-ok">
                        {transportModeLabel}
                      </b>
                    </>
                  )}
                  {transportCapacityIssue && (
                    <div className="transport-warning">
                      {transportCapacityIssue}
                    </div>
                  )}
                </div>

                <div
                  className={
                    moveSelectionCount > 0
                      ? "drag-mode-status active"
                      : "drag-mode-status"
                  }
                >
                  {moveSelectionCount > 0
                    ? "SÜRÜKLEME AKTİF · ŞEHİR ÜZERİNDEKİ SARI İŞARETİ TUT"
                    : "ÖNCE BİRLİK MİKTARI SEÇ"}
                </div>
              </div>
            )}
          </section>
        )}

        {fieldArmyPanelOpen && selectedFieldArmy && (
          <section className="city-window field-army-window panel">
            <header>
              <div>
                <b>Saha Birliği</b>
                <span>
                  Haritadaki birlik grubu · Tur {turn}
                </span>
              </div>
              <button
                onClick={() => {
                  setFieldArmyPanelOpen(false);
                  setSelectedFieldArmyId(null);
                  setMoveSourceArmyId(null);
                  setMoveDraft({});
                }}
              >
                ×
              </button>
            </header>

            <div className="city-meta">
              <span>
                Sahip: <b>{selectedFieldArmy.player}</b>
              </span>
              <span>
                Toplam:{" "}
                <b>
                  {Object.values(
                    selectedFieldArmy.units
                  ).reduce(
                    (sum, quantity) => sum + quantity,
                    0
                  )}
                </b>
              </span>
            </div>

            <div className="unit-scroll movement-list">
              <p>
                Birlik miktarını seç. Konvoydaki kara birliklerini taşımak için taşıyıcı gemi/uçağı da aynı seçimde bırak.
              </p>

              {UNIT_DEFINITIONS.filter(
                (unit) =>
                  (selectedFieldArmy.units[unit.id] ?? 0) > 0
              ).map((unit) => {
                const available =
                  selectedFieldArmy.units[unit.id] ?? 0;
                const selected =
                  moveDraft[unit.id] ?? 0;
                return (
                  <div className="move-row" key={unit.id}>
                    <div className="unit-thumb">
                      {UNIT_ICON_BY_ID[unit.id] ? (
                        <img
                          src={UNIT_ICON_BY_ID[unit.id]}
                          alt={unit.name}
                        />
                      ) : (
                        <span>▰</span>
                      )}
                    </div>
                    <div>
                      <b>{unit.name}</b>
                      <span>Birlik: {available}</span>
                    </div>
                    <button
                      className="move-step"
                      onClick={() =>
                        setMoveDraft((current) => ({
                          ...current,
                          [unit.id]: Math.max(
                            0,
                            (current[unit.id] ?? 0) - 1
                          ),
                        }))
                      }
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min="0"
                      max={available}
                      value={selected}
                      onChange={(event) =>
                        setMoveDraft((current) => ({
                          ...current,
                          [unit.id]: Number(
                            event.target.value
                          ),
                        }))
                      }
                    />
                    <button
                      className="move-step"
                      onClick={() =>
                        setMoveDraft((current) => ({
                          ...current,
                          [unit.id]: Math.min(
                            available,
                            (current[unit.id] ?? 0) + 1
                          ),
                        }))
                      }
                    >
                      +
                    </button>
                    <b className="move-selected-count">
                      {selected}
                    </b>
                    <button
                      onClick={() =>
                        setMoveDraft((current) => ({
                          ...current,
                          [unit.id]: available,
                        }))
                      }
                    >
                      ALL
                    </button>
                  </div>
                );
              })}

              <div className="move-summary">
                <span>Seçilen birlik</span>
                <b>{moveSelectionCount}</b>
                <span>1 tur menzili</span>
                <b>
                  {moveSelectionCount > 0
                    ? Math.round(
                        activeMoveRangeKm
                      ).toLocaleString("tr-TR") + " km"
                    : "—"}
                </b>
                {transportModeLabel && (
                  <>
                    <span>Nakliye</span>
                    <b className="transport-ok">
                      {transportModeLabel}
                    </b>
                  </>
                )}
                {transportCapacityIssue && (
                  <div className="transport-warning">
                    {transportCapacityIssue}
                  </div>
                )}
              </div>

              <div
                className={
                  moveSelectionCount > 0
                    ? "drag-mode-status active"
                    : "drag-mode-status"
                }
              >
                {moveSelectionCount > 0
                  ? "SÜRÜKLEME AKTİF · HARİTADAKİ SARI İŞARETİ TUT"
                  : "ÖNCE BİRLİK MİKTARI SEÇ"}
              </div>
            </div>
          </section>
        )}

        {lastTurnEvents.length > 0 && (
          <aside className="turn-report panel">
            <div className="turn-report-title">
              TUR {turn} RAPORU
            </div>
            {lastTurnEvents.map((event, index) => (
              <div
                className="turn-report-event"
                key={turn + "-" + index + "-" + event}
              >
                {event}
              </div>
            ))}
          </aside>
        )}

        <div className="notice-bar">{notice}</div>

        {(moveSourceCode || moveSourceArmyId) && (
          <div className="target-hint">
            <span>
              SARI BİRLİK İŞARETİNİ TUT VE SÜRÜKLE · {moveSelectionCount} birlik · {transportModeLabel || "Normal hareket"} · sınır{" "}
              {Math.round(activeMoveRangeKm).toLocaleString("tr-TR")} km
            </span>
            <button
              onClick={() => {
                const armyMode = Boolean(moveSourceArmyId);
                setMoveSourceCode(null);
                setMoveSourceArmyId(null);
                setMoveDraft({});
                setMoveDragTarget(null);
                if (armyMode) {
                  setFieldArmyPanelOpen(true);
                } else {
                  setCityPanelOpen(true);
                  setCityTab("movement");
                }
                setNotice("Taşıma emri iptal edildi.");
              }}
            >
              İPTAL
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
