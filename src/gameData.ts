export type CityNode = {
  code: string;
  countryCode: string;
  name: string;
  lon: number;
  lat: number;
  isCapital: boolean;
  recruitCapacity: number;
  income: number;
  growth: number;
};

export type CountryDefinition = {
  code: string;
  name: string;
  region: string;
  purchasePrice: number;
  primaryResource: "Altın" | "Çelik" | "Petrol";
};

export const COUNTRIES: CountryDefinition[] = [
  { code: "TUR", name: "Türkiye", region: "Avrupa / Orta Doğu", purchasePrice: 2800, primaryResource: "Altın" },
  { code: "DEU", name: "Almanya", region: "Avrupa", purchasePrice: 4500, primaryResource: "Çelik" },
  { code: "FRA", name: "Fransa", region: "Avrupa", purchasePrice: 4200, primaryResource: "Altın" },
  { code: "GBR", name: "Birleşik Krallık", region: "Avrupa", purchasePrice: 4600, primaryResource: "Altın" },
  { code: "ITA", name: "İtalya", region: "Avrupa", purchasePrice: 3400, primaryResource: "Altın" },
  { code: "ESP", name: "İspanya", region: "Avrupa", purchasePrice: 3200, primaryResource: "Altın" },
  { code: "POL", name: "Polonya", region: "Avrupa", purchasePrice: 2600, primaryResource: "Çelik" },
  { code: "USA", name: "ABD", region: "Kuzey Amerika", purchasePrice: 8000, primaryResource: "Petrol" },
  { code: "RUS", name: "Rusya", region: "Avrasya", purchasePrice: 7500, primaryResource: "Petrol" },
  { code: "CHN", name: "Çin", region: "Asya", purchasePrice: 7000, primaryResource: "Çelik" },
  { code: "JPN", name: "Japonya", region: "Asya / Pasifik", purchasePrice: 4200, primaryResource: "Altın" },
  { code: "IND", name: "Hindistan", region: "Güney Asya", purchasePrice: 6000, primaryResource: "Altın" },
  { code: "BRA", name: "Brezilya", region: "Güney Amerika", purchasePrice: 5200, primaryResource: "Altın" },
  { code: "AUS", name: "Avustralya", region: "Okyanusya", purchasePrice: 3800, primaryResource: "Altın" },
];

