import type { UnitDefinition, UnitStats } from "./unitData";

export type StrategyDefinition = {
  id: string;
  name: string;
  role: string;
  description: string;
  premium?: boolean;
};

export const STRATEGIES: StrategyDefinition[] = [
  {
    id: "balanced",
    name: "Dengeli Doktrin",
    role: "Genel",
    description: "Birimlerin temel değerlerini korur. İlk oyunlar için güvenli ve esnek seçim.",
  },
  {
    id: "rapid_assault",
    name: "Yıldırım Harekâtı",
    role: "Hızlı saldırı",
    description: "Kara ve hava hareketini artırır; hız karşılığında savunma bir miktar düşer.",
  },
  {
    id: "air_shield",
    name: "Hava Kalkanı",
    role: "Hava savunması",
    description: "Hava birliklerinin savunma ve görüşünü güçlendirir; kara saldırısı biraz zayıflar.",
  },
  {
    id: "guerrilla",
    name: "Gerilla Doktrini",
    role: "Piyade / savunma",
    description: "Piyade ve milis savunmasını, kritik etkisini ve şehir savunmasını öne çıkarır.",
  },
  {
    id: "heavy_assault",
    name: "Ağır Taarruz",
    role: "Zırhlı saldırı",
    description: "Tankların saldırı ve kritik gücünü artırır; daha pahalı ve daha ağır bir oyun tarzı yaratır.",
  },
  {
    id: "naval_command",
    name: "Filo Komutanlığı",
    role: "Deniz savaşı",
    description: "Donanmanın saldırı, savunma, hareket ve taşıma kapasitesini iyileştirir.",
  },
  {
    id: "industrial",
    name: "Endüstriyel Seferberlik",
    role: "Üretim",
    description: "Mekanize ve ağır birliklerin maliyetini düşürür; insan gücü odaklı birlikleri biraz pahalılaştırır.",
  },
  {
    id: "logistics",
    name: "Lojistik Ustası",
    role: "Taşıma",
    description: "Nakliye birimlerinin hareket, görüş ve kapasitesini belirgin biçimde artırır.",
  },
  {
    id: "stealth",
    name: "Gizli Operasyon",
    role: "Özel kuvvet",
    description: "Özel kuvvetler ve denizaltılar saldırı, görüş ve hareket avantajı kazanır.",
  },
  {
    id: "fortress",
    name: "Savunma Hattı",
    role: "Savunma",
    description: "Piyade ve ağır kara birlikleri daha dirençli olur; kara hareketi yavaşlar.",
  },
  {
    id: "iron_fist",
    name: "Çelik Yumruk",
    role: "Dayanıklılık",
    description: "Tüm savaş birliklerine ek HP verir; hareket ve görüş alanı azalır.",
  },
  {
    id: "economy",
    name: "Savaş Ekonomisi",
    role: "Ekonomi",
    description: "Birim maliyetlerini düşürür; düşük maliyet karşılığında saldırı gücü bir miktar azalır.",
  },
];

export function strategyById(id: string): StrategyDefinition {
  return STRATEGIES.find((strategy) => strategy.id === id) ?? STRATEGIES[0];
}

function clampStat(value: number, minimum = 0) {
  return Math.max(minimum, Math.round(value));
}

export function applyStrategy(
  unit: UnitDefinition,
  strategyId: string
): UnitDefinition {
  const stats: UnitStats = { ...unit.stats };
  const isInfantry = ["infantry", "militia", "marine"].includes(unit.id);
  const isSpecial = unit.id === "special_forces";
  const isTank = ["light_tank", "heavy_tank"].includes(unit.id);
  const isTransport = ["transport_plane", "support_ship"].includes(unit.id);

  switch (strategyId) {
    case "rapid_assault":
      if (unit.domain !== "naval") stats.movement += 2;
      stats.view += 1;
      if (isTank || unit.domain === "air") stats.attack += 1;
      stats.defense -= 1;
      stats.cost = Math.round(stats.cost * 1.05);
      break;

    case "air_shield":
      if (unit.domain === "air") {
        stats.attack += 1;
        stats.defense += 2;
        stats.view += 4;
      } else if (unit.domain === "land") {
        stats.attack -= 1;
      }
      break;

    case "guerrilla":
      if (isInfantry || isSpecial) {
        stats.defense += 2;
        stats.critical += 2;
        stats.view += 2;
        stats.cost = Math.round(stats.cost * 0.9);
      }
      if (isTank) {
        stats.attack -= 1;
        stats.movement -= 1;
      }
      break;

    case "heavy_assault":
      if (isTank) {
        stats.attack += 2;
        stats.critical += 1;
        stats.hp += 1;
        stats.cost = Math.round(stats.cost * 1.1);
      }
      if (isInfantry) stats.defense -= 1;
      break;

    case "naval_command":
      if (unit.domain === "naval") {
        stats.attack += 2;
        stats.defense += 2;
        stats.movement += 2;
        stats.view += 2;
        stats.capacity += 2;
        stats.cost = Math.round(stats.cost * 0.9);
      } else if (unit.domain === "land") {
        stats.attack -= 1;
      }
      break;

    case "industrial":
      if (isTank || unit.domain === "air" || unit.domain === "naval") {
        stats.cost = Math.round(stats.cost * 0.85);
      } else if (isInfantry || isSpecial) {
        stats.cost = Math.round(stats.cost * 1.1);
      }
      break;

    case "logistics":
      stats.view += 2;
      if (isTransport) {
        stats.movement += 3;
        stats.capacity += 3;
        stats.hp += 2;
        stats.cost = Math.round(stats.cost * 0.85);
      } else if (unit.domain === "air" || unit.domain === "naval") {
        stats.movement += 1;
      }
      break;

    case "stealth":
      if (isSpecial || unit.id === "submarine") {
        stats.attack += 2;
        stats.defense += 1;
        stats.critical += 2;
        stats.movement += 2;
        stats.view += 3;
        stats.cost = Math.round(stats.cost * 0.85);
      }
      break;

    case "fortress":
      if (isInfantry || isTank) {
        stats.defense += 2;
        stats.hp += 1;
        stats.movement -= 1;
      }
      break;

    case "iron_fist":
      stats.hp += 2;
      stats.movement -= 2;
      stats.view -= 4;
      break;

    case "economy":
      stats.cost = Math.round(stats.cost * 0.9);
      stats.attack -= 1;
      break;

    default:
      break;
  }

  stats.attack = clampStat(stats.attack);
  stats.defense = clampStat(stats.defense);
  stats.critical = clampStat(stats.critical);
  stats.hp = clampStat(stats.hp, 1);
  stats.movement = clampStat(stats.movement);
  stats.view = clampStat(stats.view);
  stats.capacity = clampStat(stats.capacity);
  stats.cost = clampStat(stats.cost);
  stats.collateral = clampStat(stats.collateral);

  return {
    ...unit,
    stats,
  };
}
