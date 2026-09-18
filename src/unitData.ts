export type UnitDomain = "land" | "air" | "naval";

export type UnitStats = {
  attack: number;
  defense: number;
  critical: number;
  hp: number;
  movement: number;
  view: number;
  capacity: number;
  cost: number;
  collateral: number;
};

export type DefenceBonus = {
  against: string;
  value: number;
};

export type UnitDefinition = {
  id: string;
  name: string;
  domain: UnitDomain;
  stats: UnitStats;
  defenceBonuses: DefenceBonus[];
  special: string;
  assetFile: string;
  estimated?: boolean;
};

export const UNIT_DEFINITIONS: UnitDefinition[] = [
  {
    id: "infantry",
    name: "Piyade",
    domain: "land",
    stats: { attack: 4, defense: 6, critical: 5, hp: 7, movement: 6, view: 16, capacity: 0, cost: 70, collateral: 0 },
    defenceBonuses: [{ against: "Helikopter", value: -2 }],
    special: "Savunmada güçlü temel kara birliği.",
    assetFile: "infantry.png",
  },
  {
    id: "militia",
    name: "Milis",
    domain: "land",
    stats: { attack: 3, defense: 4, critical: 0, hp: 7, movement: 2, view: 16, capacity: 0, cost: 30, collateral: 0 },
    defenceBonuses: [{ against: "Helikopter", value: -1 }],
    special: "Ucuz ve yavaş; temel bölge savunması için uygundur.",
    assetFile: "militia.png",
  },
  {
    id: "special_forces",
    name: "Özel Kuvvet",
    domain: "land",
    stats: { attack: 7, defense: 3, critical: 5, hp: 7, movement: 6, view: 20, capacity: 0, cost: 160, collateral: 0 },
    defenceBonuses: [{ against: "Piyade", value: 1 }],
    special: "Baskın ve sürpriz saldırılar için yüksek hareket ve görüş kabiliyeti.",
    assetFile: "special_forces.png",
  },
  {
    id: "marine",
    name: "Marine",
    domain: "land",
    stats: { attack: 7, defense: 3, critical: 5, hp: 7, movement: 6, view: 20, capacity: 0, cost: 160, collateral: 0 },
    defenceBonuses: [{ against: "Deniz Çıkarması", value: 1 }],
    special: "Amfibi harekât ve kıyı bölgelerinde etkili elit piyade.",
    assetFile: "marine.png",
  },
  {
    id: "light_tank",
    name: "Hafif Tank",
    domain: "land",
    stats: { attack: 8, defense: 4, critical: 5, hp: 7, movement: 7, view: 16, capacity: 0, cost: 120, collateral: 2 },
    defenceBonuses: [],
    special: "Hızlı kara saldırısı ve hat yarma için ana zırhlı birlik.",
    assetFile: "light_tank.png",
  },
  {
    id: "heavy_tank",
    name: "Ağır Tank",
    domain: "land",
    stats: { attack: 10, defense: 6, critical: 5, hp: 8, movement: 5, view: 16, capacity: 0, cost: 200, collateral: 3 },
    defenceBonuses: [],
    special: "Daha yüksek HP ve savunma karşılığında daha düşük hareket.",
    assetFile: "heavy_tank.png",
    estimated: true,
  },
  {
    id: "fighter",
    name: "Savaş Uçağı",
    domain: "air",
    stats: { attack: 7, defense: 6, critical: 5, hp: 7, movement: 12, view: 24, capacity: 0, cost: 220, collateral: 2 },
    defenceBonuses: [],
    special: "Hava üstünlüğü ve hızlı destek görevlerinde kullanılır.",
    assetFile: "fighter.png",
    estimated: true,
  },
  {
    id: "attack_helicopter",
    name: "Saldırı Helikopteri",
    domain: "air",
    stats: { attack: 6, defense: 4, critical: 5, hp: 7, movement: 8, view: 20, capacity: 0, cost: 170, collateral: 1 },
    defenceBonuses: [],
    special: "Kısa menzilli hava desteği; kara birliklerine karşı etkilidir.",
    assetFile: "attack_helicopter.png",
  },
  {
    id: "bomber",
    name: "Bombardıman Uçağı",
    domain: "air",
    stats: { attack: 6, defense: 6, critical: 5, hp: 7, movement: 15, view: 24, capacity: 0, cost: 160, collateral: 4 },
    defenceBonuses: [],
    special: "Uzun menzilli hava desteği ve yüksek collateral hasarı.",
    assetFile: "bomber.png",
  },
  {
    id: "transport_plane",
    name: "Nakliye Uçağı",
    domain: "air",
    stats: { attack: 1, defense: 2, critical: 5, hp: 7, movement: 13, view: 24, capacity: 3, cost: 600, collateral: 0 },
    defenceBonuses: [],
    special: "Kara birliklerini havadan taşır.",
    assetFile: "transport_plane.png",
  },
  {
    id: "destroyer",
    name: "Destroyer",
    domain: "naval",
    stats: { attack: 8, defense: 6, critical: 5, hp: 7, movement: 11, view: 20, capacity: 0, cost: 220, collateral: 1 },
    defenceBonuses: [{ against: "Denizaltı", value: 2 }],
    special: "Hızlı filo eskortu ve denizaltı avcısı.",
    assetFile: "destroyer.png",
    estimated: true,
  },
  {
    id: "battleship",
    name: "Büyük Savaş Gemisi",
    domain: "naval",
    stats: { attack: 9, defense: 7, critical: 5, hp: 7, movement: 10, view: 16, capacity: 0, cost: 250, collateral: 2 },
    defenceBonuses: [{ against: "Bombardıman Uçağı", value: 1 }],
    special: "Yüksek deniz saldırısı ve kıyı bombardımanı.",
    assetFile: "battleship.png",
  },
  {
    id: "submarine",
    name: "Denizaltı",
    domain: "naval",
    stats: { attack: 7, defense: 5, critical: 5, hp: 7, movement: 10, view: 16, capacity: 2, cost: 200, collateral: 0 },
    defenceBonuses: [{ against: "Bombardıman Uçağı", value: 1 }],
    special: "Gizli yaklaşma ve liman/nakliye hedeflerine sürpriz saldırı.",
    assetFile: "submarine.png",
  },
  {
    id: "support_ship",
    name: "Deniz Nakliye / Destek Gemisi",
    domain: "naval",
    stats: { attack: 1, defense: 2, critical: 5, hp: 7, movement: 10, view: 16, capacity: 10, cost: 250, collateral: 0 },
    defenceBonuses: [],
    special: "Kara birliklerini deniz üzerinden taşır.",
    assetFile: "support_ship.png",
  },
];

export const UNIT_BY_ID = Object.fromEntries(
  UNIT_DEFINITIONS.map((unit) => [unit.id, unit])
) as Record<string, UnitDefinition>;

export function getBaseUnitStats(unitId: string): UnitStats {
  return UNIT_BY_ID[unitId]?.stats ?? UNIT_DEFINITIONS[0].stats;
}
