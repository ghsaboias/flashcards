import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const FIELDS = [
  "name",
  "capital",
  "flags",
  "languages",
  "population",
  "currencies",
  "region",
  "subregion",
  "borders",
  "area",
  "cca3",
].join(",");

// /all requires subscription, use /independent instead
const API_URL = `https://restcountries.com/v3.1/independent?status=true&fields=${FIELDS}`;
const OUTPUT_PATH = "seeds/data/countries.json";

interface ApiCountry {
  name: { common: string; official: string };
  capital?: string[];
  flags: { png: string; svg: string };
  languages?: Record<string, string>;
  population: number;
  currencies?: Record<string, { name: string; symbol?: string }>;
  region: string;
  subregion?: string;
  borders?: string[];
  area: number;
  cca3: string; // 3-letter code for border references
}

interface Country {
  name: string;
  official_name: string;
  code: string;
  capital: string | null;
  flag_png: string;
  flag_svg: string;
  languages: { code: string; name: string }[];
  population: number;
  currencies: { code: string; name: string; symbol: string | null }[];
  region: string;
  subregion: string | null;
  borders: string[]; // country codes
  area_km2: number;
}

async function fetchCountries(): Promise<void> {
  console.log("Fetching from restcountries.com...");

  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data: ApiCountry[] = await response.json();
  console.log(`Fetched ${data.length} countries`);

  const countries: Country[] = data
    .map((c) => ({
      name: c.name.common,
      official_name: c.name.official,
      code: c.cca3,
      capital: c.capital?.[0] ?? null,
      flag_png: c.flags.png,
      flag_svg: c.flags.svg,
      languages: Object.entries(c.languages ?? {}).map(([code, name]) => ({
        code,
        name,
      })),
      population: c.population,
      currencies: Object.entries(c.currencies ?? {}).map(([code, info]) => ({
        code,
        name: info.name,
        symbol: info.symbol ?? null,
      })),
      region: c.region,
      subregion: c.subregion ?? null,
      borders: c.borders ?? [],
      area_km2: c.area,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(countries, null, 2));

  console.log(`Saved ${countries.length} countries to ${OUTPUT_PATH}`);

  // Summary stats
  const withCapital = countries.filter((c) => c.capital).length;
  const withCurrency = countries.filter((c) => c.currencies.length > 0).length;
  const withLanguage = countries.filter((c) => c.languages.length > 0).length;

  console.log(`\nStats:`);
  console.log(`  With capital: ${withCapital}`);
  console.log(`  With currency: ${withCurrency}`);
  console.log(`  With language: ${withLanguage}`);
}

fetchCountries().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
