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
  citiesForCountry,
  type CityNode,
} from "./gameData";

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
  fromCode: string;
  toCode: string;
  unitId: string;
  quantity: number;
  distanceKm: number;
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
};

function featureCountryCode(feature: WorldFeature) {
  const id = String(feature.id ?? "");
  if (COUNTRY_BY_CODE[id]) return id;
  return GEO_NAME_TO_CODE[feature.properties?.name ?? ""] ?? id;
}

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

function haversineKm(a: CityNode, b: CityNode) {
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

function movementRangeKm(unit: UnitDefinition) {
  return unit.stats.movement * 330;
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

function countryIncome(countryCode: string) {
  return citiesForCountry(countryCode).reduce(
    (sum, city) => sum + city.income,
    0
  );
}

function countryGrowth(countryCode: string) {
  return citiesForCountry(countryCode).reduce(
    (sum, city) => sum + city.growth,
    0
  );
}

function startingGarrison(city: CityNode) {
  if (city.isCapital) {
    return {
      infantry: 80,
      militia: 30,
      light_tank: 14,
      heavy_tank: 5,
      fighter: 5,
      attack_helicopter: 4,
    };
  }
  return {
    infantry: 12 + city.recruitCapacity * 4,
    militia: 6,
    light_tank: Math.max(0, city.recruitCapacity - 1) * 2,
  };
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
  const [capitalHolds, setCapitalHolds] = useState<
    Record<string, CapitalHold>
  >({});

  const [selectedCountry, setSelectedCountry] = useState("TUR");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [cityPanelOpen, setCityPanelOpen] = useState(false);
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

  const strategy = strategyById(selectedStrategy);
  const selectedCity = CITIES.find(
    (city) => city.code === selectedCityCode
  );
  const selectedCityOwner = selectedCity
    ? cityOwners[selectedCity.code] ?? null
    : null;
  const selectedGarrison = selectedCity
    ? garrisons[selectedCity.code] ?? {}
    : {};
  const selectedCountryDefinition =
    COUNTRY_BY_CODE[selectedCountry];
  const selectedCountryCities =
    citiesForCountry(selectedCountry);
  const selectedCountryOwnedCities =
    selectedCountryCities.filter(
      (city) => cityOwners[city.code] === currentPlayer
    );
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
    COUNTRY_BY_CODE[selectedHomeland];
  const homelandCities = selectedHomeland
    ? citiesForCountry(selectedHomeland)
    : [];
  const homelandCapital = homelandCities.find(
    (city) => city.isCapital
  );

  const moveSelectionEntries = Object.entries(moveDraft).filter(
    ([, quantity]) => quantity > 0
  );
  const moveSelectionCount = moveSelectionEntries.reduce(
    (sum, [, quantity]) => sum + quantity,
    0
  );
  const activeMoveSource = moveSourceCode
    ? CITIES.find((city) => city.code === moveSourceCode)
    : undefined;
  const previewMoveSource =
    activeMoveSource ??
    (cityPanelOpen &&
    cityTab === "movement" &&
    selectedCityOwner === currentPlayer
      ? selectedCity
      : undefined);
  const activeMoveRangeKm = useMemo(() => {
    if (!moveSelectionEntries.length) return 0;
    const ranges = moveSelectionEntries
      .map(([unitId]) => UNIT_BY_ID[unitId])
      .filter((unit): unit is UnitDefinition => Boolean(unit))
      .map((unit) =>
        movementRangeKm(applyStrategy(unit, selectedStrategy))
      );
    return ranges.length ? Math.min(...ranges) : 0;
  }, [moveDraft, selectedStrategy]);
  const activeMoveRangeRadius =
    (activeMoveRangeKm / 40075) * WORLD_WIDTH;

  const playerCountries = COUNTRIES.filter(
    (country) => countryOwners[country.code] === currentPlayer
  );

  function setZoom(nextZoom: number) {
    const zoom = Math.max(1, Math.min(3, nextZoom));
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

  function handleMapDown(
    event: ReactPointerEvent<SVGSVGElement>
  ) {
    if (event.button !== 0) return;
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

  function handleMapUp() {
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
    const country = COUNTRY_BY_CODE[countryCode];
    if (!country) return;
    if (country.purchasePrice > startingMoney) {
      setNotice("Bu ülke için başlangıç paran yeterli değil.");
      return;
    }

    const opponents = ["RUS", "FRA", "USA", "CHN", "DEU", "JPN"]
      .filter((code) => code !== countryCode)
      .slice(0, 2);
    const [doganCountry, novaCountry] = opponents;

    const nextCountryOwners: Record<string, string | null> = {};
    COUNTRIES.forEach((item) => {
      nextCountryOwners[item.code] = null;
    });
    nextCountryOwners[countryCode] = currentPlayer;
    if (doganCountry) nextCountryOwners[doganCountry] = "Dogan";
    if (novaCountry) nextCountryOwners[novaCountry] = "Nova";

    const nextCityOwners: Record<string, string | null> = {};
    const nextGarrisons: Garrison = {};
    CITIES.forEach((city) => {
      let owner: string | null = null;
      if (city.countryCode === countryCode) owner = currentPlayer;
      if (city.countryCode === doganCountry) owner = "Dogan";
      if (city.countryCode === novaCountry) owner = "Nova";
      nextCityOwners[city.code] = owner;
      if (owner) {
        nextGarrisons[city.code] = startingGarrison(city);
      }
    });

    setCountryOwners(nextCountryOwners);
    setCityOwners(nextCityOwners);
    setGarrisons(nextGarrisons);
    setProductionQueue([]);
    setMovementQueue([]);
    setCapitalHolds({});
    setResources({
      gold: startingMoney - country.purchasePrice,
      steel: 900,
      oil: 720,
    });
    setTurn(1);
    setSelectedCountry(countryCode);
    const capital = citiesForCountry(countryCode).find(
      (city) => city.isCapital
    );
    if (capital) {
      setSelectedCityCode(capital.code);
      const [x, y] = project([capital.lon, capital.lat]);
      setMapCenter({ x, y });
      setMapZoom(1.9);
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

  function queueProduction(
    city: CityNode,
    unit: UnitDefinition,
    quantity: number
  ) {
    if (cityOwners[city.code] !== currentPlayer) {
      setNotice("Sadece kendi şehrinde üretim yapabilirsin.");
      return;
    }

    const activeOrders = productionQueue.filter(
      (order) =>
        order.cityCode === city.code &&
        order.readyTurn > turn
    ).length;
    if (activeOrders >= city.recruitCapacity) {
      setNotice(
        `${city.name} üretim kapasitesi dolu (${activeOrders}/${city.recruitCapacity}).`
      );
      return;
    }

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

    const readyTurn =
      turn + productionTurns(unitWithStrategy);
    setResources((current) => ({
      gold: current.gold - cost.gold,
      steel: current.steel - cost.steel,
      oil: current.oil - cost.oil,
    }));
    setProductionQueue((current) => [
      ...current,
      {
        id: orderIdRef.current++,
        player: currentPlayer,
        cityCode: city.code,
        unitId: unit.id,
        quantity,
        readyTurn,
      },
    ]);
    setNotice(
      `${city.name}: ${quantity} × ${unit.name} üretime alındı (Tur ${readyTurn}).`
    );
  }

  function startMovement() {
    if (!selectedCity) return;
    if (selectedCityOwner !== currentPlayer) {
      setNotice("Birlik taşıma için kendi şehrini seç.");
      return;
    }
    const selected = Object.entries(moveDraft).filter(
      ([, quantity]) => quantity > 0
    );
    if (!selected.length) {
      setNotice("Taşınacak birlik miktarını seç.");
      return;
    }
    setMoveSourceCode(selectedCity.code);
    setCityPanelOpen(false);
    setNotice(
      `${selectedCity.name}: ${moveSelectionCount} birlik seçildi. Yeşil menzil içindeki hedef şehre tıkla.`
    );
  }

  function handleCityClick(city: CityNode) {
    if (moveSourceCode) {
      issueMovement(city);
      return;
    }
    setSelectedCountry(city.countryCode);
    setSelectedCityCode(city.code);
    setCityTab("production");
    setMoveDraft({});
    setCityPanelOpen(true);
  }

  function issueMovement(target: CityNode) {
    const source = CITIES.find(
      (city) => city.code === moveSourceCode
    );
    if (!source || source.code === target.code) {
      setMoveSourceCode(null);
      setMoveDraft({});
      return;
    }

    const distanceKm = haversineKm(source, target);
    const sourceUnits = {
      ...(garrisons[source.code] ?? {}),
    };
    const orders: MovementOrder[] = [];
    const skipped: string[] = [];

    Object.entries(moveDraft).forEach(
      ([unitId, requested]) => {
        if (requested <= 0) return;
        const baseUnit = UNIT_BY_ID[unitId];
        if (!baseUnit) return;
        const unit = effectiveUnit(baseUnit);
        if (unit.domain === "naval") {
          skipped.push(unit.name + " (liman sistemi bekleniyor)");
          return;
        }
        if (distanceKm > movementRangeKm(unit)) {
          skipped.push(unit.name + " (menzil dışında)");
          return;
        }
        const available = sourceUnits[unitId] ?? 0;
        const quantity = Math.min(requested, available);
        if (quantity <= 0) return;

        sourceUnits[unitId] = available - quantity;
        orders.push({
          id: orderIdRef.current++,
          player: currentPlayer,
          kind:
            cityOwners[target.code] === currentPlayer
              ? "move"
              : "attack",
          fromCode: source.code,
          toCode: target.code,
          unitId,
          quantity,
          distanceKm,
        });
      }
    );

    if (!orders.length) {
      setNotice(
        skipped.length
          ? skipped.join(" · ")
          : "Taşınabilir birlik bulunamadı."
      );
      return;
    }

    setGarrisons((current) => ({
      ...current,
      [source.code]: sourceUnits,
    }));
    setMovementQueue((current) => [
      ...current,
      ...orders,
    ]);
    setMoveSourceCode(null);
    setMoveDraft({});
    setSelectedCountry(target.countryCode);
    setSelectedCityCode(target.code);
    setNotice(
      `${source.name} → ${target.name}: ${orders.length} birlik grubu emre alındı.${skipped.length ? " " + skipped.join(" · ") : ""}`
    );
  }

  function processTurn() {
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

    movementQueue.forEach((order) => {
      const targetCity = CITIES.find(
        (city) => city.code === order.toCode
      );
      if (!targetCity) return;
      const targetOwner =
        nextCityOwners[targetCity.code] ?? null;

      if (targetOwner === order.player) {
        nextGarrisons[targetCity.code] = {
          ...(nextGarrisons[targetCity.code] ?? {}),
          [order.unitId]:
            (nextGarrisons[targetCity.code]?.[order.unitId] ??
              0) + order.quantity,
        };
        return;
      }

      const baseUnit = UNIT_BY_ID[order.unitId];
      if (!baseUnit) return;
      const attacker =
        order.player === currentPlayer
          ? effectiveUnit(baseUnit)
          : baseUnit;
      const defenders =
        nextGarrisons[targetCity.code] ?? {};
      const defensePower = unitDefensePower(defenders);
      const attackPower =
        order.quantity *
        Math.max(1, attacker.stats.attack) *
        (1 + attacker.stats.critical / 25);

      if (
        defensePower <= 0 ||
        attackPower >= defensePower * 0.9
      ) {
        const survivors = Math.max(
          1,
          Math.round(
            order.quantity *
              (1 -
                Math.min(
                  0.72,
                  defensePower /
                    Math.max(1, attackPower * 2.2)
                ))
          )
        );
        nextGarrisons[targetCity.code] = {
          [order.unitId]: survivors,
        };
        nextCityOwners[targetCity.code] = order.player;
        combatLog.push(
          `${targetCity.name} ${order.player} tarafından ele geçirildi.`
        );
      } else {
        const lossRatio = Math.min(
          0.6,
          attackPower / Math.max(1, defensePower * 1.6)
        );
        const reduced: Record<string, number> = {};
        Object.entries(defenders).forEach(
          ([unitId, quantity]) => {
            const left = Math.max(
              0,
              Math.round(quantity * (1 - lossRatio))
            );
            if (left > 0) reduced[unitId] = left;
          }
        );
        nextGarrisons[targetCity.code] = reduced;
        combatLog.push(
          `${targetCity.name} saldırıyı püskürttü.`
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
        return;
      }
      nextGarrisons[order.cityCode] = {
        ...(nextGarrisons[order.cityCode] ?? {}),
        [order.unitId]:
          (nextGarrisons[order.cityCode]?.[order.unitId] ??
            0) + order.quantity,
      };
    });

    const nextHolds = { ...capitalHolds };
    COUNTRIES.forEach((country) => {
      const capital = citiesForCountry(country.code).find(
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
        if (turns >= victoryHoldTurns) {
          nextCountryOwners[country.code] =
            capitalOwner;
        }
      } else {
        nextHolds[country.code] = {
          holder: capitalOwner,
          turns: 0,
        };
      }
    });

    const ownedCities = CITIES.filter(
      (city) =>
        nextCityOwners[city.code] === currentPlayer
    );
    const goldIncome = ownedCities.reduce(
      (sum, city) => sum + city.growth,
      0
    );
    const steelIncome = ownedCities.reduce(
      (sum, city) =>
        sum +
        (COUNTRY_BY_CODE[city.countryCode]?.primaryResource ===
        "Çelik"
          ? 18
          : 4),
      0
    );
    const oilIncome = ownedCities.reduce(
      (sum, city) =>
        sum +
        (COUNTRY_BY_CODE[city.countryCode]?.primaryResource ===
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
    setGarrisons(nextGarrisons);
    setCityOwners(nextCityOwners);
    setCountryOwners(nextCountryOwners);
    setCapitalHolds(nextHolds);
    setProductionQueue(validPending);
    setMovementQueue([]);
    setTurn(nextTurn);
    setNotice(
      `Tur ${nextTurn}: +${goldIncome} Altın, +${steelIncome} Çelik, +${oilIncome} Petrol.${combatLog.length ? " " + combatLog.join(" ") : ""}`
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
              {world.map((feature, index) => {
                const rawCode = String(
                  feature.id ?? "country-" + index
                );
                const code = featureCountryCode(feature);
                const supported =
                  Boolean(COUNTRY_BY_CODE[code]);
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
                            ? 0.32
                            : 0.04
                          : isSelected
                            ? 0.32
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
              CITIES.map((city) => {
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
                    ? haversineKm(activeMoveSource, city)
                    : 0;
                const inTargetMode = Boolean(activeMoveSource);
                const isReachableTarget =
                  inTargetMode &&
                  city.code !== activeMoveSource?.code &&
                  targetDistance <= activeMoveRangeKm;
                const isUnreachableTarget =
                  inTargetMode &&
                  city.code !== activeMoveSource?.code &&
                  targetDistance > activeMoveRangeKm;
                const showLabel =
                  mapZoom >= 1.35 ||
                  isSelected ||
                  city.isCapital;
                return (
                  <g
                    key={city.code + "-" + offset}
                    className={
                      "city-marker " +
                      (isSelected ? "selected " : "") +
                      (isReachableTarget ? "reachable-target " : "") +
                      (isUnreachableTarget ? "unreachable-target " : "")
                    }
                    transform={`translate(${x} ${y}) scale(${1 / mapZoom})`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (dragRef.current?.moved) return;
                      handleCityClick(city);
                    }}
                  >
                    {city.isCapital ? (
                      <>
                        <circle
                          r="7"
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
                        r="5.4"
                        className="city-node"
                        style={{
                          stroke: ownerColor(owner),
                        }}
                      />
                    )}
                    <text className="capacity-number">
                      {city.recruitCapacity}
                    </text>
                    {showLabel && (
                      <g className="city-label">
                        <text y="-11">{city.name}</text>
                        {mapZoom >= 1.65 && (
                          <text
                            y="-3"
                            className="city-economy"
                          >
                            {city.income} (+{city.growth})
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}

            {mode === "game" &&
              previewMoveSource &&
              activeMoveRangeRadius > 0 &&
              (() => {
                const [x, y] = project([
                  previewMoveSource.lon,
                  previewMoveSource.lat,
                ]);
                return (
                  <circle
                    cx={x + offset}
                    cy={y}
                    r={activeMoveRangeRadius}
                    className="movement-range-circle"
                  />
                );
              })()}

            {mode === "game" &&
              movementQueue.map((order) => {
                const from = CITIES.find(
                  (city) => city.code === order.fromCode
                );
                const to = CITIES.find(
                  (city) => city.code === order.toCode
                );
                if (!from || !to) return null;
                const [sx, sy] = project([
                  from.lon,
                  from.lat,
                ]);
                const [txRaw, ty] = project([
                  to.lon,
                  to.lat,
                ]);
                const tx = shortestWrappedTargetX(
                  sx,
                  txRaw
                );
                return (
                  <line
                    key={
                      order.id + "-route-" + offset
                    }
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
                );
              })}
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
                      {countryIncome(
                        selectedHomeland
                      ).toLocaleString("tr-TR")}
                    </b>
                  </div>
                  <div>
                    <span>Tur büyümesi</span>
                    <b>
                      +
                      {countryGrowth(
                        selectedHomeland
                      ).toLocaleString("tr-TR")}
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

  const ownedCityCount = CITIES.filter(
    (city) => cityOwners[city.code] === currentPlayer
  ).length;
  const countryHold =
    capitalHolds[selectedCountry];

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
        >
          TURU BİTİR
        </button>
      </header>

      <main className="game-map-stage">
        {renderWorldMap("game")}

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
            <span>Şehir kontrolü</span>
            <b>
              {selectedCountryOwnedCities.length}/
              {selectedCountryCities.length}
            </b>
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

        {cityPanelOpen && selectedCity && (
          <section className="city-window panel">
            <header>
              <div>
                <b>{selectedCity.name}</b>
                <span>
                  {selectedCity.isCapital
                    ? "★ Başkent"
                    : "Şehir"}{" "}
                  · Kapasite{" "}
                  {selectedCity.recruitCapacity}
                </span>
              </div>
              <button
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
                <div className="capacity-strip">
                  <span>Aktif üretim</span>
                  <b>
                    {
                      productionQueue.filter(
                        (order) =>
                          order.cityCode ===
                            selectedCity.code &&
                          order.readyTurn > turn
                      ).length
                    }
                    /{selectedCity.recruitCapacity}
                  </b>
                </div>

                {UNIT_DEFINITIONS.map((unit) => {
                  const effective = effectiveUnit(unit);
                  const cost =
                    productionCost(effective, 1);
                  const pending =
                    productionQueue
                      .filter(
                        (order) =>
                          order.cityCode ===
                            selectedCity.code &&
                          order.unitId === unit.id
                      )
                      .reduce(
                        (sum, order) =>
                          sum + order.quantity,
                        0
                      );
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
                      </div>
                      <div className="unit-pending">
                        {pending > 0 ? pending : ""}
                      </div>
                      <button
                        disabled={
                          selectedCityOwner !==
                          currentPlayer
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
                          currentPlayer
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
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="unit-scroll movement-list">
                <p>
                  Önce slider, +/− veya ALL ile birlik miktarını seç.
                  Miktar seçildiği anda yeşil menzil haritada görünür.
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
                  <span>Menzil</span>
                  <b>
                    {moveSelectionCount > 0
                      ? Math.round(activeMoveRangeKm).toLocaleString("tr-TR") + " km"
                      : "—"}
                  </b>
                </div>

                <button
                  className="primary-button target-button"
                  disabled={
                    selectedCityOwner !== currentPlayer ||
                    moveSelectionCount === 0
                  }
                  onClick={startMovement}
                >
                  {moveSelectionCount > 0
                    ? "HEDEF SEÇ"
                    : "ÖNCE BİRLİK SEÇ"}
                </button>
              </div>
            )}
          </section>
        )}

        <div className="notice-bar">{notice}</div>

        {moveSourceCode && (
          <div className="target-hint">
            <span>
              HEDEF ŞEHRİ SEÇ · {moveSelectionCount} birlik · menzil{" "}
              {Math.round(activeMoveRangeKm).toLocaleString("tr-TR")} km
            </span>
            <button
              onClick={() => {
                setMoveSourceCode(null);
                setMoveDraft({});
                setCityPanelOpen(true);
                setCityTab("movement");
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
