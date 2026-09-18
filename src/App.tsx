import { useMemo, useState } from "react";

type Screen = "lobby" | "game";

type Territory = {
  id: string;
  name: string;
  path: string;
  owner: string | null;
  troops: number;
  resource: string;
};

const playerColors: Record<string, string> = {
  Atlas: "#2f8cff",
  Dogan: "#ef5350",
  Nova: "#35c889",
  Neutral: "#475569",
};

const initialTerritories: Territory[] = [
  { id: "na", name: "Kuzey Amerika", path: "M78 122 L160 78 L245 88 L281 128 L237 181 L153 193 L94 162 Z", owner: "Atlas", troops: 18, resource: "Çelik" },
  { id: "sa", name: "Güney Amerika", path: "M220 212 L270 228 L285 292 L258 376 L220 342 L199 272 Z", owner: null, troops: 7, resource: "Gıda" },
  { id: "eu", name: "Avrupa", path: "M407 118 L469 102 L528 120 L516 158 L458 168 L414 150 Z", owner: "Atlas", troops: 14, resource: "Altın" },
  { id: "ru", name: "Avrasya", path: "M505 82 L650 62 L790 89 L835 135 L761 161 L639 145 L531 156 Z", owner: "Dogan", troops: 21, resource: "Petrol" },
  { id: "me", name: "Anadolu", path: "M500 163 L551 158 L580 178 L547 198 L500 192 L481 176 Z", owner: "Atlas", troops: 12, resource: "Çelik" },
  { id: "af", name: "Afrika", path: "M421 182 L512 188 L554 250 L514 334 L442 313 L398 240 Z", owner: null, troops: 9, resource: "Gıda" },
  { id: "asia", name: "Asya", path: "M575 160 L713 151 L826 176 L807 248 L710 259 L632 221 Z", owner: "Dogan", troops: 17, resource: "Petrol" },
  { id: "in", name: "Hindistan", path: "M620 229 L682 236 L700 282 L657 319 L623 278 Z", owner: null, troops: 8, resource: "Gıda" },
  { id: "au", name: "Avustralya", path: "M746 306 L824 295 L865 332 L839 371 L762 363 L728 334 Z", owner: null, troops: 6, resource: "Altın" },
  { id: "jp", name: "Pasifik Adaları", path: "M846 183 L874 199 L863 235 L838 221 Z", owner: "Nova", troops: 11, resource: "Teknoloji" },
];

