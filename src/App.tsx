import { useEffect, useMemo, useState } from "react";
import { UNIT_DEFINITIONS, type UnitDefinition } from "./unitData";
import { UNIT_ICON_BY_ID } from "./unitIcons";

type Screen = "lobby" | "game";
type Position = [number, number];

type GeoGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: Position[][] | Position[][][];
};

type GeoFeature = {
  id?: string;
  properties?: { name?: string };
  geometry: GeoGeometry;
};

type GeoJson = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

type CountryState = {
  owner: string | null;
  troops: number;
  resource: string;
};

type Resources = {
  gold: number;
  steel: number;
  oil: number;
};

type ProductionOrder = {
  id: number;
  countryId: string;
  cityName: string;
  unitId: string;
  unitName: string;
  quantity: number;
  readyTurn: number;
};

type MovementOrder = {
  id: number;
  kind: "move" | "attack";
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  unitId: string;
  unitName: string;
  quantity: number;
  distanceKm: number;
};

type Garrison = Record<string, Record<string, number>>;

const MAP_URL =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

const PLAYER_COLORS: Record<string, string> = {
  Atlas: "#2687e8",
  Dogan: "#d84c4c",
  Nova: "#36b978",
  Neutral: "#34495e",
};

const INITIAL_COUNTRIES: Record<string, CountryState> = {
  TUR: { owner: "Atlas", troops: 18, resource: "Çelik" },
  DEU: { owner: "Atlas", troops: 12, resource: "Altın" },
  USA: { owner: "Atlas", troops: 22, resource: "Petrol" },
  RUS: { owner: "Dogan", troops: 25, resource: "Petrol" },
  CHN: { owner: "Dogan", troops: 20, resource: "Çelik" },
  FRA: { owner: "Nova", troops: 10, resource: "Altın" },
  JPN: { owner: "Nova", troops: 13, resource: "Teknoloji" },
};

const INITIAL_GARRISONS: Garrison = {
  TUR: { infantry: 1000, light_tank: 25, heavy_tank: 50, fighter: 20, attack_helicopter: 10, battleship: 2 },
  DEU: { infantry: 650, light_tank: 26, fighter: 8 },
  USA: { infantry: 2200, light_tank: 70, fighter: 34, attack_helicopter: 16, battleship: 6 },
  RUS: { infantry: 1800, heavy_tank: 72, fighter: 28, attack_helicopter: 18, battleship: 4 },
  CHN: { infantry: 2100, light_tank: 60, fighter: 26, attack_helicopter: 12, battleship: 3 },
  FRA: { infantry: 500, light_tank: 22, fighter: 12, battleship: 2 },
  JPN: { infantry: 700, light_tank: 18, fighter: 18, attack_helicopter: 6, battleship: 4 },
};

const players = [
  { name: "Atlas", status: "Hazır", color: "#2687e8" },
  { name: "Dogan", status: "Hazır", color: "#d84c4c" },
  { name: "Nova", status: "Bekliyor", color: "#36b978" },
];

const cityNodes = [
  { name: "Ankara", lon: 32.86, lat: 39.93, code: "TUR", dx: -5, dy: 13 },
  { name: "Berlin", lon: 13.4, lat: 52.52, code: "DEU", dx: 8, dy: 10 },
  { name: "Moskova", lon: 37.62, lat: 55.75, code: "RUS", dx: 10, dy: -2 },
  { name: "Paris", lon: 2.35, lat: 48.86, code: "FRA", dx: -34, dy: 11 },
  { name: "Washington", lon: -77.04, lat: 38.9, code: "USA", dx: 7, dy: 12 },
  { name: "Pekin", lon: 116.4, lat: 39.9, code: "CHN", dx: 8, dy: 12 },
  { name: "Tokyo", lon: 139.69, lat: 35.68, code: "JPN", dx: 10, dy: 12 },
];

const cityPrimaryUnits: Record<string, string> = {
  TUR: "heavy_tank",
  DEU: "infantry",
  RUS: "heavy_tank",
  FRA: "infantry",
  USA: "fighter",
  CHN: "light_tank",
  JPN: "fighter",
};

