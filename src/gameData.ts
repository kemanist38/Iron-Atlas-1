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
  { code: "PRT", name: "Portekiz", region: "Avrupa", purchasePrice: 2200, primaryResource: "Altın" },
  { code: "IRL", name: "İrlanda", region: "Avrupa", purchasePrice: 2100, primaryResource: "Altın" },
  { code: "NLD", name: "Hollanda", region: "Avrupa", purchasePrice: 3000, primaryResource: "Altın" },
  { code: "BEL", name: "Belçika", region: "Avrupa", purchasePrice: 2800, primaryResource: "Çelik" },
  { code: "CHE", name: "İsviçre", region: "Avrupa", purchasePrice: 3300, primaryResource: "Altın" },
  { code: "AUT", name: "Avusturya", region: "Avrupa", purchasePrice: 2900, primaryResource: "Çelik" },
  { code: "CZE", name: "Çekya", region: "Avrupa", purchasePrice: 2600, primaryResource: "Çelik" },
  { code: "SVK", name: "Slovakya", region: "Avrupa", purchasePrice: 1900, primaryResource: "Çelik" },
  { code: "HUN", name: "Macaristan", region: "Avrupa", purchasePrice: 2200, primaryResource: "Altın" },
  { code: "ROU", name: "Romanya", region: "Avrupa", purchasePrice: 2400, primaryResource: "Petrol" },
  { code: "BGR", name: "Bulgaristan", region: "Avrupa", purchasePrice: 1800, primaryResource: "Altın" },
  { code: "GRC", name: "Yunanistan", region: "Avrupa", purchasePrice: 2200, primaryResource: "Altın" },
  { code: "DNK", name: "Danimarka", region: "Avrupa", purchasePrice: 2300, primaryResource: "Altın" },
  { code: "NOR", name: "Norveç", region: "Avrupa", purchasePrice: 3200, primaryResource: "Petrol" },
  { code: "SWE", name: "İsveç", region: "Avrupa", purchasePrice: 3400, primaryResource: "Çelik" },
  { code: "FIN", name: "Finlandiya", region: "Avrupa", purchasePrice: 2700, primaryResource: "Çelik" },
  { code: "UKR", name: "Ukrayna", region: "Avrupa", purchasePrice: 3600, primaryResource: "Çelik" },
  { code: "BLR", name: "Belarus", region: "Avrupa", purchasePrice: 2100, primaryResource: "Çelik" },
  { code: "LTU", name: "Litvanya", region: "Avrupa", purchasePrice: 1500, primaryResource: "Altın" },
  { code: "LVA", name: "Letonya", region: "Avrupa", purchasePrice: 1400, primaryResource: "Altın" },
  { code: "EST", name: "Estonya", region: "Avrupa", purchasePrice: 1400, primaryResource: "Altın" },
  { code: "SRB", name: "Sırbistan", region: "Avrupa", purchasePrice: 1800, primaryResource: "Çelik" },
  { code: "HRV", name: "Hırvatistan", region: "Avrupa", purchasePrice: 1700, primaryResource: "Altın" },
  { code: "SVN", name: "Slovenya", region: "Avrupa", purchasePrice: 1400, primaryResource: "Altın" },
  { code: "BIH", name: "Bosna Hersek", region: "Avrupa", purchasePrice: 1400, primaryResource: "Altın" },
  { code: "ALB", name: "Arnavutluk", region: "Avrupa", purchasePrice: 1300, primaryResource: "Altın" },
  { code: "MKD", name: "Kuzey Makedonya", region: "Avrupa", purchasePrice: 1200, primaryResource: "Altın" },
  { code: "MNE", name: "Karadağ", region: "Avrupa", purchasePrice: 1100, primaryResource: "Altın" },
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

  { code:"PRT-LIS",countryCode:"PRT",name:"Lizbon",lon:-9.14,lat:38.72,isCapital:true,recruitCapacity:2,income:520,growth:38 },
  { code:"PRT-POR",countryCode:"PRT",name:"Porto",lon:-8.61,lat:41.15,isCapital:false,recruitCapacity:1,income:360,growth:25 },

  { code:"IRL-DUB",countryCode:"IRL",name:"Dublin",lon:-6.26,lat:53.35,isCapital:true,recruitCapacity:2,income:540,growth:39 },
  { code:"IRL-COR",countryCode:"IRL",name:"Cork",lon:-8.47,lat:51.90,isCapital:false,recruitCapacity:1,income:300,growth:21 },

  { code:"NLD-AMS",countryCode:"NLD",name:"Amsterdam",lon:4.90,lat:52.37,isCapital:true,recruitCapacity:2,income:650,growth:48 },
  { code:"NLD-ROT",countryCode:"NLD",name:"Rotterdam",lon:4.48,lat:51.92,isCapital:false,recruitCapacity:2,income:610,growth:45 },
  { code:"NLD-EIN",countryCode:"NLD",name:"Eindhoven",lon:5.48,lat:51.44,isCapital:false,recruitCapacity:1,income:390,growth:28 },

  { code:"BEL-BRU",countryCode:"BEL",name:"Brüksel",lon:4.35,lat:50.85,isCapital:true,recruitCapacity:2,income:590,growth:43 },
  { code:"BEL-ANT",countryCode:"BEL",name:"Anvers",lon:4.40,lat:51.22,isCapital:false,recruitCapacity:2,income:560,growth:41 },

  { code:"CHE-BER",countryCode:"CHE",name:"Bern",lon:7.45,lat:46.95,isCapital:true,recruitCapacity:2,income:530,growth:38 },
  { code:"CHE-ZUR",countryCode:"CHE",name:"Zürih",lon:8.54,lat:47.38,isCapital:false,recruitCapacity:2,income:680,growth:50 },
  { code:"CHE-GEN",countryCode:"CHE",name:"Cenevre",lon:6.14,lat:46.20,isCapital:false,recruitCapacity:1,income:470,growth:34 },

  { code:"AUT-VIE",countryCode:"AUT",name:"Viyana",lon:16.37,lat:48.21,isCapital:true,recruitCapacity:2,income:610,growth:45 },
  { code:"AUT-GRA",countryCode:"AUT",name:"Graz",lon:15.44,lat:47.07,isCapital:false,recruitCapacity:1,income:350,growth:25 },
  { code:"AUT-LIN",countryCode:"AUT",name:"Linz",lon:14.29,lat:48.31,isCapital:false,recruitCapacity:1,income:340,growth:24 },

  { code:"CZE-PRG",countryCode:"CZE",name:"Prag",lon:14.42,lat:50.08,isCapital:true,recruitCapacity:2,income:590,growth:43 },
  { code:"CZE-BRN",countryCode:"CZE",name:"Brno",lon:16.61,lat:49.20,isCapital:false,recruitCapacity:1,income:370,growth:27 },

  { code:"SVK-BRA",countryCode:"SVK",name:"Bratislava",lon:17.11,lat:48.15,isCapital:true,recruitCapacity:2,income:430,growth:31 },
  { code:"SVK-KOS",countryCode:"SVK",name:"Košice",lon:21.26,lat:48.72,isCapital:false,recruitCapacity:1,income:270,growth:19 },

  { code:"HUN-BUD",countryCode:"HUN",name:"Budapeşte",lon:19.04,lat:47.50,isCapital:true,recruitCapacity:2,income:520,growth:38 },
  { code:"HUN-DEB",countryCode:"HUN",name:"Debrecen",lon:21.63,lat:47.53,isCapital:false,recruitCapacity:1,income:280,growth:20 },

  { code:"ROU-BUH",countryCode:"ROU",name:"Bükreş",lon:26.10,lat:44.43,isCapital:true,recruitCapacity:2,income:560,growth:41 },
  { code:"ROU-CNJ",countryCode:"ROU",name:"Cluj",lon:23.59,lat:46.77,isCapital:false,recruitCapacity:1,income:330,growth:23 },
  { code:"ROU-CON",countryCode:"ROU",name:"Köstence",lon:28.65,lat:44.18,isCapital:false,recruitCapacity:1,income:310,growth:22 },

  { code:"BGR-SOF",countryCode:"BGR",name:"Sofya",lon:23.32,lat:42.70,isCapital:true,recruitCapacity:2,income:430,growth:31 },
  { code:"BGR-VAR",countryCode:"BGR",name:"Varna",lon:27.91,lat:43.21,isCapital:false,recruitCapacity:1,income:290,growth:20 },

  { code:"GRC-ATH",countryCode:"GRC",name:"Atina",lon:23.73,lat:37.98,isCapital:true,recruitCapacity:2,income:520,growth:38 },
  { code:"GRC-THS",countryCode:"GRC",name:"Selanik",lon:22.94,lat:40.64,isCapital:false,recruitCapacity:1,income:340,growth:24 },

  { code:"DNK-CPH",countryCode:"DNK",name:"Kopenhag",lon:12.57,lat:55.68,isCapital:true,recruitCapacity:2,income:550,growth:40 },
  { code:"DNK-AAR",countryCode:"DNK",name:"Aarhus",lon:10.20,lat:56.16,isCapital:false,recruitCapacity:1,income:310,growth:22 },

  { code:"NOR-OSL",countryCode:"NOR",name:"Oslo",lon:10.75,lat:59.91,isCapital:true,recruitCapacity:2,income:610,growth:44 },
  { code:"NOR-BER",countryCode:"NOR",name:"Bergen",lon:5.32,lat:60.39,isCapital:false,recruitCapacity:1,income:360,growth:25 },
  { code:"NOR-TRD",countryCode:"NOR",name:"Trondheim",lon:10.40,lat:63.43,isCapital:false,recruitCapacity:1,income:300,growth:21 },

  { code:"SWE-STO",countryCode:"SWE",name:"Stockholm",lon:18.07,lat:59.33,isCapital:true,recruitCapacity:2,income:640,growth:47 },
  { code:"SWE-GOT",countryCode:"SWE",name:"Göteborg",lon:11.97,lat:57.71,isCapital:false,recruitCapacity:1,income:390,growth:28 },
  { code:"SWE-MAL",countryCode:"SWE",name:"Malmö",lon:13.00,lat:55.60,isCapital:false,recruitCapacity:1,income:350,growth:25 },

  { code:"FIN-HEL",countryCode:"FIN",name:"Helsinki",lon:24.94,lat:60.17,isCapital:true,recruitCapacity:2,income:560,growth:41 },
  { code:"FIN-TAM",countryCode:"FIN",name:"Tampere",lon:23.76,lat:61.50,isCapital:false,recruitCapacity:1,income:320,growth:22 },
  { code:"FIN-TKU",countryCode:"FIN",name:"Turku",lon:22.27,lat:60.45,isCapital:false,recruitCapacity:1,income:300,growth:21 },

  { code:"UKR-KYI",countryCode:"UKR",name:"Kyiv",lon:30.52,lat:50.45,isCapital:true,recruitCapacity:3,income:690,growth:51 },
  { code:"UKR-LVI",countryCode:"UKR",name:"Lviv",lon:24.03,lat:49.84,isCapital:false,recruitCapacity:1,income:360,growth:25 },
  { code:"UKR-ODE",countryCode:"UKR",name:"Odesa",lon:30.72,lat:46.48,isCapital:false,recruitCapacity:2,income:420,growth:30 },
  { code:"UKR-KHA",countryCode:"UKR",name:"Kharkiv",lon:36.23,lat:49.99,isCapital:false,recruitCapacity:2,income:450,growth:32 },

  { code:"BLR-MIN",countryCode:"BLR",name:"Minsk",lon:27.56,lat:53.90,isCapital:true,recruitCapacity:2,income:470,growth:34 },
  { code:"BLR-GOM",countryCode:"BLR",name:"Gomel",lon:30.98,lat:52.44,isCapital:false,recruitCapacity:1,income:260,growth:18 },

  { code:"LTU-VIL",countryCode:"LTU",name:"Vilnius",lon:25.28,lat:54.69,isCapital:true,recruitCapacity:2,income:360,growth:25 },
  { code:"LTU-KAU",countryCode:"LTU",name:"Kaunas",lon:23.90,lat:54.90,isCapital:false,recruitCapacity:1,income:250,growth:17 },

  { code:"LVA-RIG",countryCode:"LVA",name:"Riga",lon:24.11,lat:56.95,isCapital:true,recruitCapacity:2,income:360,growth:25 },
  { code:"LVA-DGP",countryCode:"LVA",name:"Daugavpils",lon:26.54,lat:55.87,isCapital:false,recruitCapacity:1,income:210,growth:14 },

  { code:"EST-TAL",countryCode:"EST",name:"Tallinn",lon:24.75,lat:59.44,isCapital:true,recruitCapacity:2,income:360,growth:25 },
  { code:"EST-TAR",countryCode:"EST",name:"Tartu",lon:26.72,lat:58.38,isCapital:false,recruitCapacity:1,income:220,growth:15 },

  { code:"SRB-BEL",countryCode:"SRB",name:"Belgrad",lon:20.46,lat:44.81,isCapital:true,recruitCapacity:2,income:430,growth:31 },
  { code:"SRB-NIS",countryCode:"SRB",name:"Niş",lon:21.90,lat:43.32,isCapital:false,recruitCapacity:1,income:250,growth:17 },

  { code:"HRV-ZAG",countryCode:"HRV",name:"Zagreb",lon:15.98,lat:45.81,isCapital:true,recruitCapacity:2,income:400,growth:29 },
  { code:"HRV-SPL",countryCode:"HRV",name:"Split",lon:16.44,lat:43.51,isCapital:false,recruitCapacity:1,income:260,growth:18 },

  { code:"SVN-LJU",countryCode:"SVN",name:"Ljubljana",lon:14.51,lat:46.06,isCapital:true,recruitCapacity:2,income:350,growth:25 },
  { code:"SVN-MAR",countryCode:"SVN",name:"Maribor",lon:15.65,lat:46.55,isCapital:false,recruitCapacity:1,income:210,growth:14 },

  { code:"BIH-SAR",countryCode:"BIH",name:"Saraybosna",lon:18.41,lat:43.86,isCapital:true,recruitCapacity:2,income:330,growth:23 },
  { code:"BIH-BAN",countryCode:"BIH",name:"Banja Luka",lon:17.19,lat:44.77,isCapital:false,recruitCapacity:1,income:210,growth:14 },

  { code:"ALB-TIR",countryCode:"ALB",name:"Tiran",lon:19.82,lat:41.33,isCapital:true,recruitCapacity:2,income:310,growth:21 },
  { code:"ALB-DUR",countryCode:"ALB",name:"Dıraç",lon:19.45,lat:41.32,isCapital:false,recruitCapacity:1,income:220,growth:15 },

  { code:"MKD-SKO",countryCode:"MKD",name:"Üsküp",lon:21.43,lat:41.99,isCapital:true,recruitCapacity:2,income:290,growth:20 },
  { code:"MKD-BIT",countryCode:"MKD",name:"Bitola",lon:21.33,lat:41.03,isCapital:false,recruitCapacity:1,income:180,growth:12 },

  { code:"MNE-POD",countryCode:"MNE",name:"Podgorica",lon:19.26,lat:42.43,isCapital:true,recruitCapacity:2,income:260,growth:18 },
  { code:"MNE-BAR",countryCode:"MNE",name:"Bar",lon:19.10,lat:42.09,isCapital:false,recruitCapacity:1,income:180,growth:12 },
];