const players = [
  { name: "Atlas", status: "Hazır", color: "#2f8cff" },
  { name: "Dogan", status: "Hazır", color: "#ef5350" },
  { name: "Nova", status: "Bekliyor", color: "#35c889" },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [commander, setCommander] = useState("Atlas");
  const [roomName, setRoomName] = useState("Global War");
  const [territories, setTerritories] = useState(initialTerritories);
  const [selectedId, setSelectedId] = useState("me");
  const [turn, setTurn] = useState(1);
  const [notice, setNotice] = useState("Komuta ağı çevrimiçi.");

  const selected = useMemo(
    () => territories.find((t) => t.id === selectedId) ?? territories[0],
    [territories, selectedId]
  );

  function claimSelected() {
    setTerritories((items) =>
      items.map((item) =>
        item.id === selected.id
          ? { ...item, owner: commander, troops: item.owner === commander ? item.troops + 1 : 5 }
          : item
      )
    );
    setNotice(`${selected.name} bölgesi ${commander} kontrolüne geçti.`);
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
            <span className="eyebrow">STRATEGY PROTOTYPE • V0.1</span>
            <h2>Dünyayı fethet. İttifak kur. Emirlerini aynı anda uygula.</h2>
            <p>
              Bu ilk tarayıcı prototipi; lobi, oyuncu listesi, savaş odası ve
              etkileşimli dünya haritası akışını test etmek için hazırlandı.
            </p>

            <div className="form-grid">
              <label>
                KOMUTAN ADI
                <input value={commander} onChange={(e) => setCommander(e.target.value)} />
              </label>
              <label>
                ODA ADI
                <input value={roomName} onChange={(e) => setRoomName(e.target.value)} />
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
                <button onClick={() => { setRoomName(name); setScreen("game"); }}>KATIL</button>
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
        <div className="mini-brand" onClick={() => setScreen("lobby")}>IRON ATLAS</div>
        <div><span>OYUN</span><strong>{roomName}</strong></div>
        <div><span>TUR</span><strong>{turn}</strong></div>
        <div><span>ALTIN</span><strong>1,250</strong></div>
        <div><span>ÇELİK</span><strong>840</strong></div>
        <div><span>PETROL</span><strong>620</strong></div>
        <button className="ghost" onClick={() => setScreen("lobby")}>LOBİ</button>
      </header>

      <main className="game-layout">
        <aside className="side card">
          <span className="eyebrow">PLAYERS 3/40</span>
          <h3>Komutanlar</h3>
          <div className="players">
            {players.map((player) => (
              <div className="player" key={player.name}>
                <i style={{ background: player.color }} />
                <span>{player.name}{player.name === commander ? " (Sen)" : ""}</span>
                <small>{player.status}</small>
              </div>
            ))}
          </div>

          <div className="divider" />
          <span className="eyebrow">FORCES</span>
          <div className="unit"><span>♟ Piyade</span><b>1,000</b></div>
          <div className="unit"><span>▰ Tank</span><b>50</b></div>
          <div className="unit"><span>✈ Uçak</span><b>20</b></div>
          <div className="unit"><span>◆ Donanma</span><b>10</b></div>
        </aside>

        <section className="map-card card">
          <div className="map-title">
            <div>
              <span className="eyebrow">GLOBAL THEATER</span>
              <h3>Dünya Operasyon Haritası</h3>
            </div>
            <span className="map-tip">Bir bölgeye tıkla</span>
          </div>

          <div className="map-wrap">
            <svg viewBox="0 0 930 440" className="world-map" role="img" aria-label="Iron Atlas dünya haritası">
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#183047" strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect width="930" height="440" fill="url(#grid)" />
              <text x="105" y="235" className="ocean">ATLANTIC</text>
              <text x="730" y="270" className="ocean">PACIFIC</text>
              <text x="420" y="390" className="ocean">SOUTHERN OCEAN</text>

              {territories.map((territory) => {
                const ownerKey = territory.owner ?? "Neutral";
                return (
                  <path
                    key={territory.id}
                    d={territory.path}
                    className={`territory ${selected.id === territory.id ? "selected" : ""}`}
                    fill={playerColors[ownerKey] ?? playerColors.Neutral}
                    onClick={() => setSelectedId(territory.id)}
                  >
                    <title>{territory.name}</title>
                  </path>
                );
              })}

              <circle cx="521" cy="178" r="5" className="capital" />
              <text x="530" y="175" className="city-label">Ankara</text>
            </svg>

            <div className="map-overlay">
              <span>SEÇİLİ BÖLGE</span>
              <strong>{selected.name}</strong>
              <small>{selected.owner ?? "Tarafsız"} • {selected.troops} birlik</small>
            </div>
          </div>
        </section>

        <aside className="side card intel">
          <span className="eyebrow">INTELLIGENCE</span>
          <h3>{selected.name}</h3>

          <div className="intel-row"><span>Sahip</span><b>{selected.owner ?? "Tarafsız"}</b></div>
          <div className="intel-row"><span>Birlik</span><b>{selected.troops}</b></div>
          <div className="intel-row"><span>Kaynak</span><b>{selected.resource}</b></div>
          <div className="intel-row"><span>Moral</span><b>%82</b></div>

          <button className="attack" onClick={claimSelected}>⚔ BÖLGEYİ ELE GEÇİR</button>
          <button className="secondary" onClick={() => setNotice(`${selected.name} için hareket emri oluşturuldu.`)}>
            → HAREKET EMRİ
          </button>

          <div className="notice">{notice}</div>

          <button className="end-turn" onClick={() => { setTurn((n) => n + 1); setNotice("Yeni tur başladı."); }}>
            TURU BİTİR
          </button>
        </aside>
      </main>
    </div>
  );
}
