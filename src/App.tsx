import { useEffect, useMemo, useState } from "react";
import { UNIT_DEFINITIONS } from "./unitData";
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

const players = [
  { name: "Atlas", status: "Hazır", color: "#2687e8" },
  { name: "Dogan", status: "Hazır", color: "#d84c4c" },
  { name: "Nova", status: "Bekliyor", color: "#36b978" },
];

const cityNodes = [
  { name: "Ankara", lon: 32.86, lat: 39.93, code: "TUR" },
  { name: "Berlin", lon: 13.4, lat: 52.52, code: "DEU" },
  { name: "Moskova", lon: 37.62, lat: 55.75, code: "RUS" },
  { name: "Paris", lon: 2.35, lat: 48.86, code: "FRA" },
  { name: "Washington", lon: -77.04, lat: 38.9, code: "USA" },
  { name: "Pekin", lon: 116.4, lat: 39.9, code: "CHN" },
  { name: "Tokyo", lon: 139.69, lat: 35.68, code: "JPN" },
];

const cityPrimaryUnits: Record<string, { unitId: string; count: number }> = {
  TUR: { unitId: "heavy_tank", count: 50 },
  DEU: { unitId: "infantry", count: 650 },
  RUS: { unitId: "heavy_tank", count: 72 },
  FRA: { unitId: "infantry", count: 500 },
  USA: { unitId: "fighter", count: 34 },
  CHN: { unitId: "light_tank", count: 60 },
  JPN: { unitId: "fighter", count: 18 },
};

function project([lon, lat]: Position) {
  const x = ((lon + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return [x, y] as const;
}

function ringToPath(ring: Position[]) {
  return ring
    .map((point, index) => {
      const [x, y] = project(point);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ") + " Z";
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

export default function App() {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [commander, setCommander] = useState("Atlas");
  const [roomName, setRoomName] = useState("Global War");
  const [turn, setTurn] = useState(1);
  const [notice, setNotice] = useState("Komuta ağı çevrimiçi.");
  const [selectedUnitId, setSelectedUnitId] = useState("infantry");

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

  function claimSelected() {
    setCountryState((current) => ({
      ...current,
      [selectedId]: {
        ...selectedState,
        owner: commander || "Atlas",
        troops:
          selectedState.owner === commander
            ? selectedState.troops + 1
            : 5,
      },
    }));

    setNotice(
      `${selectedName} bölgesi ${commander || "Atlas"} kontrolüne geçti.`
    );
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
            <span className="eyebrow">STRATEGY PROTOTYPE • V0.3</span>
            <h2>Dünyayı fethet. İttifak kur. Emirlerini aynı anda uygula.</h2>
            <p>
              Gerçek dünya haritasına ek olarak kara, hava ve deniz birlikleri
              için ilk dengeleme verisi ve birim kataloğu da eklendi.
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
          <strong>1,250</strong>
        </div>
        <div>
          <span>ÇELİK</span>
          <strong>840</strong>
        </div>
        <div>
          <span>PETROL</span>
          <strong>620</strong>
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
                  {player.name === commander ? " (Sen)" : ""}
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
            <span className="map-tip">Bir ülkeye tıkla</span>
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
                  <pattern
                    id="grid"
                    width="25"
                    height="25"
                    patternUnits="userSpaceOnUse"
                  >
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
                      className={
                        "country " + (selectedId === id ? "selected" : "")
                      }
                      onClick={() => {
                        setSelectedId(id);
                        setNotice(
                          `${feature.properties?.name ?? id} seçildi.`
                        );
                      }}
                    >
                      <title>
                        {feature.properties?.name ?? id} • {state.troops} birlik
                      </title>
                    </path>
                  );
                })}

                {cityNodes.map((city) => {
                  const [x, y] = project([city.lon, city.lat]);
                  const primary = cityPrimaryUnits[city.code];
                  const icon = primary ? UNIT_ICON_BY_ID[primary.unitId] : undefined;

                  return (
                    <g
                      className="city"
                      key={city.name}
                      onClick={() => setSelectedId(city.code)}
                    >
                      <circle cx={x} cy={y} r="3.7" />
                      <text x={x + 6} y={y - 5}>
                        {city.name}
                      </text>

                      {icon && primary && (
                        <g className="map-unit-marker">
                          <rect x={x - 16} y={y + 7} width="42" height="28" rx="5" />
                          <image
                            href={icon}
                            x={x - 13}
                            y={y + 9}
                            width="22"
                            height="22"
                            preserveAspectRatio="xMidYMid meet"
                          />
                          <text x={x + 13} y={y + 25}>
                            {primary.count}
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
                <img
                  src={UNIT_ICON_BY_ID[selectedUnit.id]}
                  alt={selectedUnit.name}
                />
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

          <button className="attack" onClick={claimSelected}>
            ⚔ BÖLGEYİ ELE GEÇİR
          </button>

          <button
            className="secondary"
            onClick={() =>
              setNotice(
                `${selectedName} için hareket emri oluşturuldu.`
              )
            }
          >
            → HAREKET EMRİ
          </button>

          <div className="notice">{notice}</div>

          <button
            className="end-turn"
            onClick={() => {
              setTurn((current) => current + 1);
              setNotice("Yeni tur başladı.");
            }}
          >
            TURU BİTİR
          </button>
        </aside>
      </main>
    </div>
  );
}
