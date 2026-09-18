// BUILD: city-control-v1.4-verified
import { useEffect, useMemo, useRef, useState } from "react";
import { UNIT_DEFINITIONS, type UnitDefinition } from "./unitData";
import { UNIT_ICON_BY_ID } from "./unitIcons";

type Screen = "lobby" | "homeland" | "game";
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
  player: string;
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

type CapitalHoldState = Record<
  string,
  { holder: string | null; turns: number }
>;

type CityNode = {
  code: string;
  countryCode: string;
  name: string;
  lon: number;
  lat: number;
  isCapital: boolean;
  recruitCapacity: number;
  income: number;
  growth: number;
  dx: number;
  dy: number;
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

const INITIAL_GARRISONS: Garrison = {
  "TUR-ANK": { infantry: 1000, light_tank: 25, heavy_tank: 50, fighter: 20, attack_helicopter: 10, battleship: 2 },
  "DEU-BER": { infantry: 650, light_tank: 26, fighter: 8 },
  "USA-WAS": { infantry: 2200, light_tank: 70, fighter: 34, attack_helicopter: 16, battleship: 6 },
  "RUS-MOW": { infantry: 1800, heavy_tank: 72, fighter: 28, attack_helicopter: 18, battleship: 4 },
  "CHN-BJS": { infantry: 2100, light_tank: 60, fighter: 26, attack_helicopter: 12, battleship: 3 },
  "FRA-PAR": { infantry: 500, light_tank: 22, fighter: 12, battleship: 2 },
  "JPN-TYO": { infantry: 700, light_tank: 18, fighter: 18, attack_helicopter: 6, battleship: 4 },
};

const players = [
  { name: "Atlas", status: "Hazır", color: "#2687e8" },
  { name: "Dogan", status: "Hazır", color: "#d84c4c" },
  { name: "Nova", status: "Bekliyor", color: "#36b978" },
];

const cityNodes: CityNode[] = [
  // Türkiye — 1 başkent + 5 asker basma şehri
  { code: "TUR-ANK", countryCode: "TUR", name: "Ankara", lon: 32.86, lat: 39.93, isCapital: true, recruitCapacity: 3, income: 920, growth: 72, dx: 8, dy: 12 },
  { code: "TUR-IST", countryCode: "TUR", name: "İstanbul", lon: 28.98, lat: 41.01, isCapital: false, recruitCapacity: 2, income: 810, growth: 64, dx: -32, dy: -18 },
  { code: "TUR-IZM", countryCode: "TUR", name: "İzmir", lon: 27.14, lat: 38.42, isCapital: false, recruitCapacity: 2, income: 580, growth: 42, dx: -31, dy: 12 },
  { code: "TUR-KAY", countryCode: "TUR", name: "Kayseri", lon: 35.49, lat: 38.72, isCapital: false, recruitCapacity: 1, income: 360, growth: 28, dx: 8, dy: 13 },
  { code: "TUR-GAZ", countryCode: "TUR", name: "Gaziantep", lon: 37.38, lat: 37.07, isCapital: false, recruitCapacity: 1, income: 390, growth: 31, dx: 8, dy: 14 },
  { code: "TUR-SAM", countryCode: "TUR", name: "Samsun", lon: 36.33, lat: 41.29, isCapital: false, recruitCapacity: 1, income: 330, growth: 25, dx: 8, dy: -18 },

  // Almanya — kullanıcının referansındaki mantık: 1 başkent + 5 şehir = 6 asker basma noktası
  { code: "DEU-BER", countryCode: "DEU", name: "Berlin", lon: 13.40, lat: 52.52, isCapital: true, recruitCapacity: 3, income: 980, growth: 78, dx: 8, dy: -20 },
  { code: "DEU-HAM", countryCode: "DEU", name: "Hamburg", lon: 9.99, lat: 53.55, isCapital: false, recruitCapacity: 2, income: 650, growth: 49, dx: -34, dy: -18 },
  { code: "DEU-MUC", countryCode: "DEU", name: "Münih", lon: 11.58, lat: 48.14, isCapital: false, recruitCapacity: 2, income: 710, growth: 53, dx: 8, dy: 12 },
  { code: "DEU-FRA", countryCode: "DEU", name: "Frankfurt", lon: 8.68, lat: 50.11, isCapital: false, recruitCapacity: 2, income: 680, growth: 51, dx: -38, dy: 10 },
  { code: "DEU-CGN", countryCode: "DEU", name: "Köln", lon: 6.96, lat: 50.94, isCapital: false, recruitCapacity: 2, income: 590, growth: 44, dx: -35, dy: -17 },
  { code: "DEU-LEJ", countryCode: "DEU", name: "Leipzig", lon: 12.37, lat: 51.34, isCapital: false, recruitCapacity: 1, income: 430, growth: 32, dx: 8, dy: 12 },

  // Fransa
  { code: "FRA-PAR", countryCode: "FRA", name: "Paris", lon: 2.35, lat: 48.86, isCapital: true, recruitCapacity: 3, income: 970, growth: 74, dx: -34, dy: -18 },
  { code: "FRA-LYO", countryCode: "FRA", name: "Lyon", lon: 4.84, lat: 45.76, isCapital: false, recruitCapacity: 2, income: 570, growth: 43, dx: 8, dy: 12 },
  { code: "FRA-MRS", countryCode: "FRA", name: "Marsilya", lon: 5.37, lat: 43.30, isCapital: false, recruitCapacity: 2, income: 540, growth: 39, dx: 8, dy: 12 },
  { code: "FRA-BOD", countryCode: "FRA", name: "Bordeaux", lon: -0.58, lat: 44.84, isCapital: false, recruitCapacity: 1, income: 420, growth: 30, dx: -38, dy: 12 },
  { code: "FRA-LIL", countryCode: "FRA", name: "Lille", lon: 3.06, lat: 50.63, isCapital: false, recruitCapacity: 1, income: 410, growth: 29, dx: -32, dy: -16 },

  // Birleşik Krallık
  { code: "GBR-LON", countryCode: "GBR", name: "Londra", lon: -0.13, lat: 51.51, isCapital: true, recruitCapacity: 3, income: 1040, growth: 82, dx: 8, dy: 12 },
  { code: "GBR-MAN", countryCode: "GBR", name: "Manchester", lon: -2.24, lat: 53.48, isCapital: false, recruitCapacity: 2, income: 580, growth: 43, dx: -40, dy: -17 },
  { code: "GBR-BHM", countryCode: "GBR", name: "Birmingham", lon: -1.89, lat: 52.49, isCapital: false, recruitCapacity: 2, income: 560, growth: 41, dx: 8, dy: 11 },
  { code: "GBR-GLA", countryCode: "GBR", name: "Glasgow", lon: -4.25, lat: 55.86, isCapital: false, recruitCapacity: 1, income: 410, growth: 28, dx: -34, dy: -17 },
  { code: "GBR-BFS", countryCode: "GBR", name: "Belfast", lon: -5.93, lat: 54.60, isCapital: false, recruitCapacity: 1, income: 360, growth: 24, dx: -38, dy: 12 },

  // İtalya
  { code: "ITA-ROM", countryCode: "ITA", name: "Roma", lon: 12.50, lat: 41.90, isCapital: true, recruitCapacity: 3, income: 860, growth: 65, dx: 8, dy: 12 },
  { code: "ITA-MIL", countryCode: "ITA", name: "Milano", lon: 9.19, lat: 45.46, isCapital: false, recruitCapacity: 2, income: 720, growth: 54, dx: -35, dy: -17 },
  { code: "ITA-NAP", countryCode: "ITA", name: "Napoli", lon: 14.27, lat: 40.85, isCapital: false, recruitCapacity: 2, income: 510, growth: 37, dx: 8, dy: 12 },
  { code: "ITA-TRN", countryCode: "ITA", name: "Torino", lon: 7.69, lat: 45.07, isCapital: false, recruitCapacity: 1, income: 430, growth: 30, dx: -35, dy: 11 },
  { code: "ITA-VCE", countryCode: "ITA", name: "Venedik", lon: 12.32, lat: 45.44, isCapital: false, recruitCapacity: 1, income: 390, growth: 27, dx: 8, dy: -17 },

  // İspanya
  { code: "ESP-MAD", countryCode: "ESP", name: "Madrid", lon: -3.70, lat: 40.42, isCapital: true, recruitCapacity: 3, income: 820, growth: 62, dx: 8, dy: 12 },
  { code: "ESP-BCN", countryCode: "ESP", name: "Barcelona", lon: 2.17, lat: 41.39, isCapital: false, recruitCapacity: 2, income: 670, growth: 50, dx: 8, dy: -17 },
  { code: "ESP-SEV", countryCode: "ESP", name: "Sevilla", lon: -5.99, lat: 37.39, isCapital: false, recruitCapacity: 1, income: 420, growth: 30, dx: -35, dy: 12 },
  { code: "ESP-VLC", countryCode: "ESP", name: "Valencia", lon: -0.38, lat: 39.47, isCapital: false, recruitCapacity: 1, income: 440, growth: 31, dx: 8, dy: 12 },
  { code: "ESP-BIO", countryCode: "ESP", name: "Bilbao", lon: -2.93, lat: 43.26, isCapital: false, recruitCapacity: 1, income: 370, growth: 25, dx: -33, dy: -17 },

  // Polonya
  { code: "POL-WAW", countryCode: "POL", name: "Varşova", lon: 21.01, lat: 52.23, isCapital: true, recruitCapacity: 3, income: 720, growth: 52, dx: 8, dy: -18 },
  { code: "POL-KRK", countryCode: "POL", name: "Krakov", lon: 19.94, lat: 50.06, isCapital: false, recruitCapacity: 2, income: 450, growth: 31, dx: 8, dy: 12 },
  { code: "POL-GDN", countryCode: "POL", name: "Gdansk", lon: 18.65, lat: 54.35, isCapital: false, recruitCapacity: 1, income: 350, growth: 23, dx: -35, dy: -17 },
  { code: "POL-WRO", countryCode: "POL", name: "Wroclaw", lon: 17.04, lat: 51.11, isCapital: false, recruitCapacity: 1, income: 380, growth: 26, dx: -38, dy: 12 },

  // ABD
  { code: "USA-WAS", countryCode: "USA", name: "Washington", lon: -77.04, lat: 38.90, isCapital: true, recruitCapacity: 3, income: 1030, growth: 81, dx: 8, dy: 12 },
  { code: "USA-NYC", countryCode: "USA", name: "New York", lon: -74.01, lat: 40.71, isCapital: false, recruitCapacity: 2, income: 940, growth: 72, dx: 8, dy: -18 },
  { code: "USA-CHI", countryCode: "USA", name: "Chicago", lon: -87.63, lat: 41.88, isCapital: false, recruitCapacity: 2, income: 760, growth: 55, dx: 8, dy: 12 },
  { code: "USA-DAL", countryCode: "USA", name: "Dallas", lon: -96.80, lat: 32.78, isCapital: false, recruitCapacity: 2, income: 690, growth: 49, dx: 8, dy: 12 },
  { code: "USA-LAX", countryCode: "USA", name: "Los Angeles", lon: -118.24, lat: 34.05, isCapital: false, recruitCapacity: 2, income: 850, growth: 63, dx: -42, dy: 12 },
  { code: "USA-SEA", countryCode: "USA", name: "Seattle", lon: -122.33, lat: 47.61, isCapital: false, recruitCapacity: 1, income: 520, growth: 36, dx: -35, dy: -17 },
  { code: "USA-MIA", countryCode: "USA", name: "Miami", lon: -80.19, lat: 25.76, isCapital: false, recruitCapacity: 1, income: 500, growth: 34, dx: 8, dy: 12 },
  { code: "USA-DEN", countryCode: "USA", name: "Denver", lon: -104.99, lat: 39.74, isCapital: false, recruitCapacity: 1, income: 470, growth: 32, dx: 8, dy: 12 },

  // Rusya
  { code: "RUS-MOW", countryCode: "RUS", name: "Moskova", lon: 37.62, lat: 55.75, isCapital: true, recruitCapacity: 3, income: 1120, growth: 88, dx: 8, dy: -18 },
  { code: "RUS-LED", countryCode: "RUS", name: "St. Petersburg", lon: 30.34, lat: 59.93, isCapital: false, recruitCapacity: 2, income: 710, growth: 49, dx: -42, dy: -17 },
  { code: "RUS-ROV", countryCode: "RUS", name: "Rostov", lon: 39.70, lat: 47.24, isCapital: false, recruitCapacity: 2, income: 510, growth: 34, dx: 8, dy: 12 },
  { code: "RUS-SVX", countryCode: "RUS", name: "Yekaterinburg", lon: 60.60, lat: 56.84, isCapital: false, recruitCapacity: 2, income: 560, growth: 38, dx: 8, dy: 12 },
  { code: "RUS-OVB", countryCode: "RUS", name: "Novosibirsk", lon: 82.92, lat: 55.03, isCapital: false, recruitCapacity: 2, income: 520, growth: 35, dx: 8, dy: 12 },
  { code: "RUS-IKT", countryCode: "RUS", name: "Irkutsk", lon: 104.28, lat: 52.29, isCapital: false, recruitCapacity: 1, income: 350, growth: 22, dx: 8, dy: 12 },
  { code: "RUS-VVO", countryCode: "RUS", name: "Vladivostok", lon: 131.89, lat: 43.12, isCapital: false, recruitCapacity: 2, income: 480, growth: 31, dx: 8, dy: 12 },
  { code: "RUS-KZN", countryCode: "RUS", name: "Kazan", lon: 49.12, lat: 55.79, isCapital: false, recruitCapacity: 1, income: 410, growth: 27, dx: 8, dy: -17 },

  // Çin
  { code: "CHN-BJS", countryCode: "CHN", name: "Pekin", lon: 116.40, lat: 39.90, isCapital: true, recruitCapacity: 3, income: 1050, growth: 82, dx: 8, dy: -18 },
  { code: "CHN-SHA", countryCode: "CHN", name: "Şanghay", lon: 121.47, lat: 31.23, isCapital: false, recruitCapacity: 2, income: 920, growth: 70, dx: 8, dy: 12 },
  { code: "CHN-CAN", countryCode: "CHN", name: "Guangzhou", lon: 113.26, lat: 23.13, isCapital: false, recruitCapacity: 2, income: 760, growth: 56, dx: 8, dy: 12 },
  { code: "CHN-CTU", countryCode: "CHN", name: "Chengdu", lon: 104.07, lat: 30.57, isCapital: false, recruitCapacity: 2, income: 620, growth: 44, dx: -38, dy: 12 },
  { code: "CHN-WUH", countryCode: "CHN", name: "Wuhan", lon: 114.31, lat: 30.59, isCapital: false, recruitCapacity: 1, income: 540, growth: 38, dx: 8, dy: -18 },
  { code: "CHN-XIY", countryCode: "CHN", name: "Xi'an", lon: 108.94, lat: 34.34, isCapital: false, recruitCapacity: 1, income: 480, growth: 32, dx: -33, dy: -17 },
  { code: "CHN-SHE", countryCode: "CHN", name: "Shenyang", lon: 123.43, lat: 41.80, isCapital: false, recruitCapacity: 1, income: 460, growth: 30, dx: 8, dy: 12 },

  // Japonya
  { code: "JPN-TYO", countryCode: "JPN", name: "Tokyo", lon: 139.69, lat: 35.68, isCapital: true, recruitCapacity: 3, income: 980, growth: 77, dx: 8, dy: -18 },
  { code: "JPN-OSA", countryCode: "JPN", name: "Osaka", lon: 135.50, lat: 34.69, isCapital: false, recruitCapacity: 2, income: 680, growth: 49, dx: -34, dy: 12 },
  { code: "JPN-SPK", countryCode: "JPN", name: "Sapporo", lon: 141.35, lat: 43.06, isCapital: false, recruitCapacity: 1, income: 410, growth: 27, dx: 8, dy: -18 },
  { code: "JPN-FUK", countryCode: "JPN", name: "Fukuoka", lon: 130.40, lat: 33.59, isCapital: false, recruitCapacity: 1, income: 390, growth: 25, dx: -38, dy: 12 },

  // Hindistan
  { code: "IND-DEL", countryCode: "IND", name: "Delhi", lon: 77.10, lat: 28.70, isCapital: true, recruitCapacity: 3, income: 900, growth: 72, dx: 8, dy: -18 },
  { code: "IND-BOM", countryCode: "IND", name: "Mumbai", lon: 72.88, lat: 19.08, isCapital: false, recruitCapacity: 2, income: 760, growth: 57, dx: -36, dy: 12 },
  { code: "IND-CCU", countryCode: "IND", name: "Kolkata", lon: 88.36, lat: 22.57, isCapital: false, recruitCapacity: 2, income: 640, growth: 47, dx: 8, dy: 12 },
  { code: "IND-MAA", countryCode: "IND", name: "Chennai", lon: 80.27, lat: 13.08, isCapital: false, recruitCapacity: 2, income: 600, growth: 43, dx: 8, dy: 12 },
  { code: "IND-HYD", countryCode: "IND", name: "Hyderabad", lon: 78.49, lat: 17.39, isCapital: false, recruitCapacity: 1, income: 520, growth: 36, dx: -38, dy: 12 },
  { code: "IND-BLR", countryCode: "IND", name: "Bangalore", lon: 77.59, lat: 12.97, isCapital: false, recruitCapacity: 1, income: 570, growth: 40, dx: -42, dy: -18 },

  // Brezilya
  { code: "BRA-BSB", countryCode: "BRA", name: "Brasilia", lon: -47.88, lat: -15.79, isCapital: true, recruitCapacity: 3, income: 780, growth: 58, dx: 8, dy: -18 },
  { code: "BRA-SAO", countryCode: "BRA", name: "Sao Paulo", lon: -46.63, lat: -23.55, isCapital: false, recruitCapacity: 2, income: 900, growth: 68, dx: 8, dy: 12 },
  { code: "BRA-RIO", countryCode: "BRA", name: "Rio", lon: -43.17, lat: -22.91, isCapital: false, recruitCapacity: 2, income: 690, growth: 49, dx: 8, dy: -18 },
  { code: "BRA-REC", countryCode: "BRA", name: "Recife", lon: -34.88, lat: -8.05, isCapital: false, recruitCapacity: 1, income: 410, growth: 28, dx: 8, dy: 12 },
  { code: "BRA-MAO", countryCode: "BRA", name: "Manaus", lon: -60.02, lat: -3.12, isCapital: false, recruitCapacity: 1, income: 360, growth: 23, dx: -38, dy: 12 },
  { code: "BRA-POA", countryCode: "BRA", name: "Porto Alegre", lon: -51.23, lat: -30.03, isCapital: false, recruitCapacity: 1, income: 430, growth: 29, dx: -40, dy: 12 },

  // Avustralya
  { code: "AUS-CBR", countryCode: "AUS", name: "Canberra", lon: 149.13, lat: -35.28, isCapital: true, recruitCapacity: 3, income: 680, growth: 49, dx: 8, dy: -18 },
  { code: "AUS-SYD", countryCode: "AUS", name: "Sydney", lon: 151.21, lat: -33.87, isCapital: false, recruitCapacity: 2, income: 820, growth: 61, dx: 8, dy: 12 },
  { code: "AUS-MEL", countryCode: "AUS", name: "Melbourne", lon: 144.96, lat: -37.81, isCapital: false, recruitCapacity: 2, income: 760, growth: 56, dx: -38, dy: 12 },
  { code: "AUS-PER", countryCode: "AUS", name: "Perth", lon: 115.86, lat: -31.95, isCapital: false, recruitCapacity: 1, income: 500, growth: 34, dx: -35, dy: 12 },
  { code: "AUS-BNE", countryCode: "AUS", name: "Brisbane", lon: 153.03, lat: -27.47, isCapital: false, recruitCapacity: 1, income: 540, growth: 37, dx: 8, dy: 12 },
];

const INITIAL_CITY_OWNERS = Object.fromEntries(
  cityNodes.map((city) => [
    city.code,
    INITIAL_COUNTRIES[city.countryCode]?.owner ?? null,
  ])
) as Record<string, string | null>;

const CAPITAL_HOLD_TURNS_REQUIRED = 2;


type HomelandOption = {
  code: string;
  name: string;
  region: string;
  description: string;
  startingResources: Resources;
};

const HOMELAND_OPTIONS: HomelandOption[] = [
  { code: "TUR", name: "Türkiye", region: "Avrupa / Orta Doğu", description: "Avrupa, Kafkasya ve Orta Doğu arasında dengeli başlangıç.", startingResources: { gold: 1500, steel: 900, oil: 720 } },
  { code: "DEU", name: "Almanya", region: "Avrupa", description: "Yüksek asker basma kapasitesi ve merkezi Avrupa konumu.", startingResources: { gold: 1650, steel: 980, oil: 620 } },
  { code: "FRA", name: "Fransa", region: "Avrupa", description: "Batı Avrupa ve Akdeniz'e erişimi olan dengeli anavatan.", startingResources: { gold: 1580, steel: 860, oil: 650 } },
  { code: "GBR", name: "Birleşik Krallık", region: "Avrupa", description: "Ada savunması ve Atlantik erişimi güçlü başlangıç.", startingResources: { gold: 1700, steel: 820, oil: 700 } },
  { code: "ITA", name: "İtalya", region: "Avrupa", description: "Akdeniz merkezli, kuzey-güney operasyonlarına uygun.", startingResources: { gold: 1480, steel: 820, oil: 640 } },
  { code: "ESP", name: "İspanya", region: "Avrupa", description: "Atlantik ve Akdeniz'e çift yönlü çıkış.", startingResources: { gold: 1450, steel: 780, oil: 680 } },
  { code: "POL", name: "Polonya", region: "Avrupa", description: "Doğu ve Batı Avrupa arasında kara savaşı odaklı konum.", startingResources: { gold: 1400, steel: 900, oil: 560 } },
  { code: "USA", name: "ABD", region: "Kuzey Amerika", description: "Geniş şehir ağı, yüksek ekonomi ve iki okyanusa erişim.", startingResources: { gold: 1900, steel: 1100, oil: 1000 } },
  { code: "RUS", name: "Rusya", region: "Avrasya", description: "Çok geniş coğrafya, yüksek savunma derinliği ve kaynak tabanı.", startingResources: { gold: 1700, steel: 1200, oil: 1150 } },
  { code: "CHN", name: "Çin", region: "Asya", description: "Yüksek şehir kapasitesi ve yoğun kara üretimi.", startingResources: { gold: 1750, steel: 1150, oil: 820 } },
  { code: "JPN", name: "Japonya", region: "Asya / Pasifik", description: "Pasifik odaklı ada başlangıcı ve güçlü hava-deniz konumu.", startingResources: { gold: 1600, steel: 850, oil: 760 } },
  { code: "IND", name: "Hindistan", region: "Güney Asya", description: "Hint Okyanusu ve Asya kara yollarına erişim.", startingResources: { gold: 1600, steel: 900, oil: 700 } },
  { code: "BRA", name: "Brezilya", region: "Güney Amerika", description: "Geniş güvenli arka alan ve güçlü şehir ekonomisi.", startingResources: { gold: 1550, steel: 850, oil: 760 } },
  { code: "AUS", name: "Avustralya", region: "Okyanusya", description: "İzole savunma, Pasifik ve Hint Okyanusu operasyonları.", startingResources: { gold: 1500, steel: 800, oil: 820 } },
];

const COUNTRY_NAMES = Object.fromEntries(
  HOMELAND_OPTIONS.map((item) => [item.code, item.name])
) as Record<string, string>;

function capitalForCountry(countryCode: string) {
  return cityNodes.find(
    (city) => city.countryCode === countryCode && city.isCapital
  );
}

function startingGarrisonFor(countryCode: string): Record<string, number> {
  const cityCount = cityNodes.filter(
    (city) => city.countryCode === countryCode
  ).length;

  return {
    infantry: 900 + cityCount * 80,
    light_tank: 24 + cityCount * 2,
    heavy_tank: 12 + cityCount,
    fighter: 10 + Math.floor(cityCount / 2),
    attack_helicopter: 6,
    battleship: ["GBR", "USA", "JPN", "AUS", "BRA", "FRA", "ITA", "ESP"].includes(countryCode) ? 3 : 1,
  };
}

type RadarStack = {
  kind: "infantry" | "tank" | "air" | "naval";
  iconId: string;
  count: number;
};

function getRadarStacks(garrison: Record<string, number>): RadarStack[] {
  const infantry =
    (garrison.infantry ?? 0) +
    (garrison.militia ?? 0) +
    (garrison.special_forces ?? 0) +
    (garrison.marine ?? 0);

  const tanks =
    (garrison.light_tank ?? 0) +
    (garrison.heavy_tank ?? 0);

  const air =
    (garrison.fighter ?? 0) +
    (garrison.attack_helicopter ?? 0) +
    (garrison.bomber ?? 0) +
    (garrison.transport_plane ?? 0);

  const naval =
    (garrison.destroyer ?? 0) +
    (garrison.battleship ?? 0) +
    (garrison.submarine ?? 0) +
    (garrison.support_ship ?? 0);

  return [
    { kind: "infantry", iconId: "infantry", count: infantry },
    { kind: "tank", iconId: "heavy_tank", count: tanks },
    { kind: "air", iconId: "fighter", count: air },
    { kind: "naval", iconId: "battleship", count: naval },
  ].filter((stack) => stack.count > 0);
}

const TERRAIN_MAP_URL =
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Blue_Marble_2002.jpg/3840px-Blue_Marble_2002.jpg";

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 500;
const WORLD_COPIES = [-WORLD_WIDTH, 0, WORLD_WIDTH];

function wrapWorldX(value: number) {
  return ((value % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH;
}

function shortestWrappedTargetX(sourceX: number, targetX: number) {
  const options = [
    targetX - WORLD_WIDTH,
    targetX,
    targetX + WORLD_WIDTH,
  ];

  return options.reduce((best, candidate) =>
    Math.abs(candidate - sourceX) < Math.abs(best - sourceX)
      ? candidate
      : best
  );
}

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
  const [selectedHomeland, setSelectedHomeland] = useState("TUR");
  const [cityPanelOpen, setCityPanelOpen] = useState(false);
  const [cityPanelTab, setCityPanelTab] =
    useState<"production" | "movement">("production");
  const [moveDraft, setMoveDraft] =
    useState<Record<string, number>>({});
  const [moveManifest, setMoveManifest] =
    useState<Record<string, number>>({});
  const [turn, setTurn] = useState(1);
  const [notice, setNotice] = useState("Komuta ağı çevrimiçi.");
  const [selectedUnitId, setSelectedUnitId] = useState("infantry");
  const [productionQty, setProductionQty] = useState(1);
  const [movementQty, setMovementQty] = useState(1);
  const [moveSourceCode, setMoveSourceCode] = useState<string | null>(null);
  const [orderSequence, setOrderSequence] = useState(1);

  const [mapZoom, setMapZoom] = useState(1);
  const [mapCenter, setMapCenter] = useState({ x: 500, y: 250 });
  const mapDragRef = useRef<{
    pointerX: number;
    pointerY: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const [resources, setResources] = useState<Resources>({
    gold: 1250,
    steel: 840,
    oil: 620,
  });
  const [productionQueue, setProductionQueue] = useState<ProductionOrder[]>([]);
  const [movementQueue, setMovementQueue] = useState<MovementOrder[]>([]);
  const [garrisons, setGarrisons] = useState<Garrison>(INITIAL_GARRISONS);
  const [cityOwners, setCityOwners] =
    useState<Record<string, string | null>>(INITIAL_CITY_OWNERS);
  const [capitalHoldTurns, setCapitalHoldTurns] =
    useState<CapitalHoldState>({});

  const [world, setWorld] = useState<GeoFeature[]>([]);
  const [mapError, setMapError] = useState("");
  const [selectedId, setSelectedId] = useState("TUR");
  const [selectedCityId, setSelectedCityId] = useState("TUR-ANK");
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

  const selectedCity = cityNodes.find((city) => city.code === selectedCityId);
  const currentPlayer = commander.trim() || "Atlas";
  const selectedCityOwner = selectedCity
    ? cityOwners[selectedCity.code] ?? null
    : null;
  const ownsSelectedCity = selectedCityOwner === currentPlayer;
  const productionTurns = getProductionTurns(selectedUnit);
  const productionCost = getProductionCost(selectedUnit, productionQty);
  const selectedGarrison = garrisons[selectedCity?.code ?? ""] ?? {};
  const selectedUnitCount = selectedGarrison[selectedUnit.id] ?? 0;
  const selectedCountryRecruitCapacity = cityNodes
    .filter((city) => city.countryCode === selectedId)
    .reduce((sum, city) => sum + city.recruitCapacity, 0);
  const selectedCountryCities = cityNodes.filter(
    (city) => city.countryCode === selectedId
  );
  const controlledCountryCities = selectedCountryCities.filter(
    (city) => cityOwners[city.code] === currentPlayer
  );
  const controlledCountryRecruitCapacity = controlledCountryCities.reduce(
    (sum, city) => sum + city.recruitCapacity,
    0
  );
  const selectedCapital = selectedCountryCities.find(
    (city) => city.isCapital
  );
  const selectedCapitalOwner = selectedCapital
    ? cityOwners[selectedCapital.code] ?? null
    : null;
  const selectedCityActiveOrders = selectedCity
    ? productionQueue.filter((order) => order.countryId === selectedCity.code).length
    : 0;

  const mapViewWidth = WORLD_WIDTH / mapZoom;
  const mapViewHeight = WORLD_HEIGHT / mapZoom;
  const mapViewBox = [
    mapCenter.x - mapViewWidth / 2,
    mapCenter.y - mapViewHeight / 2,
    mapViewWidth,
    mapViewHeight,
  ].join(" ");

  function setupGameFromHomeland(countryCode: string) {
    const playerName = commander.trim() || "Atlas";
    const playerHome = HOMELAND_OPTIONS.find(
      (item) => item.code === countryCode
    ) ?? HOMELAND_OPTIONS[0];

    const opponentCandidates = ["RUS", "FRA", "CHN", "USA", "DEU", "JPN"]
      .filter((code) => code !== countryCode);
    const doganHome = opponentCandidates[0];
    const novaHome = opponentCandidates[1];

    const nextCountryState: Record<string, CountryState> = {};
    const knownCountryCodes = Array.from(
      new Set(cityNodes.map((city) => city.countryCode))
    );

    knownCountryCodes.forEach((code) => {
      nextCountryState[code] = {
        owner: null,
        troops: 5,
        resource:
          code === "RUS" || code === "USA"
            ? "Petrol"
            : code === "DEU" || code === "CHN"
              ? "Çelik"
              : "Altın",
      };
    });

    nextCountryState[countryCode] = {
      ...(nextCountryState[countryCode] ?? {
        troops: 5,
        resource: "Altın",
      }),
      owner: playerName,
    };
    nextCountryState[doganHome] = {
      ...(nextCountryState[doganHome] ?? {
        troops: 5,
        resource: "Petrol",
      }),
      owner: "Dogan",
    };
    nextCountryState[novaHome] = {
      ...(nextCountryState[novaHome] ?? {
        troops: 5,
        resource: "Altın",
      }),
      owner: "Nova",
    };

    const nextCityOwners = Object.fromEntries(
      cityNodes.map((city) => {
        if (city.countryCode === countryCode) {
          return [city.code, playerName];
        }
        if (city.countryCode === doganHome) {
          return [city.code, "Dogan"];
        }
        if (city.countryCode === novaHome) {
          return [city.code, "Nova"];
        }
        return [city.code, null];
      })
    ) as Record<string, string | null>;

    const nextGarrisons: Garrison = {};
    const playerCapital = capitalForCountry(countryCode);
    const doganCapital = capitalForCountry(doganHome);
    const novaCapital = capitalForCountry(novaHome);

    if (playerCapital) {
      nextGarrisons[playerCapital.code] =
        startingGarrisonFor(countryCode);
    }
    if (doganCapital) {
      nextGarrisons[doganCapital.code] =
        startingGarrisonFor(doganHome);
    }
    if (novaCapital) {
      nextGarrisons[novaCapital.code] =
        startingGarrisonFor(novaHome);
    }

    setResources(playerHome.startingResources);
    setCountryState(nextCountryState);
    setCityOwners(nextCityOwners);
    setGarrisons(nextGarrisons);
    setProductionQueue([]);
    setMovementQueue([]);
    setCapitalHoldTurns({});
    setTurn(1);
    setOrderSequence(1);
    setMoveSourceCode(null);
    setSelectedId(countryCode);

    if (playerCapital) {
      setSelectedCityId(playerCapital.code);
      const [capitalX, capitalY] = project([
        playerCapital.lon,
        playerCapital.lat,
      ]);
      setMapCenter({ x: capitalX, y: capitalY });
      setMapZoom(1.75);
    }

    setNotice(
      playerHome.name +
        " anavatan olarak seçildi. Başkent ve başlangıç ordusu hazır."
    );
    setScreen("game");
  }

  function changeMapZoom(nextZoom: number) {
    const zoom = Math.min(2.5, Math.max(1, nextZoom));
    setMapZoom(zoom);
    setMapCenter((current) => ({
      x: wrapWorldX(current.x),
      y: Math.min(
        WORLD_HEIGHT - WORLD_HEIGHT / zoom / 2,
        Math.max(WORLD_HEIGHT / zoom / 2, current.y)
      ),
    }));
  }

  function resetMapCamera() {
    setMapZoom(1);
    setMapCenter({ x: 500, y: 250 });
  }

  function handleMapPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;

    mapDragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      centerX: mapCenter.x,
      centerY: mapCenter.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMapPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const drag = mapDragRef.current;
    if (!drag) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const dx =
      ((event.clientX - drag.pointerX) / Math.max(1, rect.width)) *
      mapViewWidth;
    const dy =
      ((event.clientY - drag.pointerY) / Math.max(1, rect.height)) *
      mapViewHeight;

    const halfHeight = mapViewHeight / 2;

    setMapCenter({
      x: wrapWorldX(drag.centerX - dx),
      y: Math.min(
        WORLD_HEIGHT - halfHeight,
        Math.max(halfHeight, drag.centerY - dy)
      ),
    });
  }

  function handleMapPointerUp(event: React.PointerEvent<SVGSVGElement>) {
    mapDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleMapWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    changeMapZoom(mapZoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
  }

  function queueProductionUnit(unitId: string, quantity = 1) {
    if (!selectedCity) {
      setNotice("Üretim için bir şehir seç.");
      return;
    }

    if (!ownsSelectedCity) {
      setNotice("Yalnızca kontrol ettiğin şehirlerde üretim yapabilirsin.");
      return;
    }

    const unit = unitDefinition(unitId);
    if (!unit) return;

    const cost = getProductionCost(unit, quantity);

    if (
      resources.gold < cost.gold ||
      resources.steel < cost.steel ||
      resources.oil < cost.oil
    ) {
      setNotice("Bu üretim için yeterli kaynağın yok.");
      return;
    }

    const activeOrders = productionQueue.filter(
      (order) => order.countryId === selectedCity.code
    ).length;

    if (activeOrders >= selectedCity.recruitCapacity) {
      setNotice(
        selectedCity.name +
          " asker basma kapasitesi dolu (" +
          activeOrders +
          "/" +
          selectedCity.recruitCapacity +
          ")."
      );
      return;
    }

    const capacitySpeedBonus = Math.floor(
      (selectedCity.recruitCapacity - 1) / 2
    );
    const effectiveTurns = Math.max(
      1,
      getProductionTurns(unit) - capacitySpeedBonus
    );
    const readyTurn = turn + effectiveTurns;

    setResources((current) => ({
      gold: current.gold - cost.gold,
      steel: current.steel - cost.steel,
      oil: current.oil - cost.oil,
    }));

    setProductionQueue((current) => [
      ...current,
      {
        id: orderSequence,
        player: currentPlayer,
        countryId: selectedCity.code,
        cityName: selectedCity.name,
        unitId: unit.id,
        unitName: unit.name,
        quantity,
        readyTurn,
      },
    ]);

    setOrderSequence((current) => current + 1);
    setSelectedUnitId(unit.id);
    setNotice(
      selectedCity.name +
        ": " +
        quantity +
        " × " +
        unit.name +
        " üretime alındı."
    );
  }

  function cancelLatestProductionUnit(unitId: string) {
    if (!selectedCity) return;

    let removeIndex = -1;
    for (let index = productionQueue.length - 1; index >= 0; index -= 1) {
      const order = productionQueue[index];
      if (
        order.countryId === selectedCity.code &&
        order.unitId === unitId &&
        order.player === currentPlayer
      ) {
        removeIndex = index;
        break;
      }
    }

    if (removeIndex < 0) return;

    const order = productionQueue[removeIndex];
    const unit = unitDefinition(order.unitId);
    if (!unit) return;

    const refund = getProductionCost(unit, order.quantity);

    setProductionQueue((current) =>
      current.filter((_, index) => index !== removeIndex)
    );
    setResources((current) => ({
      gold: current.gold + refund.gold,
      steel: current.steel + refund.steel,
      oil: current.oil + refund.oil,
    }));
    setNotice(order.unitName + " üretim emri iptal edildi.");
  }

  function adjustMoveDraft(unitId: string, delta: number) {
    if (!selectedCity) return;

    const available = selectedGarrison[unitId] ?? 0;
    setMoveDraft((current) => {
      const nextValue = Math.max(
        0,
        Math.min(available, (current[unitId] ?? 0) + delta)
      );
      return { ...current, [unitId]: nextValue };
    });
  }

  function startCityTransfer() {
    if (!selectedCity || !ownsSelectedCity) {
      setNotice("Birlik taşıma için kendi şehrini seç.");
      return;
    }

    const manifest = Object.fromEntries(
      Object.entries(moveDraft).filter(([, quantity]) => quantity > 0)
    );

    if (Object.keys(manifest).length === 0) {
      setNotice("Taşınacak birlik miktarını seç.");
      return;
    }

    setMoveManifest(manifest);
    setMoveSourceCode(selectedCity.code);
    setCityPanelOpen(false);
    setNotice(
      selectedCity.name +
        ": birlikler seçildi. Şimdi haritada hedef şehre tıkla."
    );
  }

  function queueProduction() {
    queueProductionUnit(selectedUnit.id, productionQty);
  }

  function startMovementOrder() {
    if (!selectedCity) {
      setNotice("Hareket emri için haritadaki bir şehir merkezini seç.");
      return;
    }

    if (!ownsSelectedCity) {
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
      setSelectedId(city.countryCode);
      setSelectedCityId(city.code);
      setSelectedUnitId("infantry");
      setMoveDraft({});
      setCityPanelTab("production");
      setCityPanelOpen(true);
      return;
    }

    const source = cityNodes.find(
      (item) => item.code === moveSourceCode
    );

    if (!source) {
      setMoveSourceCode(null);
      setMoveManifest({});
      return;
    }

    if (source.code === city.code) {
      setMoveSourceCode(null);
      setMoveManifest({});
      setMoveDraft({});
      setSelectedId(city.countryCode);
      setSelectedCityId(city.code);
      setCityPanelOpen(true);
      setNotice("Hareket emri iptal edildi.");
      return;
    }

    const targetCityOwner = cityOwners[city.code] ?? null;
    const orderKind: "move" | "attack" =
      targetCityOwner === currentPlayer ? "move" : "attack";
    const km = distanceKm(source, city);

    const manifestEntries =
      Object.keys(moveManifest).length > 0
        ? Object.entries(moveManifest)
        : [[selectedUnit.id, movementQty] as [string, number]];

    const newOrders: MovementOrder[] = [];
    const skipped: string[] = [];

    manifestEntries.forEach(([unitId, quantity], index) => {
      const unit = unitDefinition(unitId);
      if (!unit || quantity <= 0) return;

      if (unit.domain === "naval") {
        skipped.push(unit.name + " (liman gerekli)");
        return;
      }

      const maxKm = movementRangeKm(unit);
      if (km > maxKm) {
        skipped.push(unit.name + " (menzil)");
        return;
      }

      const sourceCount =
        garrisons[source.code]?.[unit.id] ?? 0;
      const alreadyQueued = movementQueue
        .filter(
          (order) =>
            order.fromCode === source.code &&
            order.unitId === unit.id
        )
        .reduce(
          (sum, order) => sum + order.quantity,
          0
        );

      const allowed = Math.min(
        quantity,
        Math.max(0, sourceCount - alreadyQueued)
      );

      if (allowed <= 0) return;

      newOrders.push({
        id: orderSequence + index,
        kind: orderKind,
        fromCode: source.code,
        fromCity: source.name,
        toCode: city.code,
        toCity: city.name,
        unitId: unit.id,
        unitName: unit.name,
        quantity: allowed,
        distanceKm: km,
      });
    });

    if (newOrders.length === 0) {
      setNotice(
        skipped.length
          ? "Bu hedefe taşınamayan birimler: " +
              skipped.join(", ")
          : "Taşınabilir birlik bulunamadı."
      );
      return;
    }

    setMovementQueue((current) => [
      ...current,
      ...newOrders,
    ]);
    setOrderSequence(
      (current) => current + newOrders.length
    );
    setMoveSourceCode(null);
    setMoveManifest({});
    setMoveDraft({});
    setSelectedId(city.countryCode);
    setSelectedCityId(city.code);
    setCityPanelOpen(false);

    setNotice(
      source.name +
        " → " +
        city.name +
        ": " +
        newOrders.length +
        " birlik grubu " +
        (orderKind === "attack"
          ? "SALDIRI"
          : "HAREKET") +
        " emrine eklendi." +
        (skipped.length
          ? " Atlanan: " + skipped.join(", ")
          : "")
    );
  }

  function advanceTurn() {
    const nextTurn = turn + 1;
    const completed = productionQueue.filter(
      (order) => order.readyTurn <= nextTurn
    );
    const pending = productionQueue.filter(
      (order) => order.readyTurn > nextTurn
    );

    const nextGarrisons: Garrison = {};
    Object.entries(garrisons).forEach(([code, units]) => {
      nextGarrisons[code] = { ...units };
    });

    const nextCityOwners = { ...cityOwners };
    const nextCountryState = { ...countryState };
    const nextCapitalHold: CapitalHoldState = { ...capitalHoldTurns };

    const movedTexts: string[] = [];
    const combatTexts: string[] = [];
    const capitalTexts: string[] = [];
    const capturedCodes: string[] = [];

    movementQueue.forEach((order) => {
      const available =
        nextGarrisons[order.fromCode]?.[order.unitId] ?? 0;
      const committed = Math.min(available, order.quantity);
      if (committed <= 0) return;

      nextGarrisons[order.fromCode] = {
        ...(nextGarrisons[order.fromCode] ?? {}),
        [order.unitId]: available - committed,
      };

      if (order.kind === "move") {
        nextGarrisons[order.toCode] = {
          ...(nextGarrisons[order.toCode] ?? {}),
          [order.unitId]:
            (nextGarrisons[order.toCode]?.[order.unitId] ?? 0) +
            committed,
        };

        movedTexts.push(
          order.fromCity +
            " → " +
            order.toCity +
            ": " +
            committed +
            " " +
            order.unitName
        );
        return;
      }

      const attacker = unitDefinition(order.unitId);
      if (!attacker) return;

      const defenders = {
        ...(nextGarrisons[order.toCode] ?? {}),
      };
      const defensePower = totalDefensePower(defenders);
      const attackPower =
        committed *
        attacker.stats.attack *
        (1 + attacker.stats.critical * 0.04);

      if (defensePower <= 0) {
        nextGarrisons[order.toCode] = {
          [order.unitId]: committed,
        };
        capturedCodes.push(order.toCode);
        combatTexts.push(
          order.toCity + " savunmasızdı; şehir ele geçirildi."
        );
        return;
      }

      const defenderLossFraction = Math.min(
        1,
        attackPower / Math.max(1, defensePower * 1.25)
      );
      const attackerLossFraction = Math.min(
        1,
        defensePower / Math.max(1, attackPower * 1.4)
      );

      const reducedDefenders: Record<string, number> = {};
      Object.entries(defenders).forEach(([unitId, quantity]) => {
        const remaining = Math.max(
          0,
          Math.round(quantity * (1 - defenderLossFraction))
        );
        if (remaining > 0) reducedDefenders[unitId] = remaining;
      });

      const attackerSurvivors = Math.max(
        0,
        Math.round(committed * (1 - attackerLossFraction))
      );
      const remainingDefenders = Object.values(
        reducedDefenders
      ).reduce((sum, quantity) => sum + quantity, 0);

      if (remainingDefenders === 0 && attackerSurvivors > 0) {
        nextGarrisons[order.toCode] = {
          [order.unitId]: attackerSurvivors,
        };
        capturedCodes.push(order.toCode);
        combatTexts.push(
          order.toCity +
            " ele geçirildi. " +
            attackerSurvivors +
            "/" +
            committed +
            " " +
            order.unitName +
            " hayatta kaldı."
        );
      } else {
        nextGarrisons[order.toCode] = reducedDefenders;
        combatTexts.push(
          order.toCity +
            " saldırısı püskürtüldü. Saldıran kayıp: " +
            (committed - attackerSurvivors) +
            "."
        );
      }
    });

    capturedCodes.forEach((code) => {
      nextCityOwners[code] = currentPlayer;
    });

    const completedValid = completed.filter(
      (order) => nextCityOwners[order.countryId] === order.player
    );

    completedValid.forEach((order) => {
      nextGarrisons[order.countryId] = {
        ...(nextGarrisons[order.countryId] ?? {}),
        [order.unitId]:
          (nextGarrisons[order.countryId]?.[order.unitId] ?? 0) +
          order.quantity,
      };
    });

    const remainingProduction = pending.filter(
      (order) => nextCityOwners[order.countryId] === order.player
    );

    const cancelledProductionCount =
      productionQueue.length -
      completedValid.length -
      remainingProduction.length;

    const countryCodes = Array.from(
      new Set(cityNodes.map((city) => city.countryCode))
    );

    countryCodes.forEach((countryCode) => {
      const capital = cityNodes.find(
        (city) =>
          city.countryCode === countryCode && city.isCapital
      );
      if (!capital) return;

      const capitalOwner =
        nextCityOwners[capital.code] ?? null;
      const strategicOwner =
        nextCountryState[countryCode]?.owner ?? null;

      if (
        capitalOwner &&
        capitalOwner !== strategicOwner
      ) {
        const previous = nextCapitalHold[countryCode];
        const turns =
          previous?.holder === capitalOwner
            ? previous.turns + 1
            : 1;

        nextCapitalHold[countryCode] = {
          holder: capitalOwner,
          turns,
        };

        capitalTexts.push(
          capital.name +
            ": " +
            capitalOwner +
            " başkenti " +
            turns +
            "/" +
            CAPITAL_HOLD_TURNS_REQUIRED +
            " tur tutuyor."
        );

        if (turns >= CAPITAL_HOLD_TURNS_REQUIRED) {
          nextCountryState[countryCode] = {
            ...(nextCountryState[countryCode] ?? {
              troops: 5,
              resource: "Gıda",
            }),
            owner: capitalOwner,
          };

          capitalTexts.push(
            countryCode +
              " stratejik kontrolü " +
              capitalOwner +
              " tarafına geçti."
          );
        }
      } else {
        nextCapitalHold[countryCode] = {
          holder: capitalOwner,
          turns: 0,
        };
      }
    });

    setGarrisons(nextGarrisons);
    setCityOwners(nextCityOwners);
    setCountryState(nextCountryState);
    setCapitalHoldTurns(nextCapitalHold);

    const completedText = completedValid
      .map(
        (order) =>
          order.cityName +
          ": +" +
          order.quantity +
          " " +
          order.unitName
      )
      .join(" · ");

    const incomeGold = cityNodes.reduce((sum, city) => {
      return nextCityOwners[city.code] === currentPlayer
        ? sum + Math.round(city.income * 0.1)
        : sum;
    }, 0);

    setResources((current) => ({
      gold: current.gold + incomeGold,
      steel: current.steel + Math.floor(incomeGold * 0.2),
      oil: current.oil + Math.floor(incomeGold * 0.15),
    }));

    const messages = [
      "Tur " + nextTurn + " başladı.",
      movedTexts.length
        ? "Hareket: " + movedTexts.join(" · ")
        : "",
      combatTexts.length
        ? "Savaş: " + combatTexts.join(" · ")
        : "",
      capitalTexts.length
        ? "Başkent: " + capitalTexts.join(" · ")
        : "",
      completedText
        ? "Üretim: " + completedText
        : "",
      cancelledProductionCount > 0
        ? "İptal edilen üretim emri: " +
          cancelledProductionCount
        : "",
      "Şehir geliri: +" + incomeGold + " Altın",
    ].filter(Boolean);

    setNotice(messages.join(" | "));
    setProductionQueue(remainingProduction);
    setMovementQueue([]);
    setMoveSourceCode(null);
    setTurn(nextTurn);
  }

  if (screen === "homeland") {
    const homeland = HOMELAND_OPTIONS.find(
      (item) => item.code === selectedHomeland
    );
    const homelandCities = cityNodes.filter(
      (city) => city.countryCode === selectedHomeland
    );
    const homelandCapital = homelandCities.find(
      (city) => city.isCapital
    );
    const homelandCapacity = homelandCities.reduce(
      (sum, city) => sum + city.recruitCapacity,
      0
    );
    const canPurchase = Boolean(homeland);

    return (
      <div className="app homeland-map-screen">
        <header className="homeland-map-bar">
          <div className="homeland-map-brand">
            <strong>IRON ATLAS</strong>
            <span>Yeni Oyun · Anavatan Seçimi</span>
          </div>
          <div className="homeland-map-instruction">
            Dünya haritasından bir ülkeye tıkla
          </div>
          <button
            className="ghost homeland-map-back"
            onClick={() => setScreen("lobby")}
          >
            ← LOBİ
          </button>
        </header>

        <main className="homeland-map-wrap">
          {mapError ? (
            <div className="map-error">{mapError}</div>
          ) : world.length === 0 ? (
            <div className="map-loading">
              Dünya haritası yükleniyor...
            </div>
          ) : (
            <svg
              viewBox={mapViewBox}
              className="world-map homeland-world-map"
              onPointerDown={handleMapPointerDown}
              onPointerMove={handleMapPointerMove}
              onPointerUp={handleMapPointerUp}
              onPointerCancel={handleMapPointerUp}
              onWheel={handleMapWheel}
            >
              <rect
                x={-WORLD_WIDTH}
                y="0"
                width={WORLD_WIDTH * 3}
                height={WORLD_HEIGHT}
                className="homeland-ocean"
              />

              {WORLD_COPIES.map((worldOffset) => (
                <g
                  key={worldOffset}
                  transform={`translate(${worldOffset} 0)`}
                >
                  <image
                    href={TERRAIN_MAP_URL}
                    x="0"
                    y="0"
                    width={WORLD_WIDTH}
                    height={WORLD_HEIGHT}
                    preserveAspectRatio="none"
                    className="terrain-base homeland-terrain"
                  />

                  {world.map((feature, index) => {
                    const id = String(
                      feature.id ?? `country-${index}`
                    );
                    const supported = HOMELAND_OPTIONS.some(
                      (item) => item.code === id
                    );
                    const selected =
                      selectedHomeland === id;

                    return (
                      <path
                        key={id}
                        d={geometryToPath(feature.geometry)}
                        className={
                          "homeland-country " +
                          (supported
                            ? "supported "
                            : "unsupported ") +
                          (selected ? "selected" : "")
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedHomeland(id);
                        }}
                      >
                        <title>
                          {feature.properties?.name ?? id}
                        </title>
                      </path>
                    );
                  })}
                </g>
              ))}
            </svg>
          )}

          <div className="homeland-map-controls map-controls">
            <button
              onClick={() =>
                changeMapZoom(mapZoom * 1.2)
              }
              disabled={mapZoom >= 2.5}
            >
              +
            </button>
            <span>{Math.round(mapZoom * 100)}%</span>
            <button
              onClick={() =>
                changeMapZoom(mapZoom / 1.2)
              }
              disabled={mapZoom <= 1}
            >
              −
            </button>
            <button onClick={resetMapCamera}>⟳</button>
          </div>

          <aside className="homeland-purchase-panel">
            <span className="eyebrow">
              ÜLKE SEÇİMİ
            </span>
            <h3>
              {homeland?.name ??
                COUNTRY_NAMES[selectedHomeland] ??
                selectedHomeland}
            </h3>

            {canPurchase ? (
              <>
                <div className="purchase-stat">
                  <span>Başkent</span>
                  <b>
                    {homelandCapital?.name ?? "—"}
                  </b>
                </div>
                <div className="purchase-stat">
                  <span>Şehir</span>
                  <b>{homelandCities.length}</b>
                </div>
                <div className="purchase-stat">
                  <span>Asker basma kapasitesi</span>
                  <b>{homelandCapacity}</b>
                </div>
                <div className="purchase-stat">
                  <span>Başlangıç seçimi</span>
                  <b>ÜCRETSİZ</b>
                </div>

                <button
                  className="purchase-country-button"
                  onClick={() =>
                    setupGameFromHomeland(
                      selectedHomeland
                    )
                  }
                >
                  ANAVATAN OLARAK SATIN AL
                </button>
                <small>
                  Satın alma tamamlandığında ülke
                  senin oyuncu rengin olan mavi ile
                  işaretlenecek.
                </small>
              </>
            ) : (
              <div className="unsupported-country-note">
                Bu ülke için şehir ve üretim ağı
                henüz hazırlanmadı. Haritadaki
                desteklenen ülkelerden birini seç.
              </div>
            )}
          </aside>

          <div className="homeland-map-message">
            Haritada ülkeye tıkla · seç · satın al ·
            savaşa başla
          </div>
        </main>
      </div>
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
            <span className="eyebrow">STRATEGY PROTOTYPE • V1.0</span>
            <h2>Dünyayı fethet. İttifak kur. Emirlerini aynı anda uygula.</h2>
            <p>
              Şehir sahipliği, başkent kontrolü, üretim, hareket ve savaş emirleri aynı tur sistemi içinde çalışıyor.
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

            <button
              className="primary"
              onClick={() => {
                setMapZoom(1);
                setMapCenter({ x: 500, y: 250 });
                setSelectedHomeland("TUR");
                setScreen("homeland");
              }}
            >
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
                    setMapZoom(1);
                    setMapCenter({ x: 500, y: 250 });
                    setSelectedHomeland("TUR");
                    setScreen("homeland");
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
        <button
          className="top-end-turn"
          onClick={advanceTurn}
        >
          TURU BİTİR
        </button>
        <button className="ghost" onClick={() => setScreen("lobby")}>
          LOBİ
        </button>
      </header>

      <main className="game-layout">
        <aside className="side card">
          <span className="eyebrow">PLAYERS 3/40</span>
          <h3>Komutanlar</h3>

          <div className="players">
            {[
              { name: currentPlayer, status: "Hazır", color: "#2687e8" },
              { name: "Dogan", status: "Hazır", color: "#d84c4c" },
              { name: "Nova", status: "Bekliyor", color: "#36b978" },
            ].map((player) => (
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
                viewBox={mapViewBox}
                className="world-map"
                role="img"
                aria-label="Iron Atlas gerçek dünya haritası"
                onPointerDown={handleMapPointerDown}
                onPointerMove={handleMapPointerMove}
                onPointerUp={handleMapPointerUp}
                onPointerCancel={handleMapPointerUp}
                onWheel={handleMapWheel}
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

                <rect
                  x={-WORLD_WIDTH}
                  y="0"
                  width={WORLD_WIDTH * 3}
                  height={WORLD_HEIGHT}
                  fill="url(#grid)"
                  className="map-drag-surface"
                />

                {WORLD_COPIES.map((worldOffset) => (
                  <g
                    key={worldOffset}
                    transform={`translate(${worldOffset} 0)`}
                  >
                    <image
                      href={TERRAIN_MAP_URL}
                      x="0"
                      y="0"
                      width={WORLD_WIDTH}
                      height={WORLD_HEIGHT}
                      preserveAspectRatio="none"
                      className="terrain-base"
                    />

                    {world.map((feature, index) => {
                      const id = String(feature.id ?? `country-${index}`);
                      const state =
                        countryState[id] ?? {
                          owner: null,
                          troops: 5,
                          resource: "Gıda",
                        };
                      const owner = state.owner ?? "Neutral";
                      const ownerVisual =
                        owner === currentPlayer ? "Atlas" : owner;

                      return (
                        <path
                          key={id}
                          d={geometryToPath(feature.geometry)}
                          fill={
                            PLAYER_COLORS[ownerVisual] ?? PLAYER_COLORS.Neutral
                          }
                          className={
                            "country owner-" +
                            ownerVisual.toLowerCase() +
                            " " +
                            (selectedId === id ? "selected" : "")
                          }
                          onClick={() => {
                            setSelectedId(id);
                            setSelectedCityId("");
                            setCityPanelOpen(false);
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

                    {movementQueue.map((order) => {
                      const from = cityNodes.find(
                        (city) => city.code === order.fromCode
                      );
                      const to = cityNodes.find(
                        (city) => city.code === order.toCode
                      );

                      if (!from || !to) return null;

                      const [x1, y1] = project([from.lon, from.lat]);
                      const [rawX2, y2] = project([to.lon, to.lat]);
                      const x2 = shortestWrappedTargetX(x1, rawX2);

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
                      const cityGarrison = garrisons[city.code] ?? {};
                      const radarStacks = getRadarStacks(cityGarrison);
                      const isSelectedCity = selectedCityId === city.code;
                      const isSelectedCountry = selectedId === city.countryCode;
                      const cityOwner = cityOwners[city.code] ?? "Neutral";
                      const cityOwnerVisual =
                        cityOwner === currentPlayer ? "Atlas" : cityOwner;

                      const showCityName =
                        isSelectedCity ||
                        (isSelectedCountry && mapZoom >= 1.45) ||
                        (city.isCapital && mapZoom >= 1.2);

                      const showEconomicDetail =
                        isSelectedCity && mapZoom >= 1.7;

                      const showRadar =
                        radarStacks.length > 0 &&
                        (isSelectedCity ||
                          (isSelectedCountry && mapZoom >= 2.0));

                      const showRadarCount = isSelectedCity;

                      return (
                        <g
                          className={
                            "city city-fixed-marker city-owner-" +
                            cityOwnerVisual.toLowerCase() +
                            " " +
                            (isSelectedCountry ? "selected-country-city " : "") +
                            (isSelectedCity ? "selected-city" : "")
                          }
                          key={city.code}
                          transform={`translate(${x} ${y}) scale(${1 / mapZoom})`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCityClick(city);
                          }}
                        >
                          <circle
                            cx="0"
                            cy="0"
                            r="13"
                            className="city-hitbox"
                          />

                          {city.isCapital ? (
                            <>
                              <circle
                                cx="0"
                                cy="0"
                                r="6.5"
                                className="capital-city-ring"
                              />
                              <text
                                x="0"
                                y="4.6"
                                className="capital-city-star"
                                textAnchor="middle"
                              >
                                ★
                              </text>
                            </>
                          ) : (
                            <>
                              <circle
                                cx="0"
                                cy="0"
                                r="5.5"
                                className="recruit-city-node"
                              />
                              <text
                                x="0"
                                y="2.8"
                                className="recruit-capacity-number"
                                textAnchor="middle"
                              >
                                {city.recruitCapacity}
                              </text>
                            </>
                          )}

                          {showCityName && (
                            <g className="city-economic-label">
                              <text
                                x={city.dx >= 0 ? 9 : -9}
                                y={city.dy < 0 ? -10 : 14}
                                textAnchor={city.dx >= 0 ? "start" : "end"}
                              >
                                {city.name}
                              </text>

                              {showEconomicDetail && (
                                <>
                                  <text
                                    x={city.dx >= 0 ? 9 : -9}
                                    y={city.dy < 0 ? 0 : 24}
                                    className="city-income"
                                    textAnchor={city.dx >= 0 ? "start" : "end"}
                                  >
                                    {city.income}
                                  </text>
                                  <text
                                    x={city.dx >= 0 ? 9 : -9}
                                    y={city.dy < 0 ? 9 : 33}
                                    className="city-growth"
                                    textAnchor={city.dx >= 0 ? "start" : "end"}
                                  >
                                    (+{city.growth})
                                  </text>
                                </>
                              )}
                            </g>
                          )}

                          {showRadar && (
                            <g
                              className="radar-stack-row"
                              transform="translate(10 -2)"
                            >
                              {radarStacks.map((stack, index) => {
                                const icon = UNIT_ICON_BY_ID[stack.iconId];
                                const offsetX = index * 18;

                                return (
                                  <g
                                    className={"radar-blip radar-" + stack.kind}
                                    key={stack.kind}
                                    transform={`translate(${offsetX} 0)`}
                                  >
                                    <circle cx="0" cy="0" r="6.5" />
                                    {icon && (
                                      <image
                                        href={icon}
                                        x="-5"
                                        y="-5"
                                        width="10"
                                        height="10"
                                        preserveAspectRatio="xMidYMid meet"
                                      />
                                    )}
                                    {showRadarCount && (
                                      <text
                                        x="0"
                                        y="12"
                                        textAnchor="middle"
                                        className="radar-count"
                                      >
                                        {stack.count}
                                      </text>
                                    )}
                                  </g>
                                );
                              })}
                            </g>
                          )}
                        </g>
                      );
                    })}

                  </g>
                ))}
              </svg>
            )}

            <div className="map-controls">
              <button
                onClick={() => changeMapZoom(mapZoom * 1.2)}
                title="Yakınlaştır (maks. %250)"
                disabled={mapZoom >= 2.5}
              >
                +
              </button>
              <span>{Math.round(mapZoom * 100)}%</span>
              <button
                onClick={() => changeMapZoom(mapZoom / 1.2)}
                title="Uzaklaştır"
                disabled={mapZoom <= 1}
              >
                −
              </button>
              <button
                className="reset-camera"
                onClick={resetMapCamera}
                title="Dünya görünümüne dön"
              >
                ⟳
              </button>
            </div>

            <div className="map-wrap-hint">
              Tekerlek: zoom · Tutup sürükle: haritayı kaydır · Dünya yatayda sonsuz döner
            </div>

            <div className="map-attribution">
              Physical base: NASA Blue Marble
            </div>

            {cityPanelOpen && selectedCity && (
              <div className="city-command-window">
                <div className="city-command-title">
                  <div>
                    <strong>{selectedCity.name}</strong>
                    <small>
                      {selectedCity.isCapital ? "★ Başkent" : "Şehir"} ·
                      {" "}Kapasite {selectedCity.recruitCapacity}
                    </small>
                  </div>
                  <button
                    onClick={() => setCityPanelOpen(false)}
                    aria-label="Şehir penceresini kapat"
                  >
                    ×
                  </button>
                </div>

                <div className="city-command-meta">
                  <span>
                    Sahip: <b>{selectedCityOwner ?? "Tarafsız"}</b>
                  </span>
                  <span>
                    Gelir: <b>{selectedCity.income}</b>
                  </span>
                </div>

                <div className="city-command-tabs">
                  <button
                    className={
                      cityPanelTab === "production"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setCityPanelTab("production")
                    }
                  >
                    ASKER BAS
                  </button>
                  <button
                    className={
                      cityPanelTab === "movement"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setCityPanelTab("movement")
                    }
                  >
                    BİRLİK TAŞI
                  </button>
                </div>

                {cityPanelTab === "production" ? (
                  <div className="city-unit-list">
                    <div className="city-capacity-line">
                      <span>Üretilebilir birlik</span>
                      <b>
                        {selectedCity.recruitCapacity -
                          selectedCityActiveOrders}
                        /{selectedCity.recruitCapacity}
                      </b>
                    </div>

                    {UNIT_DEFINITIONS.map((unit) => {
                      const pendingQty = productionQueue
                        .filter(
                          (order) =>
                            order.countryId ===
                              selectedCity.code &&
                            order.unitId === unit.id
                        )
                        .reduce(
                          (sum, order) =>
                            sum + order.quantity,
                          0
                        );
                      const cost = getProductionCost(
                        unit,
                        1
                      );

                      return (
                        <div
                          className="city-unit-row"
                          key={unit.id}
                          onClick={() =>
                            setSelectedUnitId(unit.id)
                          }
                        >
                          <div className="city-unit-icon">
                            {UNIT_ICON_BY_ID[unit.id] ? (
                              <img
                                src={
                                  UNIT_ICON_BY_ID[unit.id]
                                }
                                alt={unit.name}
                              />
                            ) : (
                              <span>
                                {unit.domain === "land"
                                  ? "▰"
                                  : unit.domain === "air"
                                    ? "✈"
                                    : "◆"}
                              </span>
                            )}
                          </div>
                          <div className="city-unit-info">
                            <strong>{unit.name}</strong>
                            <small>
                              {cost.gold} A ·{" "}
                              {cost.steel} Ç ·{" "}
                              {cost.oil} P
                            </small>
                          </div>
                          <div className="city-unit-pending">
                            {pendingQty > 0
                              ? pendingQty
                              : ""}
                          </div>
                          <button
                            className="city-unit-minus"
                            disabled={pendingQty <= 0}
                            onClick={(event) => {
                              event.stopPropagation();
                              cancelLatestProductionUnit(
                                unit.id
                              );
                            }}
                          >
                            −
                          </button>
                          <button
                            className="city-unit-plus"
                            disabled={
                              !ownsSelectedCity ||
                              selectedCityActiveOrders >=
                                selectedCity.recruitCapacity
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              queueProductionUnit(
                                unit.id,
                                1
                              );
                            }}
                          >
                            +
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="city-movement-list">
                    <div className="movement-help">
                      Taşınacak birlikleri seç, sonra
                      hedef şehre tıkla.
                    </div>

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
                          className="city-unit-row movement"
                          key={unit.id}
                        >
                          <div className="city-unit-icon">
                            {UNIT_ICON_BY_ID[unit.id] ? (
                              <img
                                src={
                                  UNIT_ICON_BY_ID[unit.id]
                                }
                                alt={unit.name}
                              />
                            ) : (
                              <span>
                                {unit.domain === "land"
                                  ? "▰"
                                  : unit.domain === "air"
                                    ? "✈"
                                    : "◆"}
                              </span>
                            )}
                          </div>
                          <div className="city-unit-info">
                            <strong>{unit.name}</strong>
                            <small>
                              Garnizon:{" "}
                              {available.toLocaleString(
                                "tr-TR"
                              )}
                              {unit.domain === "naval"
                                ? " · liman gerekli"
                                : ""}
                            </small>
                          </div>
                          <button
                            onClick={() =>
                              adjustMoveDraft(
                                unit.id,
                                -1
                              )
                            }
                            disabled={selected <= 0}
                          >
                            −
                          </button>
                          <b className="move-draft-count">
                            {selected}
                          </b>
                          <button
                            onClick={() =>
                              adjustMoveDraft(
                                unit.id,
                                Math.max(
                                  1,
                                  Math.ceil(
                                    available / 10
                                  )
                                )
                              )
                            }
                            disabled={
                              unit.domain === "naval" ||
                              selected >= available
                            }
                          >
                            +
                          </button>
                        </div>
                      );
                    })}

                    <button
                      className="city-transfer-button"
                      disabled={!ownsSelectedCity}
                      onClick={startCityTransfer}
                    >
                      BİRLİKLERİ TAŞI
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="map-overlay compact">
              <strong>{selectedName}</strong>
              <small>
                {selectedState.owner ?? "Tarafsız"} ·
                {" "}Şehir {controlledCountryCities.length}/
                {selectedCountryCities.length}
              </small>
            </div>
          </div>
        </section>

        <aside className="side card intel">
          <span className="eyebrow">INTELLIGENCE</span>
          <h3>{selectedName}</h3>

          <div className="intel-row">
            <span>Ülke kontrolü</span>
            <b>{selectedState.owner ?? "Tarafsız"}</b>
          </div>
          {selectedCity && (
            <div className="intel-row">
              <span>{selectedCity.name} sahibi</span>
              <b>{selectedCityOwner ?? "Tarafsız"}</b>
            </div>
          )}
          {selectedCity?.isCapital && (
            <div className="intel-row capital-control-row">
              <span>Başkent kontrolü</span>
              <b>
                {capitalHoldTurns[selectedCity.countryCode]?.turns ?? 0}/
                {CAPITAL_HOLD_TURNS_REQUIRED} tur
              </b>
            </div>
          )}
          <div className="intel-row">
            <span>Şehir kontrolü</span>
            <b>
              {controlledCountryCities.length}/{selectedCountryCities.length}
            </b>
          </div>
          <div className="intel-row">
            <span>Başkent</span>
            <b>{selectedCapitalOwner ?? "Tarafsız"}</b>
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
              <span className={"ownership-pill " + (ownsSelectedCity ? "owned" : "")}>
                {ownsSelectedCity ? "SENİN" : "KİLİTLİ"}
              </span>
            </div>

            <div className="garrison-count">
              <span>Mevcut {selectedUnit.name}</span>
              <b>{selectedUnitCount.toLocaleString("tr-TR")}</b>
            </div>

            {selectedCity && (
              <div className="recruit-capacity-box">
                <div>
                  <span>Şehir asker basma kapasitesi</span>
                  <b>{selectedCityActiveOrders}/{selectedCity.recruitCapacity}</b>
                </div>
                <div>
                  <span>Kontrol edilen / toplam</span>
                  <b>
                    {controlledCountryRecruitCapacity}/{selectedCountryRecruitCapacity}
                  </b>
                </div>
              </div>
            )}

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
              <div>
                <span>Süre</span>
                <b>
                  {selectedCity
                    ? Math.max(
                        1,
                        productionTurns -
                          Math.floor((selectedCity.recruitCapacity - 1) / 2)
                      )
                    : productionTurns} tur
                </b>
              </div>
            </div>

            <button
              className="produce-button"
              disabled={!selectedCity || !ownsSelectedCity}
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
                !ownsSelectedCity ||
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
