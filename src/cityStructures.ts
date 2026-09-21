export type CityStructureId =
  | "radar"
  | "bank"
  | "recruitment"
  | "anti_air"
  | "fortification";

export type CityStructureLevels = Record<
  CityStructureId,
  number
>;

export type CityStructureDefinition = {
  id: CityStructureId;
  name: string;
  icon: string;
  maxLevel: number;
  goldCost: number;
  steelCost: number;
  oilCost: number;
  description: string;
};

export const EMPTY_CITY_STRUCTURES: CityStructureLevels = {
  radar: 0,
  bank: 0,
  recruitment: 0,
  anti_air: 0,
  fortification: 0,
};

export const CITY_STRUCTURES: CityStructureDefinition[] = [
  {
    id: "radar",
    name: "Radar Dizisi",
    icon: "◉",
    maxLevel: 3,
    goldCost: 300,
    steelCost: 20,
    oilCost: 0,
    description:
      "Hava saldırılarının etkinliğini seviye başına %8 azaltır.",
  },
  {
    id: "bank",
    name: "Banka",
    icon: "▦",
    maxLevel: 3,
    goldCost: 700,
    steelCost: 15,
    oilCost: 0,
    description:
      "Şehrin tur başına Altın gelirini seviye başına %15 artırır.",
  },
  {
    id: "recruitment",
    name: "Recruitment Center",
    icon: "●",
    maxLevel: 3,
    goldCost: 1000,
    steelCost: 45,
    oilCost: 0,
    description:
      "Şehrin tur başına asker basma kapasitesini seviye başına +1 artırır.",
  },
  {
    id: "anti_air",
    name: "Uçaksavar Savunması",
    icon: "⌖",
    maxLevel: 3,
    goldCost: 1000,
    steelCost: 80,
    oilCost: 10,
    description:
      "Hava saldırılarına karşı şehir savunmasını seviye başına %30 artırır.",
  },
  {
    id: "fortification",
    name: "Tahkimat",
    icon: "▰",
    maxLevel: 3,
    goldCost: 1400,
    steelCost: 120,
    oilCost: 0,
    description:
      "Tüm saldırılara karşı şehir savunmasını seviye başına %20 artırır.",
  },
];