export const CITIES: CityNode[] = [
  { code:"TUR-ANK",countryCode:"TUR",name:"Ankara",lon:32.86,lat:39.93,isCapital:true,recruitCapacity:3,income:860,growth:72 },
  { code:"TUR-IST",countryCode:"TUR",name:"İstanbul",lon:28.98,lat:41.01,isCapital:false,recruitCapacity:2,income:760,growth:58 },
  { code:"TUR-IZM",countryCode:"TUR",name:"İzmir",lon:27.14,lat:38.42,isCapital:false,recruitCapacity:2,income:520,growth:41 },
  { code:"TUR-KAY",countryCode:"TUR",name:"Kayseri",lon:35.49,lat:38.73,isCapital:false,recruitCapacity:1,income:430,growth:34 },
  { code:"TUR-GAZ",countryCode:"TUR",name:"Gaziantep",lon:37.38,lat:37.07,isCapital:false,recruitCapacity:1,income:460,growth:35 },
  { code:"TUR-SAM",countryCode:"TUR",name:"Samsun",lon:36.33,lat:41.28,isCapital:false,recruitCapacity:1,income:360,growth:22 },

  { code:"DEU-BER",countryCode:"DEU",name:"Berlin",lon:13.40,lat:52.52,isCapital:true,recruitCapacity:3,income:920,growth:70 },
  { code:"DEU-HAM",countryCode:"DEU",name:"Hamburg",lon:9.99,lat:53.55,isCapital:false,recruitCapacity:2,income:690,growth:54 },
  { code:"DEU-MUN",countryCode:"DEU",name:"Münih",lon:11.58,lat:48.14,isCapital:false,recruitCapacity:2,income:750,growth:58 },
  { code:"DEU-FRA",countryCode:"DEU",name:"Frankfurt",lon:8.68,lat:50.11,isCapital:false,recruitCapacity:2,income:720,growth:55 },
  { code:"DEU-CGN",countryCode:"DEU",name:"Köln",lon:6.96,lat:50.94,isCapital:false,recruitCapacity:2,income:650,growth:49 },
  { code:"DEU-LEI",countryCode:"DEU",name:"Leipzig",lon:12.37,lat:51.34,isCapital:false,recruitCapacity:1,income:440,growth:31 },

  { code:"FRA-PAR",countryCode:"FRA",name:"Paris",lon:2.35,lat:48.86,isCapital:true,recruitCapacity:3,income:980,growth:76 },
  { code:"FRA-LYO",countryCode:"FRA",name:"Lyon",lon:4.84,lat:45.76,isCapital:false,recruitCapacity:2,income:620,growth:48 },
  { code:"FRA-MRS",countryCode:"FRA",name:"Marsilya",lon:5.37,lat:43.30,isCapital:false,recruitCapacity:2,income:590,growth:45 },
  { code:"FRA-BDX",countryCode:"FRA",name:"Bordeaux",lon:-0.58,lat:44.84,isCapital:false,recruitCapacity:1,income:430,growth:31 },
  { code:"FRA-LIL",countryCode:"FRA",name:"Lille",lon:3.06,lat:50.63,isCapital:false,recruitCapacity:1,income:410,growth:29 },

  { code:"GBR-LON",countryCode:"GBR",name:"Londra",lon:-0.13,lat:51.51,isCapital:true,recruitCapacity:3,income:970,growth:74 },
  { code:"GBR-MAN",countryCode:"GBR",name:"Manchester",lon:-2.24,lat:53.48,isCapital:false,recruitCapacity:2,income:600,growth:45 },
  { code:"GBR-BIR",countryCode:"GBR",name:"Birmingham",lon:-1.89,lat:52.49,isCapital:false,recruitCapacity:2,income:560,growth:42 },
  { code:"GBR-GLA",countryCode:"GBR",name:"Glasgow",lon:-4.25,lat:55.86,isCapital:false,recruitCapacity:1,income:410,growth:29 },
  { code:"GBR-BEL",countryCode:"GBR",name:"Belfast",lon:-5.93,lat:54.60,isCapital:false,recruitCapacity:1,income:340,growth:24 },

  { code:"ITA-ROM",countryCode:"ITA",name:"Roma",lon:12.50,lat:41.90,isCapital:true,recruitCapacity:3,income:790,growth:61 },
  { code:"ITA-MIL",countryCode:"ITA",name:"Milano",lon:9.19,lat:45.46,isCapital:false,recruitCapacity:2,income:730,growth:55 },
  { code:"ITA-NAP",countryCode:"ITA",name:"Napoli",lon:14.27,lat:40.85,isCapital:false,recruitCapacity:2,income:490,growth:36 },
  { code:"ITA-TUR",countryCode:"ITA",name:"Torino",lon:7.69,lat:45.07,isCapital:false,recruitCapacity:1,income:440,growth:31 },
  { code:"ITA-VEN",countryCode:"ITA",name:"Venedik",lon:12.32,lat:45.44,isCapital:false,recruitCapacity:1,income:390,growth:27 },

  { code:"ESP-MAD",countryCode:"ESP",name:"Madrid",lon:-3.70,lat:40.42,isCapital:true,recruitCapacity:3,income:780,growth:59 },
  { code:"ESP-BCN",countryCode:"ESP",name:"Barcelona",lon:2.17,lat:41.39,isCapital:false,recruitCapacity:2,income:710,growth:54 },
  { code:"ESP-SEV",countryCode:"ESP",name:"Sevilla",lon:-5.98,lat:37.39,isCapital:false,recruitCapacity:1,income:410,growth:29 },
  { code:"ESP-VLC",countryCode:"ESP",name:"Valencia",lon:-0.38,lat:39.47,isCapital:false,recruitCapacity:1,income:420,growth:30 },
  { code:"ESP-BIL",countryCode:"ESP",name:"Bilbao",lon:-2.94,lat:43.26,isCapital:false,recruitCapacity:1,income:390,growth:27 },

  { code:"POL-WAW",countryCode:"POL",name:"Varşova",lon:21.01,lat:52.23,isCapital:true,recruitCapacity:3,income:620,growth:46 },
  { code:"POL-KRK",countryCode:"POL",name:"Kraków",lon:19.94,lat:50.06,isCapital:false,recruitCapacity:2,income:450,growth:32 },
  { code:"POL-GDN",countryCode:"POL",name:"Gdańsk",lon:18.65,lat:54.35,isCapital:false,recruitCapacity:1,income:350,growth:24 },
  { code:"POL-WRO",countryCode:"POL",name:"Wrocław",lon:17.04,lat:51.11,isCapital:false,recruitCapacity:1,income:370,growth:26 },

  { code:"USA-WAS",countryCode:"USA",name:"Washington",lon:-77.04,lat:38.91,isCapital:true,recruitCapacity:3,income:1120,growth:86 },
  { code:"USA-NYC",countryCode:"USA",name:"New York",lon:-74.01,lat:40.71,isCapital:false,recruitCapacity:2,income:1020,growth:80 },
  { code:"USA-CHI",countryCode:"USA",name:"Chicago",lon:-87.63,lat:41.88,isCapital:false,recruitCapacity:2,income:840,growth:64 },
  { code:"USA-DAL",countryCode:"USA",name:"Dallas",lon:-96.80,lat:32.78,isCapital:false,recruitCapacity:2,income:770,growth:58 },
  { code:"USA-LAX",countryCode:"USA",name:"Los Angeles",lon:-118.24,lat:34.05,isCapital:false,recruitCapacity:2,income:910,growth:70 },
  { code:"USA-SEA",countryCode:"USA",name:"Seattle",lon:-122.33,lat:47.61,isCapital:false,recruitCapacity:1,income:610,growth:44 },
  { code:"USA-MIA",countryCode:"USA",name:"Miami",lon:-80.19,lat:25.76,isCapital:false,recruitCapacity:1,income:600,growth:44 },
  { code:"USA-DEN",countryCode:"USA",name:"Denver",lon:-104.99,lat:39.74,isCapital:false,recruitCapacity:1,income:500,growth:35 },

  { code:"RUS-MOW",countryCode:"RUS",name:"Moskova",lon:37.62,lat:55.75,isCapital:true,recruitCapacity:3,income:950,growth:72 },
  { code:"RUS-SPB",countryCode:"RUS",name:"St. Petersburg",lon:30.31,lat:59.94,isCapital:false,recruitCapacity:2,income:650,growth:47 },
  { code:"RUS-ROS",countryCode:"RUS",name:"Rostov",lon:39.72,lat:47.24,isCapital:false,recruitCapacity:2,income:510,growth:36 },
  { code:"RUS-YEK",countryCode:"RUS",name:"Yekaterinburg",lon:60.60,lat:56.84,isCapital:false,recruitCapacity:2,income:540,growth:38 },
  { code:"RUS-NOV",countryCode:"RUS",name:"Novosibirsk",lon:82.92,lat:55.03,isCapital:false,recruitCapacity:2,income:520,growth:36 },
  { code:"RUS-IRK",countryCode:"RUS",name:"Irkutsk",lon:104.30,lat:52.29,isCapital:false,recruitCapacity:1,income:330,growth:22 },
  { code:"RUS-VLA",countryCode:"RUS",name:"Vladivostok",lon:131.89,lat:43.12,isCapital:false,recruitCapacity:2,income:480,growth:34 },
  { code:"RUS-KAZ",countryCode:"RUS",name:"Kazan",lon:49.12,lat:55.79,isCapital:false,recruitCapacity:1,income:390,growth:27 },

  { code:"CHN-BJS",countryCode:"CHN",name:"Pekin",lon:116.41,lat:39.90,isCapital:true,recruitCapacity:3,income:980,growth:76 },
  { code:"CHN-SHA",countryCode:"CHN",name:"Şanghay",lon:121.47,lat:31.23,isCapital:false,recruitCapacity:2,income:970,growth:75 },
  { code:"CHN-GUA",countryCode:"CHN",name:"Guangzhou",lon:113.26,lat:23.13,isCapital:false,recruitCapacity:2,income:790,growth:60 },
  { code:"CHN-CHE",countryCode:"CHN",name:"Chengdu",lon:104.07,lat:30.57,isCapital:false,recruitCapacity:2,income:610,growth:45 },
  { code:"CHN-WUH",countryCode:"CHN",name:"Wuhan",lon:114.31,lat:30.59,isCapital:false,recruitCapacity:1,income:530,growth:38 },
  { code:"CHN-XIA",countryCode:"CHN",name:"Xi'an",lon:108.94,lat:34.34,isCapital:false,recruitCapacity:1,income:470,growth:33 },
  { code:"CHN-SHE",countryCode:"CHN",name:"Shenyang",lon:123.43,lat:41.80,isCapital:false,recruitCapacity:1,income:440,growth:31 },

  { code:"JPN-TYO",countryCode:"JPN",name:"Tokyo",lon:139.69,lat:35.68,isCapital:true,recruitCapacity:3,income:980,growth:75 },
  { code:"JPN-OSA",countryCode:"JPN",name:"Osaka",lon:135.50,lat:34.69,isCapital:false,recruitCapacity:2,income:680,growth:50 },
  { code:"JPN-SAP",countryCode:"JPN",name:"Sapporo",lon:141.35,lat:43.06,isCapital:false,recruitCapacity:1,income:390,growth:27 },
  { code:"JPN-FUK",countryCode:"JPN",name:"Fukuoka",lon:130.40,lat:33.59,isCapital:false,recruitCapacity:1,income:410,growth:29 },

  { code:"IND-DEL",countryCode:"IND",name:"Delhi",lon:77.10,lat:28.70,isCapital:true,recruitCapacity:3,income:780,growth:60 },
  { code:"IND-MUM",countryCode:"IND",name:"Mumbai",lon:72.88,lat:19.08,isCapital:false,recruitCapacity:2,income:760,growth:58 },
  { code:"IND-KOL",countryCode:"IND",name:"Kolkata",lon:88.36,lat:22.57,isCapital:false,recruitCapacity:2,income:590,growth:44 },
  { code:"IND-CHE",countryCode:"IND",name:"Chennai",lon:80.27,lat:13.08,isCapital:false,recruitCapacity:2,income:570,growth:42 },
  { code:"IND-HYD",countryCode:"IND",name:"Hyderabad",lon:78.49,lat:17.39,isCapital:false,recruitCapacity:1,income:480,growth:34 },
  { code:"IND-BLR",countryCode:"IND",name:"Bangalore",lon:77.59,lat:12.97,isCapital:false,recruitCapacity:1,income:540,growth:39 },

  { code:"BRA-BSB",countryCode:"BRA",name:"Brasília",lon:-47.88,lat:-15.79,isCapital:true,recruitCapacity:3,income:650,growth:47 },
  { code:"BRA-SAO",countryCode:"BRA",name:"São Paulo",lon:-46.63,lat:-23.55,isCapital:false,recruitCapacity:2,income:900,growth:70 },
  { code:"BRA-RIO",countryCode:"BRA",name:"Rio",lon:-43.17,lat:-22.91,isCapital:false,recruitCapacity:2,income:690,growth:51 },
  { code:"BRA-REC",countryCode:"BRA",name:"Recife",lon:-34.88,lat:-8.05,isCapital:false,recruitCapacity:1,income:390,growth:27 },
  { code:"BRA-MAN",countryCode:"BRA",name:"Manaus",lon:-60.02,lat:-3.12,isCapital:false,recruitCapacity:1,income:370,growth:25 },
  { code:"BRA-POA",countryCode:"BRA",name:"Porto Alegre",lon:-51.23,lat:-30.03,isCapital:false,recruitCapacity:1,income:410,growth:29 },

  { code:"AUS-CBR",countryCode:"AUS",name:"Canberra",lon:149.13,lat:-35.28,isCapital:true,recruitCapacity:3,income:560,growth:40 },
  { code:"AUS-SYD",countryCode:"AUS",name:"Sydney",lon:151.21,lat:-33.87,isCapital:false,recruitCapacity:2,income:760,growth:57 },
  { code:"AUS-MEL",countryCode:"AUS",name:"Melbourne",lon:144.96,lat:-37.81,isCapital:false,recruitCapacity:2,income:690,growth:51 },
  { code:"AUS-PER",countryCode:"AUS",name:"Perth",lon:115.86,lat:-31.95,isCapital:false,recruitCapacity:1,income:440,growth:31 },
  { code:"AUS-BRI",countryCode:"AUS",name:"Brisbane",lon:153.03,lat:-27.47,isCapital:false,recruitCapacity:1,income:470,growth:33 },
];

export const COUNTRY_BY_CODE = Object.fromEntries(
  COUNTRIES.map((country) => [country.code, country])
) as Record<string, CountryDefinition>;

export function citiesForCountry(code: string) {
  return CITIES.filter((city) => city.countryCode === code);
}