export const COUNTRY_BY_CODE = Object.fromEntries(
  COUNTRIES.map((country) => [country.code, country])
) as Record<string, CountryDefinition>;

export function citiesForCountry(code: string) {
  return CITIES.filter((city) => city.countryCode === code);
}


export const PORT_CITY_CODES = new Set([
  "TUR-IST",
  "TUR-IZM",
  "TUR-SAM",
  "DEU-HAM",
  "FRA-MRS",
  "FRA-BDX",
  "GBR-LON",
  "GBR-GLA",
  "GBR-BEL",
  "ITA-ROM",
  "ITA-NAP",
  "ITA-VEN",
  "ESP-BCN",
  "ESP-SEV",
  "ESP-VLC",
  "ESP-BIL",
  "POL-GDN",
  "USA-WAS",
  "USA-NYC",
  "USA-LAX",
  "USA-SEA",
  "USA-MIA",
  "RUS-SPB",
  "RUS-ROS",
  "RUS-VLA",
  "CHN-SHA",
  "CHN-GUA",
  "JPN-TYO",
  "JPN-OSA",
  "JPN-SAP",
  "JPN-FUK",
  "IND-MUM",
  "IND-KOL",
  "IND-CHE",
  "BRA-RIO",
  "BRA-REC",
  "BRA-POA",
  "AUS-SYD",
  "AUS-MEL",
  "AUS-PER",
  "AUS-BRI",
  "PRT-LIS",
  "PRT-POR",
  "IRL-DUB",
  "IRL-COR",
  "NLD-AMS",
  "NLD-ROT",
  "BEL-ANT",
  "ROU-CON",
  "BGR-VAR",
  "GRC-ATH",
  "GRC-THS",
  "DNK-CPH",
  "DNK-AAR",
  "NOR-OSL",
  "NOR-BER",
  "NOR-TRD",
  "SWE-STO",
  "SWE-GOT",
  "SWE-MAL",
  "FIN-HEL",
  "FIN-TKU",
  "UKR-ODE",
  "LVA-RIG",
  "EST-TAL",
  "HRV-SPL",
  "ALB-DUR",
  "MNE-BAR",
]);

export function cityHasPort(cityCode: string) {
  return PORT_CITY_CODES.has(cityCode);
}
