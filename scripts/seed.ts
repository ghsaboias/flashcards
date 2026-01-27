import { readFileSync } from "fs";
import { execSync } from "child_process";

const COUNTRIES_PATH = "seeds/data/countries.json";

interface Country {
  name: string;
  code: string;
  capital: string | null;
  flag_png: string;
  languages: { code: string; name: string }[];
  currencies: { code: string; name: string; symbol: string | null }[];
  region: string;
  borders: string[];
}

interface Deck {
  name: string;
  type: string;
  cards: { front: string; back: string }[];
}

function loadCountries(): Country[] {
  const raw = readFileSync(COUNTRIES_PATH, "utf-8");
  return JSON.parse(raw);
}

function buildDecks(countries: Country[]): Deck[] {
  const decks: Deck[] = [];

  // Country → Capital
  decks.push({
    name: "Country → Capital",
    type: "country-capital",
    cards: countries
      .filter((c) => c.capital)
      .map((c) => ({ front: c.name, back: c.capital! })),
  });

  // Flag → Country
  decks.push({
    name: "Flag → Country",
    type: "flag-country",
    cards: countries.map((c) => ({ front: c.flag_png, back: c.name })),
  });

  // Country → Language(s)
  decks.push({
    name: "Country → Language",
    type: "country-language",
    cards: countries
      .filter((c) => c.languages.length > 0)
      .map((c) => ({
        front: c.name,
        back: c.languages.map((l) => l.name).join(", "),
      })),
  });

  // Country → Currency
  decks.push({
    name: "Country → Currency",
    type: "country-currency",
    cards: countries
      .filter((c) => c.currencies.length > 0)
      .map((c) => ({
        front: c.name,
        back: c.currencies.map((cur) => `${cur.name} (${cur.symbol || cur.code})`).join(", "),
      })),
  });

  // Country → Region
  decks.push({
    name: "Country → Region",
    type: "country-region",
    cards: countries.map((c) => ({ front: c.name, back: c.region })),
  });

  return decks;
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function generateSQL(decks: Deck[]): string {
  const statements: string[] = [];

  for (const deck of decks) {
    // Insert deck
    statements.push(
      `INSERT OR IGNORE INTO decks (name, type) VALUES ('${escapeSQL(deck.name)}', '${escapeSQL(deck.type)}');`
    );

    // Insert cards
    for (const card of deck.cards) {
      statements.push(
        `INSERT OR IGNORE INTO cards (deck_id, front, back) ` +
          `SELECT id, '${escapeSQL(card.front)}', '${escapeSQL(card.back)}' ` +
          `FROM decks WHERE type = '${escapeSQL(deck.type)}';`
      );
    }
  }

  return statements.join("\n");
}

function main() {
  const isRemote = process.argv.includes("--remote");
  const location = isRemote ? "remote" : "local";

  console.log(`Loading countries from ${COUNTRIES_PATH}...`);
  const countries = loadCountries();
  console.log(`Loaded ${countries.length} countries`);

  console.log("Building decks...");
  const decks = buildDecks(countries);

  for (const deck of decks) {
    console.log(`  ${deck.name}: ${deck.cards.length} cards`);
  }

  console.log("\nGenerating SQL...");
  const sql = generateSQL(decks);

  // Write to temp file
  const tempFile = "/tmp/flashcards-seed.sql";
  require("fs").writeFileSync(tempFile, sql);

  console.log(`Seeding ${location} database...`);
  const remoteFlag = isRemote ? "--remote" : "--local";

  try {
    execSync(`npx wrangler d1 execute flashcards-db --file=${tempFile} ${remoteFlag}`, {
      stdio: "inherit",
    });
    console.log("\nSeed complete!");
  } catch (err) {
    console.error("Seed failed");
    process.exit(1);
  }
}

main();