function project([lon, lat]: Position) {
  const x = ((lon + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return [x, y] as const;
}

function ringToPath(ring: Position[]) {
  return (
    ring
      .map((point, index) => {
        const [x, y] = project(point);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ") + " Z"
  );
}

function geometryToPath(geometry: GeoGeometry) {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as Position[][])
      .map((ring) => ringToPath(ring))
      .join(" ");
  }

  return (geometry.coordinates as Position[][][])
    .flatMap((polygon) => polygon.map((ring) => ringToPath(ring)))
    .join(" ");
}

function getProductionTurns(unit: UnitDefinition) {
  const base = Math.max(1, Math.ceil(unit.stats.cost / 150));
  return Math.min(5, base + (unit.domain === "naval" ? 1 : 0));
}

function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return Math.round(2 * earthRadius * Math.asin(Math.sqrt(hav)));
}

function movementRangeKm(unit: UnitDefinition) {
  if (unit.domain === "air") return unit.stats.movement * 750;
  if (unit.domain === "naval") return unit.stats.movement * 600;
  return unit.stats.movement * 450;
}

function getProductionCost(unit: UnitDefinition, quantity: number) {
  const gold = unit.stats.cost * quantity;
  const steelRate =
    unit.domain === "naval" ? 0.6 : unit.domain === "air" ? 0.3 : 0.35;

  const lowOilLandUnits = ["infantry", "militia", "marine", "special_forces"];
  const oilRate =
    unit.domain === "air"
      ? 0.55
      : unit.domain === "naval"
        ? 0.35
        : lowOilLandUnits.includes(unit.id)
          ? 0.05
          : 0.25;

  return {
    gold,
    steel: Math.ceil(unit.stats.cost * steelRate * quantity),
    oil: Math.ceil(unit.stats.cost * oilRate * quantity),
  };
}

function unitDefinition(unitId: string) {
  return UNIT_DEFINITIONS.find((unit) => unit.id === unitId);
}

function totalDefensePower(units: Record<string, number>) {
  return Object.entries(units).reduce((sum, [unitId, quantity]) => {
    const unit = unitDefinition(unitId);
    if (!unit || quantity <= 0) return sum;
    return sum + quantity * unit.stats.defense * (1 + unit.stats.hp * 0.03);
  }, 0);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [commander, setCommander] = useState("Atlas");
  const [roomName, setRoomName] = useState("Global War");
  const [turn, setTurn] = useState(1);
  const [notice, setNotice] = useState("Komuta ağı çevrimiçi.");
  const [selectedUnitId, setSelectedUnitId] = useState("infantry");
  const [productionQty, setProductionQty] = useState(1);
  const [movementQty, setMovementQty] = useState(1);
  const [moveSourceCode, setMoveSourceCode] = useState<string | null>(null);
  const [orderSequence, setOrderSequence] = useState(1);

  const [resources, setResources] = useState<Resources>({
    gold: 1250,
    steel: 840,
    oil: 620,
  });
  const [productionQueue, setProductionQueue] = useState<ProductionOrder[]>([]);
  const [movementQueue, setMovementQueue] = useState<MovementOrder[]>([]);
  const [garrisons, setGarrisons] = useState<Garrison>(INITIAL_GARRISONS);

  const [world, setWorld] = useState<GeoFeature[]>([]);
  const [mapError, setMapError] = useState("");
  const [selectedId, setSelectedId] = useState("TUR");
  const [countryState, setCountryState] =
    useState<Record<string, CountryState>>(INITIAL_COUNTRIES);

  useEffect(() => {
    fetch(MAP_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Harita verisi alınamadı");
        return response.json();
      })
      .then((data: GeoJson) => setWorld(data.features))
      .catch(() =>
        setMapError(
          "Dünya haritası yüklenemedi. Şirket ağı raw.githubusercontent.com erişimini engelliyor olabilir."
        )
      );
  }, []);

  const selectedFeature = useMemo(
    () => world.find((feature) => String(feature.id) === selectedId),
    [world, selectedId]
  );

  const selectedState =
    countryState[selectedId] ?? {
      owner: null,
      troops: 5,
      resource: "Gıda",
    };

  const selectedName =
    selectedFeature?.properties?.name ??
    (selectedId === "TUR" ? "Turkey" : selectedId);

  const selectedUnit =
    UNIT_DEFINITIONS.find((unit) => unit.id === selectedUnitId) ??
    UNIT_DEFINITIONS[0];

  const selectedCity = cityNodes.find((city) => city.code === selectedId);
  const currentPlayer = commander.trim() || "Atlas";
  const ownsSelectedCountry = selectedState.owner === currentPlayer;
  const productionTurns = getProductionTurns(selectedUnit);
  const productionCost = getProductionCost(selectedUnit, productionQty);
  const selectedGarrison = garrisons[selectedId] ?? {};
  const selectedUnitCount = selectedGarrison[selectedUnit.id] ?? 0;

  function queueProduction() {
    if (!selectedCity) {
      setNotice("Bu ülkede henüz üretim merkezi tanımlı değil.");
      return;
    }

    if (!ownsSelectedCountry) {
      setNotice("Yalnızca kontrol ettiğin ülkelerde üretim yapabilirsin.");
      return;
    }

    if (
      resources.gold < productionCost.gold ||
      resources.steel < productionCost.steel ||
      resources.oil < productionCost.oil
    ) {
      setNotice("Bu üretim için yeterli kaynağın yok.");
      return;
    }

    const readyTurn = turn + productionTurns;

    setResources((current) => ({
      gold: current.gold - productionCost.gold,
      steel: current.steel - productionCost.steel,
      oil: current.oil - productionCost.oil,
    }));

    setProductionQueue((current) => [
      ...current,
      {
        id: orderSequence,
        countryId: selectedId,
        cityName: selectedCity.name,
        unitId: selectedUnit.id,
        unitName: selectedUnit.name,
        quantity: productionQty,
        readyTurn,
      },
    ]);

    setOrderSequence((current) => current + 1);
    setNotice(
      `${selectedCity.name}: ${productionQty} × ${selectedUnit.name} üretime alındı. Tamamlanma: Tur ${readyTurn}.`
    );
  }

  function startMovementOrder() {
    if (!selectedCity) {
      setNotice("Hareket emri için haritadaki bir şehir merkezini seç.");
      return;
    }

    if (!ownsSelectedCountry) {
      setNotice("Yalnızca kendi kontrolündeki bir şehirden hareket emri verebilirsin.");
      return;
    }

    if (selectedUnit.domain === "naval") {
      setNotice("Deniz birimleri için liman sistemi bir sonraki aşamada aktif olacak.");
      return;
    }

    if (selectedUnitCount < movementQty) {
      setNotice(`Bu şehirde yalnızca ${selectedUnitCount} ${selectedUnit.name} var.`);
      return;
    }

    setMoveSourceCode(selectedCity.code);
    setNotice(
      `${selectedCity.name}: ${movementQty} × ${selectedUnit.name} seçildi. Şimdi haritadaki hedef şehre tıkla.`
    );
  }

  function handleCityClick(city: (typeof cityNodes)[number]) {
    if (!moveSourceCode) {
      setSelectedId(city.code);
      return;
    }

    const source = cityNodes.find((item) => item.code === moveSourceCode);
    if (!source) {
      setMoveSourceCode(null);
      return;
    }

    if (source.code === city.code) {
      setMoveSourceCode(null);
      setSelectedId(city.code);
      setNotice("Hareket emri iptal edildi.");
      return;
    }

    const targetState = countryState[city.code];
    const orderKind: "move" | "attack" =
      targetState?.owner === currentPlayer ? "move" : "attack";

    const km = distanceKm(source, city);
    const maxKm = movementRangeKm(selectedUnit);

    if (km > maxKm) {
      setNotice(
        `${selectedUnit.name} menzili yetersiz: ${km.toLocaleString("tr-TR")} km / maksimum ${maxKm.toLocaleString("tr-TR")} km.`
      );
      return;
    }

    const sourceCount = garrisons[source.code]?.[selectedUnit.id] ?? 0;
    const alreadyQueued = movementQueue
      .filter(
        (order) =>
          order.fromCode === source.code && order.unitId === selectedUnit.id
      )
      .reduce((sum, order) => sum + order.quantity, 0);

    if (sourceCount - alreadyQueued < movementQty) {
      setNotice("Aynı birliklerden daha fazlasını hareket kuyruğuna ekleyemezsin.");
      return;
    }

    setMovementQueue((current) => [
      ...current,
      {
        id: orderSequence,
        kind: orderKind,
        fromCode: source.code,
        fromCity: source.name,
        toCode: city.code,
        toCity: city.name,
        unitId: selectedUnit.id,
        unitName: selectedUnit.name,
        quantity: movementQty,
        distanceKm: km,
      },
    ]);

    setOrderSequence((current) => current + 1);
    setMoveSourceCode(null);
    setSelectedId(city.code);
    setNotice(
      orderKind === "attack"
        ? source.name + " → " + city.name + ": " + movementQty + " × " + selectedUnit.name + " SALDIRI emri kuyruğa eklendi."
        : source.name + " → " + city.name + ": " + movementQty + " × " + selectedUnit.name + " hareket emri kuyruğa eklendi."
    );
  }

  function advanceTurn() {
    const nextTurn = turn + 1;
    const completed = productionQueue.filter((order) => order.readyTurn <= nextTurn);
    const pending = productionQueue.filter((order) => order.readyTurn > nextTurn);

    const nextGarrisons: Garrison = {};
    Object.entries(garrisons).forEach(([code, units]) => {
      nextGarrisons[code] = { ...units };
    });

    const movedTexts: string[] = [];
    const combatTexts: string[] = [];
    const capturedCodes: string[] = [];

    movementQueue.forEach((order) => {
      const available = nextGarrisons[order.fromCode]?.[order.unitId] ?? 0;
      const committed = Math.min(available, order.quantity);
      if (committed <= 0) return;

      nextGarrisons[order.fromCode] = {
        ...(nextGarrisons[order.fromCode] ?? {}),
        [order.unitId]: available - committed,
      };

      if (order.kind === "move") {
        nextGarrisons[order.toCode] = {
          ...(nextGarrisons[order.toCode] ?? {}),
          [order.unitId]: (nextGarrisons[order.toCode]?.[order.unitId] ?? 0) + committed,
        };
        movedTexts.push(order.fromCity + " → " + order.toCity + ": " + committed + " " + order.unitName);
        return;
      }

      const attacker = unitDefinition(order.unitId);
      if (!attacker) return;

      const defenders = { ...(nextGarrisons[order.toCode] ?? {}) };
      const defensePower = totalDefensePower(defenders);
      const attackPower = committed * attacker.stats.attack * (1 + attacker.stats.critical * 0.04);

      if (defensePower <= 0) {
        nextGarrisons[order.toCode] = { [order.unitId]: committed };
        capturedCodes.push(order.toCode);
        combatTexts.push(order.toCity + " savunmasızdı; şehir ele geçirildi.");
        return;
      }

      const defenderLossFraction = Math.min(1, attackPower / Math.max(1, defensePower * 1.25));
      const attackerLossFraction = Math.min(1, defensePower / Math.max(1, attackPower * 1.4));

      const reducedDefenders: Record<string, number> = {};
      Object.entries(defenders).forEach(([unitId, quantity]) => {
        const remaining = Math.max(0, Math.round(quantity * (1 - defenderLossFraction)));
        if (remaining > 0) reducedDefenders[unitId] = remaining;
      });

      const attackerSurvivors = Math.max(0, Math.round(committed * (1 - attackerLossFraction)));
      const remainingDefenders = Object.values(reducedDefenders).reduce((sum, quantity) => sum + quantity, 0);

      if (remainingDefenders === 0 && attackerSurvivors > 0) {
        nextGarrisons[order.toCode] = { [order.unitId]: attackerSurvivors };
        capturedCodes.push(order.toCode);
        combatTexts.push(order.toCity + " ele geçirildi. " + attackerSurvivors + "/" + committed + " " + order.unitName + " hayatta kaldı.");
      } else {
        nextGarrisons[order.toCode] = reducedDefenders;
        combatTexts.push(order.toCity + " saldırısı püskürtüldü. Saldıran kayıp: " + (committed - attackerSurvivors) + ".");
      }
    });

    completed.forEach((order) => {
      nextGarrisons[order.countryId] = {
        ...(nextGarrisons[order.countryId] ?? {}),
        [order.unitId]: (nextGarrisons[order.countryId]?.[order.unitId] ?? 0) + order.quantity,
      };
    });

    setGarrisons(nextGarrisons);

    if (capturedCodes.length > 0) {
      setCountryState((current) => {
        const next = { ...current };
        capturedCodes.forEach((code) => {
          next[code] = {
            ...(next[code] ?? { troops: 5, resource: "Gıda" }),
            owner: currentPlayer,
          };
        });
        return next;
      });
    }

    const completedText = completed
      .map((order) => order.cityName + ": +" + order.quantity + " " + order.unitName)
      .join(" · ");

    const incomeGold = cityNodes.reduce((sum, city) => {
      return countryState[city.code]?.owner === currentPlayer ? sum + 80 : sum;
    }, 0);

    setResources((current) => ({
      gold: current.gold + incomeGold,
      steel: current.steel + Math.floor(incomeGold * 0.2),
      oil: current.oil + Math.floor(incomeGold * 0.15),
    }));

    const messages = [
      "Tur " + nextTurn + " başladı.",
      movedTexts.length ? "Hareket: " + movedTexts.join(" · ") : "",
      combatTexts.length ? "Savaş: " + combatTexts.join(" · ") : "",
      completedText ? "Üretim: " + completedText : "",
      "Şehir geliri: +" + incomeGold + " Altın",
    ].filter(Boolean);

    setNotice(messages.join(" | "));
    setProductionQueue(pending);
    setMovementQueue([]);
    setMoveSourceCode(null);
    setTurn(nextTurn);
  }

  if (screen === "lobby") {
    return (
      <div className="app">
        <header className="brandbar">
          <div>
            <span className="eyebrow">GLOBAL COMMAND NETWORK</span>
            <h1>IRON ATLAS</h1>
          </div>
          <div className="online-dot">● ONLINE</div>
        </header>

        <main className="lobby-shell">
          <section className="hero card">
            <span className="eyebrow">STRATEGY PROTOTYPE • V0.7</span>
            <h2>Dünyayı fethet. İttifak kur. Emirlerini aynı anda uygula.</h2>
            <p>
              Dünya haritası, atWar tarzı temel birim istatistikleri ve şehir
              bazlı üretim kuyruğu aynı prototipte çalışıyor.
            </p>

            <div className="form-grid">
              <label>
                KOMUTAN ADI
                <input
                  value={commander}
                  onChange={(e) => setCommander(e.target.value)}
                />
              </label>
              <label>
                ODA ADI
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </label>
            </div>

            <button className="primary" onClick={() => setScreen("game")}>
              YENİ OYUN OLUŞTUR
            </button>
          </section>

          <section className="card room-list">
            <div className="section-head">
              <div>
                <span className="eyebrow">LIVE OPERATIONS</span>
                <h3>Açık Oyunlar</h3>
              </div>
              <span className="badge">3 ODA</span>
            </div>

            {[
              ["Global War", "3 / 40", "LOBBY"],
              ["World Domination", "5 / 40", "LOBBY"],
              ["Europe 1939", "2 / 40", "LOBBY"],
            ].map(([name, count, status]) => (
              <div className="room" key={name}>
                <div>
                  <strong>{name}</strong>
                  <small>Dünya Haritası • Simultaneous Turns</small>
                </div>
                <span>{count}</span>
                <span className="status">{status}</span>
                <button
                  onClick={() => {
                    setRoomName(name);
                    setScreen("game");
                  }}
                >
                  KATIL
                </button>
              </div>
            ))}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app game">
      <header className="gamebar">
        <div className="mini-brand" onClick={() => setScreen("lobby")}>
          IRON ATLAS
        </div>
        <div>
          <span>OYUN</span>
          <strong>{roomName}</strong>
        </div>
        <div>
          <span>TUR</span>
          <strong>{turn}</strong>
        </div>
        <div>
          <span>ALTIN</span>
          <strong>{resources.gold.toLocaleString("tr-TR")}</strong>
        </div>
        <div>
          <span>ÇELİK</span>
          <strong>{resources.steel.toLocaleString("tr-TR")}</strong>
        </div>
        <div>
          <span>PETROL</span>
          <strong>{resources.oil.toLocaleString("tr-TR")}</strong>
        </div>
        <button className="ghost" onClick={() => setScreen("lobby")}>
          LOBİ
        </button>
      </header>

      <main className="game-layout">
        <aside className="side card">
          <span className="eyebrow">PLAYERS 3/40</span>
          <h3>Komutanlar</h3>

          <div className="players">
            {players.map((player) => (
              <div className="player" key={player.name}>
                <i style={{ background: player.color }} />
                <span>
                  {player.name}
                  {player.name === currentPlayer ? " (Sen)" : ""}
                </span>
                <small>{player.status}</small>
              </div>
            ))}
          </div>

          <div className="divider" />
          <span className="eyebrow">UNIT CATALOG</span>
          <div className="unit-catalog">
            {UNIT_DEFINITIONS.map((unit) => (
              <button
                key={unit.id}
                className={"unit-row " + (selectedUnitId === unit.id ? "active" : "")}
                onClick={() => setSelectedUnitId(unit.id)}
              >
                {UNIT_ICON_BY_ID[unit.id] ? (
                  <img
                    className="unit-catalog-icon"
                    src={UNIT_ICON_BY_ID[unit.id]}
                    alt={unit.name}
                  />
                ) : (
                  <span className="unit-domain">
                    {unit.domain === "land" ? "▰" : unit.domain === "air" ? "✈" : "◆"}
                  </span>
                )}
                <span>{unit.name}</span>
                <small>{unit.domain.toUpperCase()}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="map-card card">
          <div className="map-title">
            <div>
              <span className="eyebrow">GLOBAL THEATER</span>
              <h3>Gerçek Dünya Operasyon Haritası</h3>
            </div>
            <span className="map-tip">
              {moveSourceCode ? "HEDEF ŞEHİR SEÇ" : "Şehir seç → üretim / hareket"}
            </span>
          </div>

          <div className="map-wrap">
            {mapError ? (
              <div className="map-error">{mapError}</div>
            ) : world.length === 0 ? (
              <div className="map-loading">Dünya haritası yükleniyor...</div>
            ) : (
              <svg
                viewBox="0 0 1000 500"
                className="world-map"
                role="img"
                aria-label="Iron Atlas gerçek dünya haritası"
              >
                <defs>
                  <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                    <path
                      d="M 25 0 L 0 0 0 25"
                      fill="none"
                      stroke="#14324b"
                      strokeWidth="0.45"
                    />
                  </pattern>
                </defs>

                <rect width="1000" height="500" fill="url(#grid)" />

                {world.map((feature, index) => {
                  const id = String(feature.id ?? `country-${index}`);
                  const state =
                    countryState[id] ?? {
                      owner: null,
                      troops: 5,
                      resource: "Gıda",
                    };
                  const owner = state.owner ?? "Neutral";

                  return (
                    <path
                      key={id}
                      d={geometryToPath(feature.geometry)}
                      fill={PLAYER_COLORS[owner] ?? PLAYER_COLORS.Neutral}
                      className={"country " + (selectedId === id ? "selected" : "")}
                      onClick={() => {
                        setSelectedId(id);
                        setNotice(`${feature.properties?.name ?? id} seçildi.`);
                      }}
                    >
                      <title>
                        {feature.properties?.name ?? id} • {state.troops} birlik
                      </title>
                    </path>
                  );
                })}

                {movementQueue.map((order) => {
                  const from = cityNodes.find((city) => city.code === order.fromCode);
                  const to = cityNodes.find((city) => city.code === order.toCode);
                  if (!from || !to) return null;

                  const [x1, y1] = project([from.lon, from.lat]);
                  const [x2, y2] = project([to.lon, to.lat]);

                  return (
                    <g
                      className={
                        "movement-route " +
                        (order.kind === "attack" ? "attack-route" : "")
                      }
                      key={order.id}
                    >
                      <line x1={x1} y1={y1} x2={x2} y2={y2} />
                      <circle cx={x2} cy={y2} r="5" />
                    </g>
                  );
                })}

                {cityNodes.map((city) => {
                  const [x, y] = project([city.lon, city.lat]);
                  const primaryUnitId = cityPrimaryUnits[city.code];
                  const icon = primaryUnitId ? UNIT_ICON_BY_ID[primaryUnitId] : undefined;
                  const count = primaryUnitId
                    ? garrisons[city.code]?.[primaryUnitId] ?? 0
                    : 0;

                  return (
                    <g
                      className="city"
                      key={city.name}
                      onClick={() => handleCityClick(city)}
                    >
                      <circle cx={x} cy={y} r="3.7" />
                      <text x={x + 6} y={y - 5}>
                        {city.name}
                      </text>

                      {icon && (
                        <g className="map-unit-marker">
                          <rect
                            x={x + city.dx}
                            y={y + city.dy}
                            width="36"
                            height="24"
                            rx="5"
                          />
                          <image
                            href={icon}
                            x={x + city.dx + 2}
                            y={y + city.dy + 2}
                            width="18"
                            height="18"
                            preserveAspectRatio="xMidYMid meet"
                          />
                          <text x={x + city.dx + 27} y={y + city.dy + 16}>
                            {count}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            <div className="map-overlay">
              <span>SEÇİLİ ÜLKE</span>
              <strong>{selectedName}</strong>
              <small>
                {selectedState.owner ?? "Tarafsız"} • {selectedState.troops} birlik
              </small>
              {selectedCity && (
                <small className="city-center">Üretim merkezi: {selectedCity.name}</small>
              )}
            </div>
          </div>
        </section>

        <aside className="side card intel">
          <span className="eyebrow">INTELLIGENCE</span>
          <h3>{selectedName}</h3>

          <div className="intel-row">
            <span>Sahip</span>
            <b>{selectedState.owner ?? "Tarafsız"}</b>
          </div>
          <div className="intel-row">
            <span>Birlik</span>
            <b>{selectedState.troops}</b>
          </div>
          <div className="intel-row">
            <span>Kaynak</span>
            <b>{selectedState.resource}</b>
          </div>
          <div className="intel-row">
            <span>Moral</span>
            <b>%82</b>
          </div>

          <div className="unit-detail">
            <span className="eyebrow">SELECTED UNIT</span>
            {UNIT_ICON_BY_ID[selectedUnit.id] && (
              <div className="selected-unit-art">
                <img src={UNIT_ICON_BY_ID[selectedUnit.id]} alt={selectedUnit.name} />
              </div>
            )}
            <h4>{selectedUnit.name}</h4>

            <div className="unit-stat-grid atwar-grid">
              <div><span>Saldırı</span><b>{selectedUnit.stats.attack}</b></div>
              <div><span>Defans</span><b>{selectedUnit.stats.defense}</b></div>
              <div><span>Kritik</span><b>{selectedUnit.stats.critical}</b></div>
              <div><span>HP</span><b>{selectedUnit.stats.hp}</b></div>
              <div><span>Hareket</span><b>{selectedUnit.stats.movement}</b></div>
              <div><span>Görüş</span><b>{selectedUnit.stats.view}</b></div>
              <div><span>Kapasite</span><b>{selectedUnit.stats.capacity || "—"}</b></div>
              <div><span>Maliyet</span><b>{selectedUnit.stats.cost}</b></div>
              <div><span>Collateral</span><b>{selectedUnit.stats.collateral}</b></div>
            </div>

            <p>{selectedUnit.special}</p>

            {selectedUnit.defenceBonuses.length > 0 && (
              <div className="bonus-box">
                <span className="eyebrow">DEFENCE BONUS</span>
                {selectedUnit.defenceBonuses.map((bonus) => (
                  <div key={bonus.against}>
                    <span>{bonus.against}</span>
                    <b>{bonus.value > 0 ? "+" : ""}{bonus.value}</b>
                  </div>
                ))}
              </div>
            )}

            {selectedUnit.estimated && (
              <small className="estimated-note">
                Bu birimin temel değerleri Iron Atlas dengesi için tahmini olarak ayarlanmıştır.
              </small>
            )}
          </div>

          <div className="production-panel">
            <div className="production-head">
              <div>
                <span className="eyebrow">PRODUCTION</span>
                <h4>{selectedCity?.name ?? "Üretim Merkezi Yok"}</h4>
              </div>
              <span className={"ownership-pill " + (ownsSelectedCountry ? "owned" : "")}>
                {ownsSelectedCountry ? "SENİN" : "KİLİTLİ"}
              </span>
            </div>

            <div className="garrison-count">
              <span>Mevcut {selectedUnit.name}</span>
              <b>{selectedUnitCount.toLocaleString("tr-TR")}</b>
            </div>

            <div className="qty-row">
              {[1, 5, 10].map((qty) => (
                <button
                  key={qty}
                  className={productionQty === qty ? "active" : ""}
                  onClick={() => setProductionQty(qty)}
                >
                  ×{qty}
                </button>
              ))}
            </div>

            <div className="production-cost-grid">
              <div><span>Altın</span><b>{productionCost.gold}</b></div>
              <div><span>Çelik</span><b>{productionCost.steel}</b></div>
              <div><span>Petrol</span><b>{productionCost.oil}</b></div>
              <div><span>Süre</span><b>{productionTurns} tur</b></div>
            </div>

            <button
              className="produce-button"
              disabled={!selectedCity || !ownsSelectedCountry}
              onClick={queueProduction}
            >
              + ÜRETİME AL
            </button>

            <div className="queue-box">
              <span className="eyebrow">ÜRETİM KUYRUĞU</span>
              {productionQueue.length === 0 ? (
                <small>Kuyruk boş.</small>
              ) : (
                productionQueue.map((order) => (
                  <div className="queue-order" key={order.id}>
                    <div>
                      <strong>
                        {order.kind === "attack" ? "SALDIRI · " : ""}
                        {order.quantity} × {order.unitName}
                      </strong>
                      <small>{order.cityName}</small>
                    </div>
                    <b>Tur {order.readyTurn}</b>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="movement-panel">
            <div className="movement-head">
              <div>
                <span className="eyebrow">MOVEMENT ORDERS</span>
                <h4>{moveSourceCode ? "Hedef Şehir Seç" : "Birlik Taşı"}</h4>
              </div>
              {moveSourceCode && (
                <button
                  className="cancel-move"
                  onClick={() => {
                    setMoveSourceCode(null);
                    setNotice("Hareket emri iptal edildi.");
                  }}
                >
                  İPTAL
                </button>
              )}
            </div>

            <div className="garrison-count">
              <span>{selectedCity?.name ?? "Şehir seç"} · {selectedUnit.name}</span>
              <b>{selectedUnitCount.toLocaleString("tr-TR")}</b>
            </div>

            <div className="qty-row movement-qty">
              {[1, 5, 10, 25, 100].map((qty) => (
                <button
                  key={qty}
                  className={movementQty === qty ? "active" : ""}
                  onClick={() => setMovementQty(qty)}
                >
                  ×{qty}
                </button>
              ))}
            </div>

            <div className="movement-range">
              <span>Maks. hareket menzili</span>
              <b>{movementRangeKm(selectedUnit).toLocaleString("tr-TR")} km</b>
            </div>

            <button
              className="move-order-button"
              disabled={
                !selectedCity ||
                !ownsSelectedCountry ||
                selectedUnitCount < movementQty ||
                selectedUnit.domain === "naval"
              }
              onClick={startMovementOrder}
            >
              {moveSourceCode ? "HARİTADAN HEDEF SEÇ" : "→ HAREKET EMRİ VER"}
            </button>

            <div className="queue-box movement-queue-box">
              <span className="eyebrow">BEKLEYEN EMİRLER</span>
              {movementQueue.length === 0 ? (
                <small>Hareket emri yok.</small>
              ) : (
                movementQueue.map((order) => (
                  <div className="queue-order" key={order.id}>
                    <div>
                      <strong>{order.kind === "attack" ? "SALDIRI · " : "HAREKET · "}{order.quantity} × {order.unitName}</strong>
                      <small>{order.fromCity} → {order.toCity}</small>
                    </div>
                    <b>{order.distanceKm.toLocaleString("tr-TR")} km</b>
                  </div>
                ))
              )}
            </div>
          </div>


          <div className="notice">{notice}</div>

          <button className="end-turn" onClick={advanceTurn}>
            TURU BİTİR
          </button>
        </aside>
      </main>
    </div>
  );
}
