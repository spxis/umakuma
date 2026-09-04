import fs from "node:fs/promises";
import path from "node:path";
import {
  geoAlbers,
  geoConicConformal,
  geoConicEqualArea,
  geoConicEquidistant,
  geoPath,
  geoTransverseMercator,
} from "d3-geo";

const CACHED_SOURCE = "/tmp/ne_10m_admin_1.json";
const REMOTE_SOURCE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";
const PRECISION = 2;

function round(value) {
  const factor = 10 ** PRECISION;
  return Math.round(value * factor) / factor;
}

function tidyPath(d) {
  return d.replace(/-?\d+\.?\d*/g, (match) => String(round(Number(match))));
}

function coordinatesOf(geometry) {
  const out = [];
  const walk = (node) => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      out.push(node);
      return;
    }
    for (const child of node) walk(child);
  };
  walk(geometry?.coordinates);
  return out;
}

function neighboursBySharedPoints(features) {
  const keysFor = features.map(
    (f) => new Set(coordinatesOf(f.geometry).map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`)),
  );

  return features.map((_, index) =>
    features
      .map((other, otherIndex) => {
        if (otherIndex === index) return null;
        for (const key of keysFor[otherIndex]) {
          if (keysFor[index].has(key)) return other.properties.__code;
        }
        return null;
      })
      .filter(Boolean)
      .sort(),
  );
}

const COUNTRY_CONFIGS = [
  // Existing baseline
  {
    code: "CA",
    countryName: "Canada",
    divisionTypeName: "Province / territory",
    divisionTypePlural: "Provinces and territories",
    width: 1000,
    height: 720,
    filter: (f) => f.properties.iso_a2 === "CA" || f.properties.admin === "Canada",
    codeFn: (f) => f.properties.postal || f.properties.iso_3166_2?.replace(/^CA-/, ""),
    projection: () => geoConicConformal().parallels([49, 77]).rotate([96, 0]),
    regionFn: (f) => f.properties.region || "Canada",
    divisionType: "province",
    skipMetaWrite: true,
  },

  // First batch of 13
  {
    code: "GB",
    countryName: "United Kingdom",
    divisionTypeName: "Administrative division",
    divisionTypePlural: "Administrative divisions",
    width: 1000,
    height: 1100,
    filter: (f) => f.properties.iso_a2 === "GB",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^GB-/, "") || f.properties.postal || f.properties.adm1_code,
    projection: () => geoTransverseMercator().rotate([2, -54]),
    regionFn: (f) => f.properties.geonunit || f.properties.region || "United Kingdom",
    divisionType: "district",
  },
  {
    code: "FR",
    countryName: "France",
    divisionTypeName: "Department",
    divisionTypePlural: "Departments",
    width: 1000,
    height: 950,
    filter: (f) => f.properties.iso_a2 === "FR" && f.properties.type_en === "Metropolitan department",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^FR-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^FR\./, ""),
    projection: () => geoConicConformal().parallels([44, 49]).rotate([-3, 0]),
    regionFn: (f) => f.properties.region || "Metropolitan France",
    divisionType: "department",
  },
  {
    code: "DE",
    countryName: "Germany",
    divisionTypeName: "State",
    divisionTypePlural: "States",
    width: 1000,
    height: 1100,
    filter: (f) => f.properties.iso_a2 === "DE",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^DE-/, "") || f.properties.postal,
    projection: () => geoConicConformal().parallels([48, 54]).rotate([-10.5, 0]),
    regionFn: (f) => f.properties.region || "Germany",
    divisionType: "state",
  },
  {
    code: "IT",
    countryName: "Italy",
    divisionTypeName: "Province",
    divisionTypePlural: "Provinces",
    width: 1000,
    height: 1150,
    filter: (f) => f.properties.iso_a2 === "IT",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^IT-/, "") || f.properties.code_hasc?.replace(/^IT\./, ""),
    projection: () => geoTransverseMercator().rotate([-12.5, -42]),
    regionFn: (f) => f.properties.region || "Italy",
    divisionType: "province",
  },
  {
    code: "ES",
    countryName: "Spain",
    divisionTypeName: "Province",
    divisionTypePlural: "Provinces",
    width: 1000,
    height: 850,
    filter: (f) => f.properties.iso_a2 === "ES",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^ES-/, "") || f.properties.code_hasc?.replace(/^ES\./, ""),
    projection: () => geoConicConformal().parallels([36, 43]).rotate([3.5, 0]),
    regionFn: (f) => f.properties.region || "Spain",
    divisionType: "province",
  },
  {
    code: "MX",
    countryName: "Mexico",
    divisionTypeName: "State",
    divisionTypePlural: "States",
    width: 1000,
    height: 650,
    filter: (f) => f.properties.iso_a2 === "MX" && Boolean(f.properties.name),
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^MX-/, "") || f.properties.postal,
    projection: () => geoConicConformal().parallels([17.5, 29.5]).rotate([102, 0]),
    regionFn: (f) => f.properties.region || "Mexico",
    divisionType: "state",
  },
  {
    code: "CN",
    countryName: "China",
    divisionTypeName: "Province / municipality",
    divisionTypePlural: "Provinces and municipalities",
    width: 1000,
    height: 750,
    filter: (f) => f.properties.iso_a2 === "CN" && f.properties.name !== "Paracel Islands",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^CN-/, "") || f.properties.postal,
    projection: () => geoAlbers().parallels([25, 47]).rotate([-105, 0]),
    regionFn: (f) => f.properties.region || "China",
    divisionType: "province",
  },
  {
    code: "KR",
    countryName: "South Korea",
    divisionTypeName: "Province / city",
    divisionTypePlural: "Provinces and cities",
    width: 1000,
    height: 1200,
    filter: (f) => f.properties.iso_a2 === "KR",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^KR-/, "") || f.properties.code_hasc?.replace(/^KR\./, ""),
    projection: () => geoTransverseMercator().rotate([-127.5, -36]),
    regionFn: (f) => f.properties.region || "South Korea",
    divisionType: "province",
  },
  {
    code: "AU",
    countryName: "Australia",
    divisionTypeName: "State / territory",
    divisionTypePlural: "States and territories",
    width: 1000,
    height: 800,
    filter: (f) => f.properties.iso_a2 === "AU" && ["State", "Territory"].includes(f.properties.type_en),
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^AU-/, "") || f.properties.postal,
    projection: () => geoConicEqualArea().parallels([-18, -36]).rotate([-134, 0]),
    regionFn: (f) => f.properties.region || "Australia",
    divisionType: "state",
  },
  {
    code: "BR",
    countryName: "Brazil",
    divisionTypeName: "State",
    divisionTypePlural: "States",
    width: 1000,
    height: 1000,
    filter: (f) => f.properties.iso_a2 === "BR",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^BR-/, "") || f.properties.postal,
    projection: () => geoConicEqualArea().parallels([-5, -25]).rotate([52, 0]),
    regionFn: (f) => f.properties.region || "Brazil",
    divisionType: "state",
  },
  {
    code: "VN",
    countryName: "Vietnam",
    divisionTypeName: "Province / municipality",
    divisionTypePlural: "Provinces and municipalities",
    width: 1000,
    height: 1300,
    filter: (f) => f.properties.iso_a2 === "VN",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^VN-/, "") || f.properties.code_hasc?.replace(/^VN\./, ""),
    projection: () => geoTransverseMercator().rotate([-106.5, -16]),
    regionFn: (f) => f.properties.region || "Vietnam",
    divisionType: "province",
  },
  {
    code: "TW",
    countryName: "Taiwan",
    divisionTypeName: "County / city",
    divisionTypePlural: "Counties and cities",
    width: 1000,
    height: 1400,
    filter: (f) => f.properties.iso_a2 === "TW",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^TW-/, "") || f.properties.code_hasc?.replace(/^TW\./, ""),
    projection: () => geoTransverseMercator().rotate([-121, -23.7]),
    regionFn: (f) => f.properties.region || "Taiwan",
    divisionType: "county",
  },
  {
    code: "PH",
    countryName: "Philippines",
    divisionTypeName: "Province",
    divisionTypePlural: "Provinces",
    width: 1000,
    height: 1400,
    filter: (f) => f.properties.iso_a2 === "PH" && f.properties.type_en === "Province",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^PH-/, "") || f.properties.code_hasc?.replace(/^PH\./, ""),
    projection: () => geoTransverseMercator().rotate([-122, -13]),
    regionFn: (f) => f.properties.region || "Philippines",
    divisionType: "province",
  },

  // High-affinity Japanese learner targets & Tier 1 additions
  {
    code: "TH",
    countryName: "Thailand",
    divisionTypeName: "Province",
    divisionTypePlural: "Provinces",
    width: 1000,
    height: 1400,
    filter: (f) => f.properties.iso_a2 === "TH",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^TH-/, "") || f.properties.code_hasc?.replace(/^TH\./, ""),
    projection: () => geoTransverseMercator().rotate([-101, -15]),
    regionFn: (f) => f.properties.region || "Thailand",
    divisionType: "province",
  },
  {
    code: "MY",
    countryName: "Malaysia",
    divisionTypeName: "State / territory",
    divisionTypePlural: "States and federal territories",
    width: 1000,
    height: 500,
    filter: (f) => f.properties.iso_a2 === "MY",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^MY-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^MY\./, ""),
    projection: () => geoConicConformal().parallels([2.5, 6]).rotate([-109, 0]),
    regionFn: (f) => f.properties.region || "Malaysia",
    divisionType: "state",
  },
  {
    code: "NL",
    countryName: "Netherlands",
    divisionTypeName: "Province",
    divisionTypePlural: "Provinces",
    width: 1000,
    height: 1100,
    filter: (f) => f.properties.iso_a2 === "NL" && f.properties.type_en === "Province",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^NL-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^NL\./, ""),
    projection: () => geoTransverseMercator().rotate([-5.3, -52.2]),
    regionFn: (f) => f.properties.region || "Netherlands",
    divisionType: "province",
  },
  {
    code: "RU",
    countryName: "Russia",
    divisionTypeName: "Federal subject",
    divisionTypePlural: "Federal subjects",
    width: 1000,
    height: 600,
    filter: (f) => f.properties.iso_a2 === "RU",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^RU-/, "") || f.properties.code_hasc?.replace(/^RU\./, ""),
    projection: () => geoConicEquidistant().parallels([50, 70]).rotate([-100, 0]),
    regionFn: (f) => f.properties.region || "Russia",
    divisionType: "federal subject",
  },
  {
    code: "NZ",
    countryName: "New Zealand",
    divisionTypeName: "Region",
    divisionTypePlural: "Regions",
    width: 1000,
    height: 1300,
    filter: (f) =>
      (f.properties.iso_a2 === "NZ" || f.properties.adm0_a3 === "NZL") &&
      ["Regional Council", "Unitary Authority", "Special Island Authority"].includes(f.properties.type_en),
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^NZ-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^NZ\./, ""),
    projection: () => geoTransverseMercator().rotate([-173, -41]),
    regionFn: (f) => f.properties.region || "New Zealand",
    divisionType: "region",
  },
  {
    code: "CO",
    countryName: "Colombia",
    divisionTypeName: "Department",
    divisionTypePlural: "Departments",
    width: 1000,
    height: 1200,
    filter: (f) => f.properties.iso_a2 === "CO" && f.properties.name !== "San Andrés y Providencia" && Boolean(f.properties.name),
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^CO-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^CO\./, ""),
    projection: () => geoTransverseMercator().rotate([73, -4]),
    regionFn: (f) => f.properties.region || "Colombia",
    divisionType: "department",
  },
  {
    code: "AR",
    countryName: "Argentina",
    divisionTypeName: "Province",
    divisionTypePlural: "Provinces",
    width: 1000,
    height: 1400,
    filter: (f) => f.properties.iso_a2 === "AR",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^AR-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^AR\./, ""),
    projection: () => geoTransverseMercator().rotate([65, -38]),
    regionFn: (f) => f.properties.region || "Argentina",
    divisionType: "province",
  },
  {
    code: "IE",
    countryName: "Ireland",
    divisionTypeName: "County",
    divisionTypePlural: "Counties",
    width: 1000,
    height: 1100,
    filter: (f) => f.properties.iso_a2 === "IE",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^IE-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^IE\./, ""),
    projection: () => geoTransverseMercator().rotate([8, -53.5]),
    regionFn: (f) => f.properties.region || "Ireland",
    divisionType: "county",
  },
  {
    code: "CH",
    countryName: "Switzerland",
    divisionTypeName: "Canton",
    divisionTypePlural: "Cantons",
    width: 1000,
    height: 650,
    filter: (f) => f.properties.iso_a2 === "CH",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^CH-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^CH\./, ""),
    projection: () => geoConicConformal().parallels([46, 47.5]).rotate([-8.2, 0]),
    regionFn: (f) => f.properties.region || "Switzerland",
    divisionType: "canton",
  },
  {
    code: "AT",
    countryName: "Austria",
    divisionTypeName: "State",
    divisionTypePlural: "States",
    width: 1000,
    height: 600,
    filter: (f) => f.properties.iso_a2 === "AT",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^AT-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^AT\./, ""),
    projection: () => geoConicConformal().parallels([47, 49]).rotate([-13.5, 0]),
    regionFn: (f) => f.properties.region || "Austria",
    divisionType: "state",
  },
  {
    code: "BE",
    countryName: "Belgium",
    divisionTypeName: "Province",
    divisionTypePlural: "Provinces",
    width: 1000,
    height: 900,
    filter: (f) => f.properties.iso_a2 === "BE",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^BE-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^BE\./, ""),
    projection: () => geoTransverseMercator().rotate([-4.5, -50.5]),
    regionFn: (f) => f.properties.region || "Belgium",
    divisionType: "province",
  },
  {
    code: "PL",
    countryName: "Poland",
    divisionTypeName: "Voivodeship",
    divisionTypePlural: "Voivodeships",
    width: 1000,
    height: 900,
    filter: (f) => f.properties.iso_a2 === "PL",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^PL-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^PL\./, ""),
    projection: () => geoConicConformal().parallels([50, 54]).rotate([-19, 0]),
    regionFn: (f) => f.properties.region || "Poland",
    divisionType: "voivodeship",
  },
  {
    code: "SE",
    countryName: "Sweden",
    divisionTypeName: "County",
    divisionTypePlural: "Counties",
    width: 1000,
    height: 1400,
    filter: (f) => f.properties.iso_a2 === "SE",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^SE-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^SE\./, ""),
    projection: () => geoTransverseMercator().rotate([-15, -62]),
    regionFn: (f) => f.properties.region || "Sweden",
    divisionType: "county",
  },
  {
    code: "NO",
    countryName: "Norway",
    divisionTypeName: "County",
    divisionTypePlural: "Counties",
    width: 1000,
    height: 1400,
    filter: (f) => f.properties.iso_a2 === "NO",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^NO-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^NO\./, ""),
    projection: () => geoTransverseMercator().rotate([-15, -65]),
    regionFn: (f) => f.properties.region || "Norway",
    divisionType: "county",
  },
  {
    code: "CL",
    countryName: "Chile",
    divisionTypeName: "Region",
    divisionTypePlural: "Regions",
    width: 1000,
    height: 1600,
    filter: (f) => f.properties.iso_a2 === "CL",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^CL-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^CL\./, ""),
    projection: () => geoTransverseMercator().rotate([71, -38]),
    regionFn: (f) => f.properties.region || "Chile",
    divisionType: "region",
  },
  {
    code: "PE",
    countryName: "Peru",
    divisionTypeName: "Department",
    divisionTypePlural: "Departments",
    width: 1000,
    height: 1300,
    filter: (f) => f.properties.iso_a2 === "PE",
    codeFn: (f) => f.properties.iso_3166_2?.replace(/^PE-/, "") || f.properties.postal || f.properties.code_hasc?.replace(/^PE\./, ""),
    projection: () => geoTransverseMercator().rotate([75, -9]),
    regionFn: (f) => f.properties.region || "Peru",
    divisionType: "department",
  },
];

async function loadDataset() {
  try {
    const raw = await fs.readFile(CACHED_SOURCE, "utf8");
    return JSON.parse(raw);
  } catch {
    console.log(`Fetching from ${REMOTE_SOURCE}...`);
    const resp = await fetch(REMOTE_SOURCE);
    if (!resp.ok) throw new Error(`Could not fetch remote dataset: ${resp.status}`);
    const data = await resp.json();
    await fs.writeFile(CACHED_SOURCE, JSON.stringify(data), "utf8");
    return data;
  }
}

async function buildCountry(config, rawFeatures) {
  const matching = rawFeatures.filter(config.filter);
  if (matching.length === 0) {
    throw new Error(`No matching features found for ${config.code}`);
  }

  // Assign normalized unique codes
  const codeCounts = new Map();
  const featuresWithCodes = matching.map((f) => {
    let code = config.codeFn(f);
    if (!code) {
      code = (f.properties.name_en || f.properties.name || "REG").slice(0, 3).toUpperCase();
    }
    const seen = codeCounts.get(code) || 0;
    codeCounts.set(code, seen + 1);
    if (seen > 0) {
      code = `${code}_${seen + 1}`;
    }
    return {
      ...f,
      properties: {
        ...f.properties,
        __code: code,
      },
    };
  });

  const proj = config.projection().fitSize([config.width, config.height], {
    type: "FeatureCollection",
    features: featuresWithCodes,
  });
  const draw = geoPath(proj);
  const adjacency = neighboursBySharedPoints(featuresWithCodes);

  const regionsMap = [];
  const regionsMeta = [];

  for (let i = 0; i < featuresWithCodes.length; i++) {
    const f = featuresWithCodes[i];
    const props = f.properties;
    const code = props.__code;
    const name = props.name_en || props.name || code;
    const nameNative = props.name_local || props.name || name;

    const d = draw(f);
    if (!d) {
      console.warn(`[${config.code}] No path produced for ${name}`);
      continue;
    }
    const [[minX, minY], [maxX, maxY]] = draw.bounds(f);
    const [cx, cy] = draw.centroid(f);

    const neighbors = adjacency[i];

    regionsMap.push({
      code,
      name,
      path: tidyPath(d),
      bbox: [round(minX), round(minY), round(maxX), round(maxY)],
      centroid: [round(cx), round(cy)],
      neighbors,
    });

    const areaKm2 = props.area_sqkm ? Math.round(props.area_sqkm) : 0;
    const areaSqMi = areaKm2 > 0 ? Math.round(areaKm2 * 0.386102) : 0;
    const capitalName = props.sameascity === 1 ? name : (props.name_alt?.split("|")[0] || name);

    regionsMeta.push({
      code,
      name,
      nameNative,
      type: (props.type_en || props.type || config.divisionType).toLowerCase(),
      capital: capitalName,
      largestCity: name,
      population: 0,
      areaKm2,
      areaSqMi,
      region: config.regionFn(f),
      officialLanguages: [],
      nicknames: [],
      no1Rankings: [],
      famousFor: {
        foods: [],
        landmarks: [],
        specialties: [],
      },
      symbols: {},
      centroid: [round(cx), round(cy)],
      bbox: [round(minX), round(minY), round(maxX), round(maxY)],
      neighbors,
    });
  }

  regionsMap.sort((a, b) => String(a.code).localeCompare(String(b.code)));
  regionsMeta.sort((a, b) => String(a.code).localeCompare(String(b.code)));

  const mapPayload = {
    source: `${REMOTE_SOURCE} (Natural Earth admin-1), fitted to ${config.width}x${config.height}`,
    country: config.code,
    countryName: config.countryName,
    divisionTypeName: config.divisionTypeName,
    viewBox: `0 0 ${config.width} ${config.height}`,
    width: config.width,
    height: config.height,
    totalRegions: regionsMap.length,
    regions: regionsMap,
  };

  const targetDir = path.resolve("src/data/maps");
  await fs.mkdir(targetDir, { recursive: true });

  const mapFile = path.join(targetDir, `${config.code.toLowerCase()}-map.json`);
  const metaFile = path.join(targetDir, `${config.code.toLowerCase()}-meta.json`);

  await fs.writeFile(mapFile, JSON.stringify(mapPayload, null, 2) + "\n", "utf8");

  if (config.skipMetaWrite) {
    console.log(`[${config.code}] ${config.countryName}: updated map paths -> ${mapFile} (meta preserved)`);
    return;
  }

  const metaPayload = {
    updatedAt: new Date().toISOString(),
    standard: "Natural Earth admin-1 vector dataset",
    country: config.code,
    countryName: config.countryName,
    divisionTypeName: config.divisionTypeName,
    divisionTypePlural: config.divisionTypePlural,
    totalRegions: regionsMeta.length,
    regions: regionsMeta,
  };

  await fs.writeFile(metaFile, JSON.stringify(metaPayload, null, 2) + "\n", "utf8");
  console.log(`[${config.code}] ${config.countryName}: generated ${regionsMap.length} divisions -> ${mapFile} & ${metaFile}`);
}

async function main() {
  console.log(`Starting Natural Earth generation for ${COUNTRY_CONFIGS.length} countries...`);
  const data = await loadDataset();
  for (const cfg of COUNTRY_CONFIGS) {
    await buildCountry(cfg, data.features);
  }
  console.log(`All ${COUNTRY_CONFIGS.length} country datasets generated successfully!`);
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exitCode = 1;
});
