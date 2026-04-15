export const LIQUIPEDIA_CATEGORIES = [
  { key: "fortnite", name: "Fortnite" },
  { key: "dota2", name: "Dota 2" },
  { key: "counterstrike", name: "Counter-Strike" },
  { key: "valorant", name: "VALORANT" },
  { key: "mobilelegends", name: "Mobile Legends: Bang Bang" },
  { key: "leagueoflegends", name: "League of Legends" },
  { key: "rocketleague", name: "Rocket League" },
  { key: "pubgmobile", name: "PUBG Mobile" },
  { key: "overwatch", name: "Overwatch" },
  { key: "apexlegends", name: "Apex Legends" },
  { key: "fighters", name: "Fighting Games" },
  { key: "starcraft2", name: "StarCraft 2" },
  { key: "pubg", name: "PUBG: Battlegrounds" },
  { key: "honorofkings", name: "Honor of Kings" },
  { key: "ageofempires", name: "Age of Empires" },
  { key: "rainbowsix", name: "Rainbow Six" },
  { key: "brawlstars", name: "Brawl Stars" },
  { key: "marvelrivals", name: "Marvel Rivals" },
  { key: "callofduty", name: "Call of Duty" },
  { key: "smash", name: "Smash" },
  { key: "warcraft", name: "Warcraft" },
  { key: "starcraft", name: "StarCraft" },
  { key: "worldoftanks", name: "World of Tanks" },
  { key: "easportsfc", name: "EA SPORTS FC" },
  { key: "hearthstone", name: "Hearthstone" },
  { key: "wildrift", name: "Wild Rift" },
  { key: "heroes", name: "Heroes of the Storm" },
  { key: "eva", name: "Esports Virtual Arenas" },
  { key: "thefinals", name: "The Finals" },
  { key: "freefire", name: "Free Fire" },
  { key: "identityv", name: "Identity V" },
  { key: "esports", name: "Esports" },
  { key: "tft", name: "Teamfight Tactics" },
  { key: "clashroyale", name: "Clash Royale" },
  { key: "crossfire", name: "CrossFire" },
  { key: "pokemon", name: "Pokémon" },
  { key: "geoguessr", name: "GeoGuessr" },
  { key: "deadlock", name: "Deadlock" },
  { key: "halo", name: "Halo" },
  { key: "trackmania", name: "TrackMania" },
  { key: "clashofclans", name: "Clash of Clans" },
  { key: "osu", name: "osu" },
  { key: "teamfortress", name: "Team Fortress" },
  { key: "tetris", name: "Tetris" },
  { key: "worldofwarcraft", name: "World of Warcraft" },
  { key: "arenafps", name: "Arena FPS" },
  { key: "stormgate", name: "Stormgate" },
  { key: "simracing", name: "Sim Racing" },
  { key: "tarkovarena", name: "Escape from Tarkov: Arena" },
  { key: "warthunder", name: "War Thunder" },
  { key: "naraka", name: "Naraka" },
  { key: "brawlhalla", name: "Brawlhalla" },
  { key: "rematch", name: "Rematch" },
  { key: "splatoon", name: "Splatoon" },
  { key: "wildcard", name: "Wildcard" },
  { key: "goals", name: "GOALS" },
  { key: "chess", name: "Chess" },
  { key: "formula1", name: "Formula 1" },
  { key: "hub", name: "Hub" },
  { key: "lab", name: "Lab" }
];

const byKey = new Map(LIQUIPEDIA_CATEGORIES.map((item) => [item.key, item]));

export function getCategoryByKey(key) {
  return byKey.get(String(key || "").trim().toLowerCase()) || null;
}

export function assertValidCategory(key) {
  const category = getCategoryByKey(key);

  if (!category) {
    const allowed = LIQUIPEDIA_CATEGORIES.map((item) => item.key).join(", ");
    throw new Error(`Invalid category: ${key}. Allowed category keys: ${allowed}`);
  }

  return category;
}
