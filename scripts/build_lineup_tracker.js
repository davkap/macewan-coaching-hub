// ⚠️ OUT OF DATE: do not use without --force.
// lineup-tracker.html (the MacEwan Database) has been edited by hand since
// this script last generated it. Most importantly it now reads Shot Tracker
// reports (/.netlify/functions/list-reports), which this script does not
// know about. Running it would overwrite the page and silently break the
// Shot Tracker -> Database connection. Edit lineup-tracker.html directly.
if (!process.argv.includes('--force')) {
  console.error('build_lineup_tracker.js is out of date and would overwrite lineup-tracker.html. Edit lineup-tracker.html directly (or pass --force if you really mean it).');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Player database with USports experience definitions
// Years 3, 4, 5 = Experienced (USports Veterans)
// Years 1, 2 = Developing / Rookies
const PLAYER_EXPERIENCE = {
  "Elisha Ampofo": { year: 5, exp: true, short: "El", pos: "G", num: "4" },
  "Favour Igbinyemi": { year: 5, exp: true, short: "Fav", pos: "F", num: "11" },
  "Dele Osuma": { year: 4, exp: true, short: "Dele", pos: "W", num: "8" },
  "Owen Hickey": { year: 3, exp: true, short: "Owen", pos: "G", num: "0" },
  "Jojo Muyo": { year: 3, exp: true, short: "JoJo", pos: "G", num: "1" },
  "Joel Seke": { year: 3, exp: true, short: "Joel", pos: "W", num: "3" },
  "Diego Presingular": { year: 3, exp: true, short: "Diego", pos: "G", num: "5" },
  "Judson Weir": { year: 3, exp: true, short: "Jud", pos: "W", num: "7" },
  "Ryan Ziolkowski": { year: 3, exp: true, short: "Ryan", pos: "F", num: "9" },
  "Freddy Kapinga": { year: 3, exp: true, short: "Freddy", pos: "G", num: "18" },
  "Khushal Shukla": { year: 2, exp: false, short: "Khush", pos: "G", num: "2" },
  "Noah Simon": { year: 2, exp: false, short: "Noah", pos: "F", num: "6" },
  "Wol Wol": { year: 2, exp: false, short: "Wol", pos: "F", num: "10" },
  "David Wilmes": { year: 2, exp: false, short: "David", pos: "F", num: "14" },
  "Peter-Aluk Deng": { year: 2, exp: false, short: "Peter", pos: "G", num: "17" },
  "Abdi Musse": { year: 1, exp: false, short: "Abdi", pos: "G", num: "12" },
  "Nathan Lefevre": { year: 1, exp: false, short: "Nathan", pos: "G", num: "13" },
  "Otis Onink": { year: 1, exp: false, short: "Otis", pos: "F", num: "15" }
};

// Raw Game 1 Stint Data: MacEwan vs Lethbridge Pronghorns (Oct 8, 2026)
const game1Stints = [
  // Page 1
  { id: 1, page: 1, players: ["Diego Presingular", "Elisha Ampofo", "Judson Weir", "Wol Wol", "Ryan Ziolkowski"], shortNames: ["Diego", "El", "Jud", "Wol", "Ryan"], seq: "+1", vals: [1] },
  { id: 2, page: 1, players: ["Jojo Muyo", "Elisha Ampofo", "Abdi Musse", "Ryan Ziolkowski", "Favour Igbinyemi"], shortNames: ["JoJo", "El", "Abdi", "Ryan", "Favour"], seq: "+2, 0, -2", vals: [2, 0, -2] },
  { id: 3, page: 1, players: ["Jojo Muyo", "Abdi Musse", "Nathan Lefevre", "Noah Simon", "Favour Igbinyemi"], shortNames: ["JoJo", "Abdi", "Nathan", "Noah", "Favour"], seq: "-2, 0, -2", vals: [-2, 0, -2] },
  { id: 4, page: 1, players: ["Nathan Lefevre", "Abdi Musse", "Noah Simon", "Favour Igbinyemi", "Khushal Shukla"], shortNames: ["Nathan", "Abdi", "Noah", "Favor", "Khush"], seq: "+2, -2, -2", vals: [2, -2, -2] },
  { id: 5, page: 1, players: ["Nathan Lefevre", "Khushal Shukla", "Abdi Musse", "Noah Simon", "Ryan Ziolkowski"], shortNames: ["Nathan", "Khush", "Abdi", "Noah", "Ryan"], seq: "+2", vals: [2] },
  { id: 6, page: 1, players: ["Nathan Lefevre", "Khushal Shukla", "Dele Osuma", "Noah Simon", "Ryan Ziolkowski"], shortNames: ["Nathan", "Khush", "Dele", "Noah", "Ryan"], seq: "0", vals: [0] },
  { id: 7, page: 1, players: ["Elisha Ampofo", "Khushal Shukla", "Dele Osuma", "Judson Weir", "Ryan Ziolkowski"], shortNames: ["El", "Khush", "Dele", "Jud", "Ryan"], seq: "+2, +4, +2", vals: [2, 4, 2] },
  { id: 8, page: 1, players: ["Diego Presingular", "Dele Osuma", "Judson Weir", "Wol Wol", "Ryan Ziolkowski"], shortNames: ["Diego", "Dele", "Jud", "Wol", "Ryan"], seq: "-2, +1", vals: [-2, 1] },
  { id: 9, page: 1, players: ["Elisha Ampofo", "Diego Presingular", "Dele Osuma", "Judson Weir", "Wol Wol"], shortNames: ["El", "Diego", "Dele", "Jud", "Wol"], seq: "-3", vals: [-3] },
  { id: 10, page: 1, players: ["Elisha Ampofo", "Diego Presingular", "Judson Weir", "Wol Wol", "Favour Igbinyemi"], shortNames: ["El", "Diego", "Jud", "Wol", "Favor"], seq: "+1, -3, +2", vals: [1, -3, 2] },
  { id: 11, page: 1, players: ["Jojo Muyo", "Elisha Ampofo", "Wol Wol", "Judson Weir", "Favour Igbinyemi"], shortNames: ["JoJo", "El", "Wol", "Jud", "Fav"], seq: "-2, 0", vals: [-2, 0] },
  { id: 12, page: 1, players: ["Jojo Muyo", "Elisha Ampofo", "Wol Wol", "Noah Simon", "Ryan Ziolkowski"], shortNames: ["JoJo", "El", "Wol", "Noah", "Ryan"], seq: "0", vals: [0] },
  { id: 13, page: 1, players: ["Jojo Muyo", "Abdi Musse", "Wol Wol", "Noah Simon", "Ryan Ziolkowski"], shortNames: ["JoJo", "Abdi", "Wol", "Noah", "Ryan"], seq: "-2, +1", vals: [-2, 1] },
  { id: 14, page: 1, players: ["Jojo Muyo", "Abdi Musse", "Khushal Shukla", "Noah Simon", "Ryan Ziolkowski"], shortNames: ["JoJo", "Abdi", "Khush", "Noah", "Ryan"], seq: "-2", vals: [-2] },
  { id: 15, page: 1, players: ["Nathan Lefevre", "Khushal Shukla", "Abdi Musse", "Noah Simon", "Ryan Ziolkowski"], shortNames: ["Nathan", "Khush", "Abdi", "Noah", "Ryan"], seq: "-2", vals: [-2] },
  { id: 16, page: 1, players: ["Abdi Musse", "Dele Osuma", "Nathan Lefevre", "Khushal Shukla", "Ryan Ziolkowski"], shortNames: ["Abdi", "Dele", "Nathan", "Khush", "Ryan"], seq: "-3", vals: [-3] },
  { id: 17, page: 1, players: ["Diego Presingular", "Khushal Shukla", "Nathan Lefevre", "Dele Osuma", "Ryan Ziolkowski"], shortNames: ["Diego", "Khush", "Nathan", "Dele", "Ryan"], seq: "0", vals: [0] },

  // Page 2
  { id: 18, page: 2, players: ["Elisha Ampofo", "Diego Presingular", "Khushal Shukla", "Dele Osuma", "Favour Igbinyemi"], shortNames: ["El", "Diego", "Khush", "Dele", "Favour"], seq: "+2, -3", vals: [2, -3] },
  { id: 19, page: 2, players: ["Khushal Shukla", "Diego Presingular", "Elisha Ampofo", "Wol Wol", "Favour Igbinyemi"], shortNames: ["Khush", "Diego", "El", "Wol", "Favour"], seq: "-2", vals: [-2] },
  { id: 20, page: 2, players: ["Elisha Ampofo", "Diego Presingular", "Judson Weir", "Wol Wol", "Favour Igbinyemi"], shortNames: ["El", "Diego", "Jud", "Wol", "Favour"], seq: "-3, -1", vals: [-3, -1] },
  { id: 21, page: 2, players: ["Elisha Ampofo", "Diego Presingular", "Judson Weir", "Wol Wol", "Favour Igbinyemi"], shortNames: ["El", "Diego", "Jud", "Wol", "Favour"], seq: "-2, 0, +3", vals: [-2, 0, 3] },
  { id: 22, page: 2, players: ["Elisha Ampofo", "Diego Presingular", "Noah Simon", "Judson Weir", "Favour Igbinyemi"], shortNames: ["El", "Diego", "Noah", "Jud", "Favour"], seq: "0", vals: [0] },
  { id: 23, page: 2, players: ["Elisha Ampofo", "Jojo Muyo", "Judson Weir", "Noah Simon", "Ryan Ziolkowski"], shortNames: ["El", "JoJo", "Jud", "Noah", "Ryan"], seq: "+3, +1, -5", vals: [3, 1, -5] },
  { id: 24, page: 2, players: ["Khushal Shukla", "Dele Osuma", "Noah Simon", "Judson Weir", "Ryan Ziolkowski"], shortNames: ["Khush", "Dele", "Noah", "Jud", "Ryan"], seq: "+2", vals: [2] },
  { id: 25, page: 2, players: ["Elisha Ampofo", "Khushal Shukla", "Judson Weir", "Wol Wol", "Abdi Musse"], shortNames: ["El", "Khush", "Jud", "Wol", "Abdi"], seq: "+2, 0, +2, 0, -3, +2, 0, +2, -7", vals: [2, 0, 2, 0, -3, 2, 0, 2, -7] }
];

const INITIAL_GAMES_DATA = [
  {
    gameId: "game_20261008_lethbridge",
    opponent: "Lethbridge Pronghorns",
    date: "2026-10-08",
    gameType: "Exhibition Game",
    location: "Home (MacEwan Gym)",
    stints: game1Stints
  }
];

// Seed Tactical Offense Events for Game 1 (Lethbridge Pronghorns)
const SEED_OFFENSE_EVENTS = [
  { id: "off_seed_1", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "09:42", activeLineup: ["Diego Presingular", "Elisha Ampofo", "Judson Weir", "Wol Wol", "Ryan Ziolkowski"], playerId: "p4", playerName: "Elisha Ampofo", playTrigger: "PnR", shotZone: "R", isContested: false, outcome: "open_make", points: 2, notationSymbol: "(R)" },
  { id: "off_seed_2", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "08:50", activeLineup: ["Diego Presingular", "Elisha Ampofo", "Judson Weir", "Wol Wol", "Ryan Ziolkowski"], playerId: "p9", playerName: "Ryan Ziolkowski", playTrigger: "OBS", shotZone: "C", isContested: false, outcome: "open_make", points: 3, notationSymbol: "(C)" },
  { id: "off_seed_3", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "07:35", activeLineup: ["Jojo Muyo", "Elisha Ampofo", "Abdi Musse", "Ryan Ziolkowski", "Favour Igbinyemi"], playerId: "p1", playerName: "Jojo Muyo", playTrigger: "Cut", shotZone: "P", isContested: true, outcome: "contested_make", points: 2, notationSymbol: "<u>(P)</u>" },
  { id: "off_seed_4", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "06:12", activeLineup: ["Jojo Muyo", "Abdi Musse", "Nathan Lefevre", "Noah Simon", "Favour Igbinyemi"], playerId: "p12", playerName: "Abdi Musse", playTrigger: "Tran", shotZone: "R", isContested: true, outcome: "foul_made_ft", points: 2, notationSymbol: "[R/2]" },
  { id: "off_seed_5", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "04:45", activeLineup: ["Nathan Lefevre", "Khushal Shukla", "Abdi Musse", "Noah Simon", "Ryan Ziolkowski"], playerId: "p2", playerName: "Khushal Shukla", playTrigger: "PnR", shotZone: "D", isContested: false, outcome: "open_make", points: 3, notationSymbol: "(D)" },
  { id: "off_seed_6", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "03:10", activeLineup: ["Nathan Lefevre", "Khushal Shukla", "Dele Osuma", "Noah Simon", "Ryan Ziolkowski"], playerId: "p8", playerName: "Dele Osuma", playTrigger: "Iso", shotZone: "J", isContested: true, outcome: "contested_miss", points: 0, notationSymbol: "<u>J</u>" },
  { id: "off_seed_7", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "01:25", activeLineup: ["Elisha Ampofo", "Khushal Shukla", "Dele Osuma", "Judson Weir", "Ryan Ziolkowski"], playerId: "p4", playerName: "Elisha Ampofo", playTrigger: "PnR", shotZone: "R", isContested: true, outcome: "and_1", points: 3, notationSymbol: "▲(R)" },
  { id: "off_seed_8", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q2", gameClock: "09:15", activeLineup: ["Elisha Ampofo", "Khushal Shukla", "Dele Osuma", "Judson Weir", "Ryan Ziolkowski"], playerId: "p7", playerName: "Judson Weir", playTrigger: "OBS", shotZone: "C", isContested: false, outcome: "open_make", points: 3, notationSymbol: "(C)" },
  { id: "off_seed_9", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q2", gameClock: "07:40", activeLineup: ["Diego Presingular", "Dele Osuma", "Judson Weir", "Wol Wol", "Ryan Ziolkowski"], playerId: "p5", playerName: "Diego Presingular", playTrigger: "C/O", shotZone: "P", isContested: true, outcome: "contested_make", points: 2, notationSymbol: "<u>(P)</u>" },
  { id: "off_seed_10", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q2", gameClock: "05:55", activeLineup: ["Elisha Ampofo", "Diego Presingular", "Judson Weir", "Wol Wol", "Favour Igbinyemi"], playerId: "p10", playerName: "Wol Wol", playTrigger: "OR", shotZone: "R", isContested: false, outcome: "open_make", points: 2, notationSymbol: "(R)" },
  { id: "off_seed_11", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q2", gameClock: "04:10", activeLineup: ["Jojo Muyo", "Elisha Ampofo", "Wol Wol", "Judson Weir", "Favour Igbinyemi"], playerId: "p11", playerName: "Favour Igbinyemi", playTrigger: "Cut", shotZone: "R", isContested: true, outcome: "foul_no_ft", points: 0, notationSymbol: "[R]" },
  { id: "off_seed_12", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q2", gameClock: "02:05", activeLineup: ["Jojo Muyo", "Abdi Musse", "Wol Wol", "Noah Simon", "Ryan Ziolkowski"], playerId: "p6", playerName: "Noah Simon", playTrigger: "OBS", shotZone: "C", isContested: true, outcome: "contested_miss", points: 0, notationSymbol: "<u>C</u>" },
  { id: "off_seed_13", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q3", gameClock: "08:50", activeLineup: ["Diego Presingular", "Khushal Shukla", "Nathan Lefevre", "Dele Osuma", "Ryan Ziolkowski"], playerId: "p13", playerName: "Nathan Lefevre", playTrigger: "Tran", shotZone: "TO", isContested: false, outcome: "turnover", points: 0, notationSymbol: "TO" },
  { id: "off_seed_14", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q3", gameClock: "07:15", activeLineup: ["Elisha Ampofo", "Diego Presingular", "Khushal Shukla", "Dele Osuma", "Favour Igbinyemi"], playerId: "p2", playerName: "Khushal Shukla", playTrigger: "PnR", shotZone: "D", isContested: true, outcome: "contested_make", points: 3, notationSymbol: "<u>(D)</u>" },
  { id: "off_seed_15", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q3", gameClock: "05:30", activeLineup: ["Elisha Ampofo", "Diego Presingular", "Judson Weir", "Wol Wol", "Favour Igbinyemi"], playerId: "p4", playerName: "Elisha Ampofo", playTrigger: "Iso", shotZone: "P", isContested: false, outcome: "open_make", points: 2, notationSymbol: "(P)" },
  { id: "off_seed_16", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q3", gameClock: "03:40", activeLineup: ["Elisha Ampofo", "Jojo Muyo", "Judson Weir", "Noah Simon", "Ryan Ziolkowski"], playerId: "p9", playerName: "Ryan Ziolkowski", playTrigger: "PnR", shotZone: "R", isContested: false, outcome: "open_make", points: 2, notationSymbol: "(R)" },
  { id: "off_seed_17", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q4", gameClock: "08:20", activeLineup: ["Khushal Shukla", "Dele Osuma", "Noah Simon", "Judson Weir", "Ryan Ziolkowski"], playerId: "p8", playerName: "Dele Osuma", playTrigger: "Cut", shotZone: "R", isContested: true, outcome: "contested_make", points: 2, notationSymbol: "<u>(R)</u>" },
  { id: "off_seed_18", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q4", gameClock: "06:45", activeLineup: ["Elisha Ampofo", "Khushal Shukla", "Judson Weir", "Wol Wol", "Abdi Musse"], playerId: "p7", playerName: "Judson Weir", playTrigger: "OBS", shotZone: "C", isContested: false, outcome: "open_make", points: 3, notationSymbol: "(C)" },
  { id: "off_seed_19", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q4", gameClock: "04:10", activeLineup: ["Elisha Ampofo", "Khushal Shukla", "Judson Weir", "Wol Wol", "Abdi Musse"], playerId: "p12", playerName: "Abdi Musse", playTrigger: "PnR", shotZone: "P", isContested: true, outcome: "contested_miss", points: 0, notationSymbol: "<u>P</u>" },
  { id: "off_seed_20", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q4", gameClock: "01:50", activeLineup: ["Elisha Ampofo", "Khushal Shukla", "Judson Weir", "Wol Wol", "Abdi Musse"], playerId: "p4", playerName: "Elisha Ampofo", playTrigger: "Tran", shotZone: "R", isContested: false, outcome: "open_make", points: 2, notationSymbol: "(R)" }
];

// Seed Tactical Defense Events for Game 1 (Lethbridge Pronghorns)
const SEED_DEFENSE_EVENTS = [
  { id: "def_seed_1", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "09:20", activeLineup: ["Diego Presingular", "Elisha Ampofo", "Judson Weir", "Wol Wol", "Ryan Ziolkowski"], defenderId: "p9", defenderName: "Ryan Ziolkowski", opponentTrigger: "PnR", shotZone: "R", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>R</u>" },
  { id: "def_seed_2", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "08:15", activeLineup: ["Diego Presingular", "Elisha Ampofo", "Judson Weir", "Wol Wol", "Ryan Ziolkowski"], defenderId: "p4", defenderName: "Elisha Ampofo", opponentTrigger: "Iso", shotZone: "D", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>D</u>" },
  { id: "def_seed_3", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "07:05", activeLineup: ["Jojo Muyo", "Elisha Ampofo", "Abdi Musse", "Ryan Ziolkowski", "Favour Igbinyemi"], defenderId: "p11", defenderName: "Favour Igbinyemi", opponentTrigger: "Cut", shotZone: "P", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>P</u>" },
  { id: "def_seed_4", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "05:40", activeLineup: ["Jojo Muyo", "Abdi Musse", "Nathan Lefevre", "Noah Simon", "Favour Igbinyemi"], defenderId: "p12", defenderName: "Abdi Musse", opponentTrigger: "Tran", shotZone: "R", isContested: false, outcome: "opp_open_make", pointsAllowed: 2, notationSymbol: "(R)" },
  { id: "def_seed_5", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "04:10", activeLineup: ["Nathan Lefevre", "Khushal Shukla", "Abdi Musse", "Noah Simon", "Ryan Ziolkowski"], defenderId: "p2", defenderName: "Khushal Shukla", opponentTrigger: "PnR", shotZone: "TO", isContested: true, outcome: "forced_to", pointsAllowed: 0, notationSymbol: "TO" },
  { id: "def_seed_6", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "02:45", activeLineup: ["Nathan Lefevre", "Khushal Shukla", "Dele Osuma", "Noah Simon", "Ryan Ziolkowski"], defenderId: "p8", defenderName: "Dele Osuma", opponentTrigger: "OBS", shotZone: "C", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>C</u>" },
  { id: "def_seed_7", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q1", gameClock: "00:50", activeLineup: ["Elisha Ampofo", "Khushal Shukla", "Dele Osuma", "Judson Weir", "Ryan Ziolkowski"], defenderId: "p7", defenderName: "Judson Weir", opponentTrigger: "Cut", shotZone: "R", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>R</u>" },
  { id: "def_seed_8", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q2", gameClock: "08:40", activeLineup: ["Elisha Ampofo", "Khushal Shukla", "Dele Osuma", "Judson Weir", "Ryan Ziolkowski"], defenderId: "p9", defenderName: "Ryan Ziolkowski", opponentTrigger: "PnR", shotZone: "P", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>P</u>" },
  { id: "def_seed_9", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q2", gameClock: "07:10", activeLineup: ["Diego Presingular", "Dele Osuma", "Judson Weir", "Wol Wol", "Ryan Ziolkowski"], defenderId: "p5", defenderName: "Diego Presingular", opponentTrigger: "C/O", shotZone: "J", isContested: false, outcome: "stop_open_miss", pointsAllowed: 0, notationSymbol: "J" },
  { id: "def_seed_10", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q2", gameClock: "05:25", activeLineup: ["Elisha Ampofo", "Diego Presingular", "Judson Weir", "Wol Wol", "Favour Igbinyemi"], defenderId: "p10", defenderName: "Wol Wol", opponentTrigger: "PnR", shotZone: "R", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>R</u>" },
  { id: "def_seed_11", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q2", gameClock: "03:40", activeLineup: ["Jojo Muyo", "Elisha Ampofo", "Wol Wol", "Judson Weir", "Favour Igbinyemi"], defenderId: "p1", defenderName: "Jojo Muyo", opponentTrigger: "Tran", shotZone: "C", isContested: false, outcome: "opp_open_make", pointsAllowed: 3, notationSymbol: "(C)" },
  { id: "def_seed_12", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q2", gameClock: "01:30", activeLineup: ["Jojo Muyo", "Abdi Musse", "Wol Wol", "Noah Simon", "Ryan Ziolkowski"], defenderId: "p6", defenderName: "Noah Simon", opponentTrigger: "Iso", shotZone: "P", isContested: true, outcome: "foul_committed_fts", pointsAllowed: 2, notationSymbol: "[P/2]" },
  { id: "def_seed_13", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q3", gameClock: "08:15", activeLineup: ["Diego Presingular", "Khushal Shukla", "Nathan Lefevre", "Dele Osuma", "Ryan Ziolkowski"], defenderId: "p13", defenderName: "Nathan Lefevre", opponentTrigger: "OBS", shotZone: "C", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>C</u>" },
  { id: "def_seed_14", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q3", gameClock: "06:30", activeLineup: ["Elisha Ampofo", "Diego Presingular", "Khushal Shukla", "Dele Osuma", "Favour Igbinyemi"], defenderId: "p4", defenderName: "Elisha Ampofo", opponentTrigger: "PnR", shotZone: "R", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>R</u>" },
  { id: "def_seed_15", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q3", gameClock: "04:50", activeLineup: ["Elisha Ampofo", "Diego Presingular", "Judson Weir", "Wol Wol", "Favour Igbinyemi"], defenderId: "p11", defenderName: "Favour Igbinyemi", opponentTrigger: "Cut", shotZone: "R", isContested: true, outcome: "opp_contested_make", pointsAllowed: 2, notationSymbol: "<u>(R)</u>" },
  { id: "def_seed_16", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q3", gameClock: "02:15", activeLineup: ["Elisha Ampofo", "Jojo Muyo", "Judson Weir", "Noah Simon", "Ryan Ziolkowski"], defenderId: "p9", defenderName: "Ryan Ziolkowski", opponentTrigger: "PnR", shotZone: "TO", isContested: true, outcome: "forced_to", pointsAllowed: 0, notationSymbol: "TO" },
  { id: "def_seed_17", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q4", gameClock: "07:55", activeLineup: ["Khushal Shukla", "Dele Osuma", "Noah Simon", "Judson Weir", "Ryan Ziolkowski"], defenderId: "p8", defenderName: "Dele Osuma", opponentTrigger: "Tran", shotZone: "R", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>R</u>" },
  { id: "def_seed_18", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q4", gameClock: "05:40", activeLineup: ["Elisha Ampofo", "Khushal Shukla", "Judson Weir", "Wol Wol", "Abdi Musse"], defenderId: "p7", defenderName: "Judson Weir", opponentTrigger: "OBS", shotZone: "C", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>C</u>" },
  { id: "def_seed_19", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q4", gameClock: "03:20", activeLineup: ["Elisha Ampofo", "Khushal Shukla", "Judson Weir", "Wol Wol", "Abdi Musse"], defenderId: "p10", defenderName: "Wol Wol", opponentTrigger: "Cut", shotZone: "R", isContested: true, outcome: "stop_contested_miss", pointsAllowed: 0, notationSymbol: "<u>R</u>" },
  { id: "def_seed_20", gameId: "game_20261008_lethbridge", opponent: "Lethbridge Pronghorns", date: "2026-10-08", quarter: "Q4", gameClock: "01:05", activeLineup: ["Elisha Ampofo", "Khushal Shukla", "Judson Weir", "Wol Wol", "Abdi Musse"], defenderId: "p4", defenderName: "Elisha Ampofo", opponentTrigger: "Iso", shotZone: "D", isContested: true, outcome: "opp_contested_make", pointsAllowed: 3, notationSymbol: "<u>(D)</u>" }
];

const htmlContent = `<!doctype html>
<html lang="en">
<head>
  <script src="auth-lock.js"></script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MacEwan Database: Lineups, Tactical Offense & Defensive Stops</title>
  <style>
    :root {
      --mac-maroon: #98002e;
      --mac-maroon-dark: #6e0021;
      --mac-tan: #d1ad7d;
      --mac-gold: #f39c12;
      --mac-black: #111;
      --bg: #0d0e12;
      --card-bg: #161820;
      --card-inner: #1e202a;
      --border-color: #2a2d3c;
      --pos-green: #2ecc71;
      --neg-red: #e74c3c;
      --neutral-gray: #95a5a6;
      --accent-blue: #3498db;
      --shield-blue: #2980b9;
      --purple: #9b59b6;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: #eee;
      margin: 0;
      padding: 24px;
    }
    header.main-header {
      max-width: 1400px;
      margin: 0 auto 24px;
      border-bottom: 3px solid var(--mac-maroon);
      padding-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-title h1 {
      margin: 0 0 6px;
      font-size: 30px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-title p {
      margin: 0;
      color: var(--mac-tan);
      font-size: 14.5px;
    }
    .nav-links {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .nav-btn {
      background: var(--card-inner);
      color: var(--mac-tan);
      text-decoration: none;
      font-weight: 700;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      border: 1px solid var(--border-color);
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .nav-btn:hover {
      background: var(--mac-maroon);
      color: #fff;
      border-color: var(--mac-maroon);
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Game Selection Banner */
    .game-selector-card {
      background: linear-gradient(135deg, #1c101a 0%, #161820 100%);
      border: 1px solid var(--mac-maroon);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .game-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .game-badge {
      background: var(--mac-maroon);
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 6px 12px;
      border-radius: 20px;
      letter-spacing: 0.5px;
    }
    .game-details h2 {
      margin: 0 0 4px;
      font-size: 22px;
      color: #fff;
    }
    .game-details p {
      margin: 0;
      color: #aaa;
      font-size: 13.5px;
    }
    .selector-controls {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .select-dropdown {
      background: #0d0e12;
      border: 1px solid var(--border-color);
      color: #fff;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      outline: none;
      cursor: pointer;
    }
    .select-dropdown:focus {
      border-color: var(--mac-maroon);
    }
    .btn-add-game {
      background: var(--mac-maroon);
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13.5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn-add-game:hover {
      background: var(--mac-maroon-dark);
    }

    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 16px;
      border-top: 4px solid var(--mac-maroon);
    }
    .stat-card h4 {
      margin: 0 0 6px;
      font-size: 11.5px;
      color: var(--mac-tan);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-card .value {
      font-size: 24px;
      font-weight: 800;
      color: #fff;
    }
    .stat-card .subtext {
      font-size: 11.5px;
      color: #888;
      margin-top: 4px;
    }

    /* Controls Bar */
    .controls-bar {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .search-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 14px;
    }
    .search-box {
      flex: 1;
      min-width: 280px;
    }
    .search-box input {
      width: 100%;
      background: #0d0e12;
      border: 1px solid var(--border-color);
      color: white;
      padding: 11px 16px;
      border-radius: 8px;
      font-size: 14px;
    }
    .search-box input:focus {
      outline: none;
      border-color: var(--mac-maroon);
    }
    .filter-tabs {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .tab-btn {
      background: #0d0e12;
      border: 1px solid var(--border-color);
      color: #ccc;
      padding: 9px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .tab-btn:hover {
      background: #232635;
      color: #fff;
      border-color: var(--mac-tan);
    }
    .tab-btn.active {
      background: var(--mac-maroon);
      color: white;
      border-color: var(--mac-maroon);
      box-shadow: 0 4px 12px rgba(152, 0, 46, 0.4);
    }
    .sub-filter-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .pill-filter-btn {
      background: #0d0e12;
      border: 1px solid var(--border-color);
      color: #aaa;
      padding: 6px 12px;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      transition: all 0.15s;
    }
    .pill-filter-btn:hover {
      color: #fff;
      border-color: var(--mac-tan);
    }
    .pill-filter-btn.active {
      background: var(--mac-tan);
      color: #000;
      border-color: var(--mac-tan);
      font-weight: 800;
    }

    /* Tables */
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--mac-tan);
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      overflow-x: auto;
      margin-bottom: 32px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    th {
      background: #111217;
      color: var(--mac-tan);
      padding: 12px 14px;
      font-weight: 700;
      font-size: 11.5px;
      text-transform: uppercase;
      border-bottom: 2px solid var(--mac-maroon);
      white-space: nowrap;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      color: #ddd;
      vertical-align: middle;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.03);
    }
    .badge-pos {
      background: rgba(46, 204, 113, 0.15);
      color: var(--pos-green);
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 800;
      display: inline-block;
    }
    .badge-neg {
      background: rgba(231, 76, 60, 0.15);
      color: var(--neg-red);
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 800;
      display: inline-block;
    }
    .badge-zero {
      background: rgba(149, 165, 166, 0.15);
      color: var(--neutral-gray);
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 700;
      display: inline-block;
    }
    .player-pill {
      background: var(--card-inner);
      border: 1px solid var(--border-color);
      color: #eee;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      margin-right: 4px;
      display: inline-block;
      white-space: nowrap;
    }
    .player-pill.vet {
      border-color: rgba(209, 173, 125, 0.5);
      color: #fff;
    }
    .short-abbrev {
      color: var(--mac-tan);
      font-weight: 700;
    }
    .trigger-pill {
      background: #1c1e2b;
      border: 1px solid #333;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 11px;
      color: #fff;
    }
    .sym-badge {
      font-family: monospace;
      font-size: 15px;
      font-weight: 900;
      padding: 2px 6px;
      border-radius: 4px;
      background: #090a0d;
      border: 1px solid #333;
      display: inline-block;
    }

    /* Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.85);
      z-index: 99999;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal-content {
      background: #151822;
      border: 2px solid var(--mac-maroon);
      border-radius: 12px;
      max-width: 550px;
      width: 100%;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.8);
      font-family: inherit;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .modal-header h3 { margin: 0; color: #fff; font-size: 18px; }
    .close-modal { background: none; border: none; font-size: 26px; color: var(--mac-tan); cursor: pointer; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: 12px; color: var(--mac-tan); margin-bottom: 5px; font-weight: 700; }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%;
      background: #090a0d;
      border: 1px solid var(--border-color);
      color: #fff;
      padding: 10px;
      border-radius: 6px;
      font-family: inherit;
      font-size: 13.5px;
    }
  </style>
</head>
<body>

<div class="container">
  <header class="main-header">
    <div class="header-title">
      <h1>MacEwan Database 📊</h1>
      <p>Griffins Men's Basketball Official Analytics, Lineups &amp; Tactical Log Engine</p>
    </div>
    <div class="nav-links">
      <a href="shot-tracker.html" class="nav-btn">🎯 Shot Tracker</a>
      <a href="lineup-logger.html" class="nav-btn">📱 Lineup Logger</a>
      <a href="canadawest-scout-2026-27.html" class="nav-btn">📋 Scouting Hub</a>
      <a href="index.html" class="nav-btn">🏠 Coaching Hub</a>
    </div>
  </header>

  <!-- Game Selector Banner -->
  <div class="game-selector-card">
    <div class="game-info">
      <div class="game-badge" id="game-type-badge">Exhibition Game</div>
      <div class="game-details">
        <h2 id="active-game-title">MacEwan Griffins vs. Lethbridge Pronghorns</h2>
        <p id="active-game-sub">Date: Oct 8, 2026 • Location: Home (MacEwan Gym) • 25 Tracked Stints</p>
      </div>
    </div>
    <div class="selector-controls">
      <select class="select-dropdown" id="game-select-dropdown" onchange="onGameSelectChange(this.value)"></select>
      <button class="btn-add-game" onclick="openAddGameModal()">➕ Add Game</button>
      <button class="nav-btn" id="btn-delete-game" style="background:#4a1212; border-color:#782323; color:#ff9999; display:none;" onclick="deleteSelectedGame()">🗑 Delete Game</button>
    </div>
  </div>

  <!-- KPI Summary Cards -->
  <div class="summary-grid">
    <div class="stat-card">
      <h4>Tracked Stints</h4>
      <div class="value" id="card-total-stints">25 Stints</div>
      <div class="subtext" id="card-total-stints-sub">All active stints</div>
    </div>
    <div class="stat-card">
      <h4>Unique Lineups</h4>
      <div class="value" id="card-unique-lineups">21 Units</div>
      <div class="subtext">5-Man combinations deployed</div>
    </div>
    <div class="stat-card" style="border-top-color: var(--pos-green);">
      <h4>Top Overall +/- Lineup</h4>
      <div class="value" id="card-top-lineup" style="color:var(--pos-green);">+8 Net</div>
      <div class="subtext" id="card-top-lineup-sub">El, Khush, Dele, Jud, Ryan</div>
    </div>
    <div class="stat-card" style="border-top-color: var(--mac-gold);">
      <h4>Top Impact Player (+/-)</h4>
      <div class="value" id="card-top-player" style="color:var(--mac-gold);">Ryan Ziolkowski (+3)</div>
      <div class="subtext">14 stints • #1 Net Efficiency</div>
    </div>
    <div class="stat-card" style="border-top-color: var(--accent-blue);">
      <h4>Tactical Events Logged</h4>
      <div class="value" id="card-tactical-events">40 Events</div>
      <div class="subtext" id="card-tactical-events-sub">20 Offense • 20 Defense</div>
    </div>
  </div>

  <!-- Interactive Controls Bar -->
  <div class="controls-bar">
    <div class="search-row">
      <div class="search-box">
        <input type="text" id="lineup-search" placeholder="🔍 Search player name, lineup, action trigger (PnR, Cut, Iso), or zone (R, C, P)..." onkeyup="renderAllViews()">
      </div>
      <button class="nav-btn" onclick="exportActiveViewCSV()">📥 Export View CSV</button>
    </div>

    <!-- Navigation View Tabs -->
    <div class="filter-tabs">
      <button class="tab-btn active" id="tab-stints" onclick="switchView('stints')">📋 All Stints (+/-)</button>
      <button class="tab-btn" id="tab-aggregated" onclick="switchView('aggregated')">📊 5-Man Lineups (+/-)</button>
      <button class="tab-btn" id="tab-players" onclick="switchView('players')">👤 Player (+/-)</button>
      <button class="tab-btn" id="tab-duos" onclick="switchView('duos')">👥 Duos</button>
      <button class="tab-btn" id="tab-trios" onclick="switchView('trios')">🤝 Trios</button>
      <button class="tab-btn" id="tab-offense-ind" onclick="switchView('offense-ind')">🏀 Individual Offense</button>
      <button class="tab-btn" id="tab-offense-lineup" onclick="switchView('offense-lineup')">🏀 Lineup Offense</button>
      <button class="tab-btn" id="tab-defense-ind" onclick="switchView('defense-ind')">🛡️ Individual Defense</button>
      <button class="tab-btn" id="tab-defense-lineup" onclick="switchView('defense-lineup')">🛡️ Lineup Defense</button>
      <button class="tab-btn" id="tab-event-log" onclick="switchView('event-log')">📜 Tactical Event Log</button>
    </div>

    <!-- Sub-Filter Pills (Changes dynamically per view) -->
    <div class="sub-filter-row" id="sub-filter-container">
      <span style="font-size:12px; color:var(--mac-tan); font-weight:700;">Filter:</span>
      <button class="pill-filter-btn active" id="pill-all" onclick="setSubFilter('all')">All</button>
      <button class="pill-filter-btn" id="pill-q1" onclick="setSubFilter('Q1')">Q1</button>
      <button class="pill-filter-btn" id="pill-q2" onclick="setSubFilter('Q2')">Q2</button>
      <button class="pill-filter-btn" id="pill-q3" onclick="setSubFilter('Q3')">Q3</button>
      <button class="pill-filter-btn" id="pill-q4" onclick="setSubFilter('Q4')">Q4</button>
      <button class="pill-filter-btn" id="pill-pnr" onclick="setSubFilter('PnR')">PnR</button>
      <button class="pill-filter-btn" id="pill-cut" onclick="setSubFilter('Cut')">Cuts</button>
      <button class="pill-filter-btn" id="pill-tran" onclick="setSubFilter('Tran')">Transition</button>
      <button class="pill-filter-btn" id="pill-rim" onclick="setSubFilter('R')">Rim (R)</button>
      <button class="pill-filter-btn" id="pill-three" onclick="setSubFilter('3PT')">3-Pointers</button>
      <button class="pill-filter-btn" id="pill-contested" onclick="setSubFilter('contested')">Contested</button>
    </div>
  </div>

  <!-- VIEW 1: All Game Stints (+/-) -->
  <div id="view-stints">
    <div class="section-title">
      <span>Game Stints Log (Calculated Point Sequences)</span>
      <span id="stint-count-label" style="font-size:13px; color:#888;">Showing 25 stints</span>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Stint #</th>
            <th>USports Experience</th>
            <th>5-Man Lineup (Roster Names &amp; Abbreviations)</th>
            <th>Point Sequence Notes</th>
            <th style="text-align:center;">Net (+/-)</th>
          </tr>
        </thead>
        <tbody id="tbody-stints"></tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 2: Aggregated 5-Man Units (+/-) -->
  <div id="view-aggregated" style="display:none;">
    <div class="section-title">
      <span>Aggregated 5-Man Lineup Totals (+/-)</span>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>USports Experience</th>
            <th>5-Man Combination</th>
            <th style="text-align:center;">Stints Played</th>
            <th style="text-align:center;">Stint IDs</th>
            <th style="text-align:center;">Total Net (+/-)</th>
          </tr>
        </thead>
        <tbody id="tbody-aggregated"></tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 3: 2-Player Duos (+/-) -->
  <div id="view-duos" style="display:none;">
    <div class="section-title">
      <span>2-Player Duo Chemistry &amp; Synergy Matrix</span>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>2-Player Combo</th>
            <th style="text-align:center;">Stints Together</th>
            <th style="text-align:center;">Net (+/-)</th>
            <th style="text-align:center;">Avg Net / Stint</th>
          </tr>
        </thead>
        <tbody id="tbody-duos"></tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 4: 3-Player Trios (+/-) -->
  <div id="view-trios" style="display:none;">
    <div class="section-title">
      <span>3-Player Trio Synergy Matrix</span>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>3-Player Combination</th>
            <th style="text-align:center;">Stints Together</th>
            <th style="text-align:center;">Net (+/-)</th>
            <th style="text-align:center;">Avg Net / Stint</th>
          </tr>
        </thead>
        <tbody id="tbody-trios"></tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 5: Individual Player +/- Impact -->
  <div id="view-players" style="display:none;">
    <div class="section-title">
      <span>Individual Player Overall +/- Impact</span>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player Name</th>
            <th>Pos</th>
            <th>USports Yr</th>
            <th style="text-align:center;">Experience Level</th>
            <th style="text-align:center;">Stints On Court</th>
            <th style="text-align:center;">Cumulative Net (+/-)</th>
          </tr>
        </thead>
        <tbody id="tbody-players"></tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 6: Individual Offense (Tactical Shot Quality & Scoring) -->
  <div id="view-offense-ind" style="display:none;">
    <div class="section-title">
      <span>🏀 Individual Offense &amp; Tactical Shot Quality</span>
      <span id="off-ind-count-label" style="font-size:13px; color:#888;"></span>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player Name</th>
            <th>Year</th>
            <th style="text-align:center;">Possessions</th>
            <th style="text-align:center;">Points</th>
            <th style="text-align:center;">FGM / FGA</th>
            <th style="text-align:center;">FG%</th>
            <th style="text-align:center;">eFG%</th>
            <th style="text-align:center;">Shot Breakdown (R/P/J/3PT)</th>
            <th style="text-align:center;">Contest %</th>
            <th style="text-align:center;">Fouls / TO</th>
            <th>Primary Triggers</th>
          </tr>
        </thead>
        <tbody id="tbody-offense-ind"></tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 7: Lineup Offense (5-Man Tactical Efficiency) -->
  <div id="view-offense-lineup" style="display:none;">
    <div class="section-title">
      <span>🏀 5-Man Lineup Offensive Production &amp; Efficiency</span>
      <span id="off-lineup-count-label" style="font-size:13px; color:#888;"></span>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>5-Man Lineup Unit</th>
            <th style="text-align:center;">Off Poss</th>
            <th style="text-align:center;">PTS</th>
            <th style="text-align:center;">PPP (Pts/Poss)</th>
            <th style="text-align:center;">FGM / FGA</th>
            <th style="text-align:center;">eFG%</th>
            <th style="text-align:center;">Paint Share</th>
            <th style="text-align:center;">3PT Share</th>
            <th style="text-align:center;">Open Shot %</th>
          </tr>
        </thead>
        <tbody id="tbody-offense-lineup"></tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 8: Individual Defense (Contest Rate, Stops & Accountability) -->
  <div id="view-defense-ind" style="display:none;">
    <div class="section-title">
      <span>🛡️ Individual Defensive Accountability &amp; Contests</span>
      <span id="def-ind-count-label" style="font-size:13px; color:#888;"></span>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Primary Defender</th>
            <th>Year</th>
            <th style="text-align:center;">Def Poss</th>
            <th style="text-align:center;">Contests</th>
            <th style="text-align:center;">Contest %</th>
            <th style="text-align:center;">Stops Forced</th>
            <th style="text-align:center;">Stop Rate %</th>
            <th style="text-align:center;">Pts Allowed</th>
            <th style="text-align:center;">Rim Stops</th>
            <th style="text-align:center;">Fouls / FTO</th>
            <th>Primary Trigger Faced</th>
          </tr>
        </thead>
        <tbody id="tbody-defense-ind"></tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 9: Lineup Defense (5-Man Defensive Quality) -->
  <div id="view-defense-lineup" style="display:none;">
    <div class="section-title">
      <span>🛡️ 5-Man Lineup Defensive Quality &amp; Stop Rates</span>
      <span id="def-lineup-count-label" style="font-size:13px; color:#888;"></span>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>5-Man Defensive Lineup</th>
            <th style="text-align:center;">Def Poss</th>
            <th style="text-align:center;">Stops</th>
            <th style="text-align:center;">Stop Rate %</th>
            <th style="text-align:center;">Pts Allowed</th>
            <th style="text-align:center;">PPA (Pts/Poss)</th>
            <th style="text-align:center;">Contest Rate %</th>
            <th style="text-align:center;">Rim Stops</th>
          </tr>
        </thead>
        <tbody id="tbody-defense-lineup"></tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 10: Master Tactical Event Log (Offense & Defense Play-by-Play) -->
  <div id="view-event-log" style="display:none;">
    <div class="section-title">
      <span>📜 Master Tactical Event Log (Play-by-Play)</span>
      <div style="display:flex; gap:8px; align-items:center;">
        <select id="sel-event-type-filter" class="select-dropdown" style="padding:5px 10px; font-size:12px;" onchange="renderAllViews()">
          <option value="ALL">All Events (Offense + Defense)</option>
          <option value="OFFENSE">🏀 Offense Only</option>
          <option value="DEFENSE">🛡️ Defense Only</option>
        </select>
        <span id="event-log-count-label" style="font-size:13px; color:#888;"></span>
      </div>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Type</th>
            <th>Period &amp; Clock</th>
            <th>Player / Defender</th>
            <th>Trigger</th>
            <th style="text-align:center;">Zone &amp; Symbol</th>
            <th>Outcome / Points</th>
            <th>Active 5 On Court</th>
            <th>Game</th>
          </tr>
        </thead>
        <tbody id="tbody-event-log"></tbody>
      </table>
    </div>
  </div>

</div>

<!-- Modal: Add New Game Stints -->
<div class="modal-overlay" id="add-game-modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>➕ Log New Game Lineup Stints</h3>
      <button class="close-modal" onclick="closeAddGameModal()">&times;</button>
    </div>
    <form id="add-game-form" onsubmit="handleSaveNewGame(event)">
      <div class="form-group">
        <label>Opponent School / Team Name</label>
        <input type="text" id="input-opponent" placeholder="e.g., Calgary Dinos, Alberta Golden Bears..." required>
      </div>
      <div class="form-group">
        <label>Game Date</label>
        <input type="date" id="input-date" required>
      </div>
      <div class="form-group">
        <label>Game Type</label>
        <select id="input-type">
          <option value="Regular Season">Regular Season (Canada West)</option>
          <option value="Exhibition Game">Exhibition Game</option>
          <option value="Playoffs">Playoffs</option>
        </select>
      </div>
      <div class="form-group">
        <label>Lineup Stints Data (Paste formatted text or lines)</label>
        <textarea id="input-stints-text" rows="6" placeholder="Example format per line:\nDiego, El, Jud, Wol, Ryan | +1\nJoJo, El, Abdi, Ryan, Favour | +2, 0, -2\nNathan, Khush, Dele, Noah, Ryan | 0" required></textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
        <button type="button" class="nav-btn" onclick="closeAddGameModal()">Cancel</button>
        <button type="submit" class="btn-add-game">Save Game Stints</button>
      </div>
    </form>
  </div>
</div>

<script>
  const PLAYER_EXPERIENCE = ${JSON.stringify(PLAYER_EXPERIENCE, null, 2)};
  const defaultLethbridgeGame = ${JSON.stringify(INITIAL_GAMES_DATA[0], null, 2)};
  let gamesData = [defaultLethbridgeGame];

  // Seed events for Game 1
  const SEED_OFFENSE_EVENTS = ${JSON.stringify(SEED_OFFENSE_EVENTS, null, 2)};
  const SEED_DEFENSE_EVENTS = ${JSON.stringify(SEED_DEFENSE_EVENTS, null, 2)};

  let offenseEvents = [];
  let defenseEvents = [];

  // Clean localStorage & load saved games
  const savedGames = localStorage.getItem('macewan_lineup_games');
  if (savedGames) {
    try {
      const parsed = JSON.parse(savedGames);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any UofA / Alberta / test games
        const cleanedSaved = parsed.filter(g => {
          const opp = (g.opponent || '').toLowerCase();
          const gId = (g.gameId || '').toLowerCase();
          return !opp.includes('uofa') && !opp.includes('u of a') && !opp.includes('alberta') && !opp.includes('test')
              && !gId.includes('uofa') && !gId.includes('alberta') && !gId.includes('test');
        });

        // Ensure default Lethbridge game is preserved if missing
        const hasLethbridge = cleanedSaved.some(g => g.gameId === 'game_20261008_lethbridge' || (g.opponent && g.opponent.toLowerCase().includes('lethbridge')));
        if (!hasLethbridge) {
          cleanedSaved.unshift(defaultLethbridgeGame);
        }

        gamesData = cleanedSaved;
        localStorage.setItem('macewan_lineup_games', JSON.stringify(gamesData));
      }
    } catch(e) { console.error('Error loading saved games', e); }
  }

  let activeGameId = "game_20261008_lethbridge";
  let currentView = "stints";
  let currentSubFilter = "all";

  function initApp() {
    loadTacticalEvents();
    populateGameDropdown();

    // Check URL parameters for direct view switching
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam) {
      if (viewParam === 'offense' || viewParam === 'offense-ind') switchView('offense-ind');
      else if (viewParam === 'defense' || viewParam === 'defense-ind') switchView('defense-ind');
      else if (viewParam === 'lineups' || viewParam === 'aggregated') switchView('aggregated');
      else if (viewParam === 'eventlog' || viewParam === 'event-log') switchView('event-log');
      else switchView(viewParam);
    } else {
      renderAllViews();
    }
  }

  function loadTacticalEvents() {
    // Offense Events
    var localOff = localStorage.getItem('game_offense_events');
    if (localOff) {
      try {
        var parsedOff = JSON.parse(localOff);
        if (Array.isArray(parsedOff) && parsedOff.length > 0) {
          offenseEvents = parsedOff;
        } else {
          offenseEvents = SEED_OFFENSE_EVENTS.slice();
        }
      } catch(e) { offenseEvents = SEED_OFFENSE_EVENTS.slice(); }
    } else {
      offenseEvents = SEED_OFFENSE_EVENTS.slice();
      localStorage.setItem('game_offense_events', JSON.stringify(offenseEvents));
    }

    // Defense Events
    var localDef = localStorage.getItem('game_defense_events');
    if (localDef) {
      try {
        var parsedDef = JSON.parse(localDef);
        if (Array.isArray(parsedDef) && parsedDef.length > 0) {
          defenseEvents = parsedDef;
        } else {
          defenseEvents = SEED_DEFENSE_EVENTS.slice();
        }
      } catch(e) { defenseEvents = SEED_DEFENSE_EVENTS.slice(); }
    } else {
      defenseEvents = SEED_DEFENSE_EVENTS.slice();
      localStorage.setItem('game_defense_events', JSON.stringify(defenseEvents));
    }

    // Attempt remote Netlify Blob refresh in background
    fetch('/.netlify/functions/get-content?key=game_offense_events')
      .then(r => r.json())
      .then(data => {
        if (data && data.success && data.content) {
          var remote = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
          if (Array.isArray(remote) && remote.length >= offenseEvents.length) {
            offenseEvents = remote;
            renderAllViews();
          }
        }
      }).catch(()=>{});

    fetch('/.netlify/functions/get-content?key=game_defense_events')
      .then(r => r.json())
      .then(data => {
        if (data && data.success && data.content) {
          var remote = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
          if (Array.isArray(remote) && remote.length >= defenseEvents.length) {
            defenseEvents = remote;
            renderAllViews();
          }
        }
      }).catch(()=>{});
  }

  function populateGameDropdown() {
    const dropdown = document.getElementById('game-select-dropdown');
    dropdown.innerHTML = '<option value="ALL">🏀 ALL GAMES (Cumulative Season)</option>';
    gamesData.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.gameId;
      opt.textContent = \`🗓 \${g.date} — vs. \${g.opponent}\`;
      if (g.gameId === activeGameId) opt.selected = true;
      dropdown.appendChild(opt);
    });

    const delBtn = document.getElementById('btn-delete-game');
    if (delBtn) {
      delBtn.style.display = (activeGameId !== 'ALL' && activeGameId !== 'game_20261008_lethbridge') ? 'inline-block' : (activeGameId !== 'ALL' && gamesData.length > 1 ? 'inline-block' : 'none');
    }
  }

  function onGameSelectChange(val) {
    activeGameId = val;
    const delBtn = document.getElementById('btn-delete-game');
    if (delBtn) {
      delBtn.style.display = (activeGameId !== 'ALL') ? 'inline-block' : 'none';
    }
    renderAllViews();
  }

  function deleteSelectedGame() {
    if (activeGameId === 'ALL') {
      alert("Please select a specific game from the dropdown to delete.");
      return;
    }
    const targetGame = gamesData.find(g => g.gameId === activeGameId);
    if (!targetGame) return;

    if (confirm("Are you sure you want to delete game: vs. " + targetGame.opponent + " (" + targetGame.date + ")?")) {
      gamesData = gamesData.filter(g => g.gameId !== activeGameId);
      localStorage.setItem('macewan_lineup_games', JSON.stringify(gamesData));
      activeGameId = gamesData.length > 0 ? gamesData[0].gameId : 'ALL';
      populateGameDropdown();
      renderAllViews();
    }
  }

  function getActiveStints() {
    if (activeGameId === 'ALL') {
      let allStints = [];
      gamesData.forEach(g => {
        allStints = allStints.concat(g.stints);
      });
      return allStints;
    }
    const g = gamesData.find(x => x.gameId === activeGameId);
    return g ? g.stints : [];
  }

  function getActiveOffenseEvents() {
    if (activeGameId === 'ALL') return offenseEvents;
    return offenseEvents.filter(ev => ev.gameId === activeGameId || !ev.gameId);
  }

  function getActiveDefenseEvents() {
    if (activeGameId === 'ALL') return defenseEvents;
    return defenseEvents.filter(ev => ev.gameId === activeGameId || !ev.gameId);
  }

  function countVeterans(players) {
    let count = 0;
    players.forEach(p => {
      if (PLAYER_EXPERIENCE[p] && PLAYER_EXPERIENCE[p].exp) count++;
    });
    return count;
  }

  function switchView(viewName) {
    currentView = viewName;
    const views = ['stints', 'aggregated', 'players', 'duos', 'trios', 'offense-ind', 'offense-lineup', 'defense-ind', 'defense-lineup', 'event-log'];
    views.forEach(v => {
      const el = document.getElementById('view-' + v);
      if (el) el.style.display = (v === viewName) ? 'block' : 'none';
      const btn = document.getElementById('tab-' + v);
      if (btn) btn.classList.toggle('active', v === viewName);
    });
    renderAllViews();
  }

  function setSubFilter(filterVal) {
    currentSubFilter = filterVal;
    document.querySelectorAll('.pill-filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    var target = document.getElementById('pill-' + filterVal.toLowerCase());
    if (target) target.classList.add('active');
    renderAllViews();
  }

  function renderAllViews() {
    const searchQ = document.getElementById('lineup-search').value.toLowerCase().trim();
    let stints = getActiveStints();
    let curOffEvents = getActiveOffenseEvents();
    let curDefEvents = getActiveDefenseEvents();

    // Calculate net for each stint if missing
    stints.forEach(s => {
      if (typeof s.net === 'undefined') {
        s.net = s.vals ? s.vals.reduce((a,b)=>a+b, 0) : 0;
      }
      s.vetCount = countVeterans(s.players);
    });

    // Update Game Banner UI
    if (activeGameId === 'ALL') {
      document.getElementById('active-game-title').textContent = "All Season Games (Cumulative Database Analytics)";
      document.getElementById('active-game-sub').textContent = \`Total \${gamesData.length} Games • \${stints.length} Tracked Stints • \${curOffEvents.length + curDefEvents.length} Tactical Events\`;
      document.getElementById('game-type-badge').textContent = "Season Totals";
    } else {
      const g = gamesData.find(x => x.gameId === activeGameId);
      if (g) {
        document.getElementById('active-game-title').textContent = \`MacEwan Griffins vs. \${g.opponent}\`;
        document.getElementById('active-game-sub').textContent = \`Date: \${g.date} • Location: \${g.location || 'Home'} • \${g.stints.length} Stints • \${curOffEvents.length + curDefEvents.length} Tactical Events\`;
        document.getElementById('game-type-badge').textContent = g.gameType || "Game";
      }
    }

    // Update Tactical KPI summary
    document.getElementById('card-tactical-events').textContent = (curOffEvents.length + curDefEvents.length) + " Events";
    document.getElementById('card-tactical-events-sub').textContent = \`\${curOffEvents.length} Offense • \${curDefEvents.length} Defense\`;

    // Filter stints by search
    let filteredStints = stints;
    if (searchQ) {
      filteredStints = filteredStints.filter(s => {
        const str = (s.players.join(' ') + ' ' + (s.shortNames ? s.shortNames.join(' ') : '')).toLowerCase();
        return str.includes(searchQ);
      });
    }

    // Render Views
    renderStintsTable(filteredStints);
    renderAggregatedTable(filteredStints);
    renderDuosTable(filteredStints);
    renderTriosTable(filteredStints);
    renderPlayersTable(filteredStints);

    renderOffenseIndividualTable(curOffEvents, searchQ);
    renderOffenseLineupTable(curOffEvents, searchQ);
    renderDefenseIndividualTable(curDefEvents, searchQ);
    renderDefenseLineupTable(curDefEvents, searchQ);
    renderTacticalEventLogTable(curOffEvents, curDefEvents, searchQ);
  }

  /* RENDER VIEW 1: STINTS */
  function renderStintsTable(stints) {
    const tbody = document.getElementById('tbody-stints');
    document.getElementById('stint-count-label').textContent = \`Showing \${stints.length} stints\`;

    tbody.innerHTML = stints.map((item, idx) => {
      const netBadge = item.net > 0 
        ? \`<span class="badge-pos">+\${item.net}</span>\`
        : item.net < 0 
          ? \`<span class="badge-neg">\${item.net}</span>\`
          : \`<span class="badge-zero">0</span>\`;

      const expBadge = item.vetCount >= 4
        ? \`<span style="color:#2ecc71; font-weight:800; font-size:11px;">🛡️ \${item.vetCount}/5 Vets</span>\`
        : \`<span style="color:#e74c3c; font-weight:700; font-size:11px;">⚠️ \${item.vetCount}/5 Vets</span>\`;

      const playerPills = item.players.map((p, pIdx) => {
        const isVet = PLAYER_EXPERIENCE[p] && PLAYER_EXPERIENCE[p].exp;
        const shortName = item.shortNames && item.shortNames[pIdx] ? item.shortNames[pIdx] : (PLAYER_EXPERIENCE[p] ? PLAYER_EXPERIENCE[p].short : '');
        return \`<span class="player-pill \${isVet ? 'vet' : ''}">\${p} <span class="short-abbrev">(\${shortName})</span></span>\`;
      }).join('');

      return \`<tr>
        <td><strong>#\${item.id || (idx + 1)}</strong></td>
        <td>\${expBadge}</td>
        <td>\${playerPills}</td>
        <td style="font-family:monospace; font-size:13px; color:#aaa;">\${item.seq}</td>
        <td style="text-align:center;">\${netBadge}</td>
      </tr>\`;
    }).join('');
  }

  /* RENDER VIEW 2: AGGREGATED 5-MAN */
  function renderAggregatedTable(stints) {
    const tbody = document.getElementById('tbody-aggregated');
    const aggMap = {};

    stints.forEach(s => {
      const key = s.players.slice().sort().join(' | ');
      if (!aggMap[key]) {
        aggMap[key] = {
          players: s.players.slice().sort(),
          stintIds: [],
          totalNet: 0,
          vetCount: s.vetCount
        };
      }
      aggMap[key].stintIds.push(s.id || '?');
      aggMap[key].totalNet += s.net;
    });

    const list = Object.values(aggMap).sort((a,b) => b.totalNet - a.totalNet);

    tbody.innerHTML = list.map((item, idx) => {
      const netBadge = item.totalNet > 0 
        ? \`<span class="badge-pos">+\${item.totalNet}</span>\`
        : item.totalNet < 0 
          ? \`<span class="badge-neg">\${item.totalNet}</span>\`
          : \`<span class="badge-zero">0</span>\`;

      const expBadge = item.vetCount >= 4
        ? \`<span style="color:#2ecc71; font-weight:800; font-size:11px;">🛡️ \${item.vetCount}/5 Vets</span>\`
        : \`<span style="color:#e74c3c; font-weight:700; font-size:11px;">⚠️ \${item.vetCount}/5 Vets</span>\`;

      const playerPills = item.players.map(p => {
        const isVet = PLAYER_EXPERIENCE[p] && PLAYER_EXPERIENCE[p].exp;
        return \`<span class="player-pill \${isVet ? 'vet' : ''}">\${p}</span>\`;
      }).join('');

      return \`<tr>
        <td><strong>#\${idx + 1}</strong></td>
        <td>\${expBadge}</td>
        <td>\${playerPills}</td>
        <td style="text-align:center; font-weight:bold;">\${item.stintIds.length}</td>
        <td style="text-align:center; color:#aaa;">#\${item.stintIds.join(', #')}</td>
        <td style="text-align:center;">\${netBadge}</td>
      </tr>\`;
    }).join('');
  }

  /* RENDER VIEW 3: DUOS */
  function renderDuosTable(stints) {
    const tbody = document.getElementById('tbody-duos');
    const duoMap = {};

    stints.forEach(s => {
      const sorted = s.players.slice().sort();
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const key = sorted[i] + ' + ' + sorted[j];
          if (!duoMap[key]) duoMap[key] = { p1: sorted[i], p2: sorted[j], stints: 0, net: 0 };
          duoMap[key].stints += 1;
          duoMap[key].net += s.net;
        }
      }
    });

    const list = Object.values(duoMap).sort((a,b) => b.net - a.net);

    tbody.innerHTML = list.map((item, idx) => {
      const avg = (item.net / item.stints).toFixed(2);
      const netBadge = item.net > 0 
        ? \`<span class="badge-pos">+\${item.net}</span>\`
        : item.net < 0 
          ? \`<span class="badge-neg">\${item.net}</span>\`
          : \`<span class="badge-zero">0</span>\`;

      const p1Vet = PLAYER_EXPERIENCE[item.p1] && PLAYER_EXPERIENCE[item.p1].exp;
      const p2Vet = PLAYER_EXPERIENCE[item.p2] && PLAYER_EXPERIENCE[item.p2].exp;

      return \`<tr>
        <td><strong>#\${idx + 1}</strong></td>
        <td>
          <span class="player-pill \${p1Vet ? 'vet' : ''}">\${item.p1}</span>
          <span style="color:var(--mac-tan); font-weight:bold;">+</span>
          <span class="player-pill \${p2Vet ? 'vet' : ''}">\${item.p2}</span>
        </td>
        <td style="text-align:center; font-weight:bold;">\${item.stints}</td>
        <td style="text-align:center;">\${netBadge}</td>
        <td style="text-align:center; color:#aaa;">\${avg > 0 ? '+' : ''}\${avg}</td>
      </tr>\`;
    }).join('');
  }

  /* RENDER VIEW 4: TRIOS */
  function renderTriosTable(stints) {
    const tbody = document.getElementById('tbody-trios');
    const trioMap = {};

    stints.forEach(s => {
      const sorted = s.players.slice().sort();
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          for (let k = j + 1; k < sorted.length; k++) {
            const key = sorted[i] + ' + ' + sorted[j] + ' + ' + sorted[k];
            if (!trioMap[key]) trioMap[key] = { players: [sorted[i], sorted[j], sorted[k]], stints: 0, net: 0 };
            trioMap[key].stints += 1;
            trioMap[key].net += s.net;
          }
        }
      }
    });

    const list = Object.values(trioMap).sort((a,b) => b.net - a.net);

    tbody.innerHTML = list.map((item, idx) => {
      const avg = (item.net / item.stints).toFixed(2);
      const netBadge = item.net > 0 
        ? \`<span class="badge-pos">+\${item.net}</span>\`
        : item.net < 0 
          ? \`<span class="badge-neg">\${item.net}</span>\`
          : \`<span class="badge-zero">0</span>\`;

      const playerPills = item.players.map(p => {
        const isVet = PLAYER_EXPERIENCE[p] && PLAYER_EXPERIENCE[p].exp;
        return \`<span class="player-pill \${isVet ? 'vet' : ''}">\${p}</span>\`;
      }).join(' ');

      return \`<tr>
        <td><strong>#\${idx + 1}</strong></td>
        <td>\${playerPills}</td>
        <td style="text-align:center; font-weight:bold;">\${item.stints}</td>
        <td style="text-align:center;">\${netBadge}</td>
        <td style="text-align:center; color:#aaa;">\${avg > 0 ? '+' : ''}\${avg}</td>
      </tr>\`;
    }).join('');
  }

  /* RENDER VIEW 5: INDIVIDUAL PLAYER +/- */
  function renderPlayersTable(stints) {
    const tbody = document.getElementById('tbody-players');
    const pMap = {};

    Object.keys(PLAYER_EXPERIENCE).forEach(p => {
      pMap[p] = { name: p, stints: 0, net: 0, info: PLAYER_EXPERIENCE[p] };
    });

    stints.forEach(s => {
      s.players.forEach(p => {
        if (!pMap[p]) {
          pMap[p] = { name: p, stints: 0, net: 0, info: { year: '?', exp: false, pos: 'G' } };
        }
        pMap[p].stints += 1;
        pMap[p].net += s.net;
      });
    });

    const list = Object.values(pMap).sort((a,b) => b.net - a.net);

    tbody.innerHTML = list.map((item, idx) => {
      const netBadge = item.net > 0 
        ? \`<span class="badge-pos">+\${item.net}</span>\`
        : item.net < 0 
          ? \`<span class="badge-neg">\${item.net}</span>\`
          : \`<span class="badge-zero">0</span>\`;

      const expBadge = item.info.exp 
        ? \`<span style="color:#2ecc71; font-weight:700;">🛡️ Year \${item.info.year} Veteran</span>\`
        : \`<span style="color:#aaa;">Year \${item.info.year} Developing</span>\`;

      return \`<tr>
        <td><strong>#\${idx + 1}</strong></td>
        <td><strong style="color:#fff;">\${item.name}</strong></td>
        <td><span style="color:var(--mac-tan); font-weight:700;">\${item.info.pos || 'G'}</span></td>
        <td>Year \${item.info.year}</td>
        <td style="text-align:center;">\${expBadge}</td>
        <td style="text-align:center; font-weight:bold;">\${item.stints}</td>
        <td style="text-align:center;">\${netBadge}</td>
      </tr>\`;
    }).join('');
  }

  /* RENDER VIEW 6: INDIVIDUAL OFFENSE */
  function renderOffenseIndividualTable(events, searchQ) {
    const tbody = document.getElementById('tbody-offense-ind');
    const pMap = {};

    // Filter events by subfilter pills
    let filteredEvents = events.filter(ev => matchesSubFilter(ev, 'offense'));

    filteredEvents.forEach(ev => {
      var p = ev.playerName || "Team";
      if (!pMap[p]) {
        pMap[p] = {
          name: p,
          poss: 0,
          pts: 0,
          fga: 0,
          fgm: 0,
          threeFga: 0,
          threeFgm: 0,
          paintShots: 0,
          midShots: 0,
          contestedFga: 0,
          fouls: 0,
          tos: 0,
          triggers: {}
        };
      }
      var st = pMap[p];
      st.poss++;
      st.pts += (ev.points || 0);

      if (ev.outcome === 'turnover') {
        st.tos++;
      } else {
        st.fga++;
        if (ev.outcome.includes('make') || ev.outcome === 'and_1') st.fgm++;
        if (ev.isContested) st.contestedFga++;

        if (ev.shotZone === 'C' || ev.shotZone === 'D') {
          st.threeFga++;
          if (ev.outcome.includes('make') || ev.outcome === 'and_1') st.threeFgm++;
        } else if (ev.shotZone === 'R' || ev.shotZone === 'P') {
          st.paintShots++;
        } else if (ev.shotZone === 'J') {
          st.midShots++;
        }

        if (ev.outcome.startsWith('foul_') || ev.outcome === 'and_1') {
          st.fouls++;
        }
      }

      if (ev.playTrigger) {
        st.triggers[ev.playTrigger] = (st.triggers[ev.playTrigger] || 0) + 1;
      }
    });

    let list = Object.values(pMap);
    if (searchQ) {
      list = list.filter(item => item.name.toLowerCase().includes(searchQ));
    }
    list.sort((a,b) => b.pts - a.pts);

    document.getElementById('off-ind-count-label').textContent = \`Showing \${list.length} players (\${filteredEvents.length} events)\`;

    tbody.innerHTML = list.map((item, idx) => {
      var fgPct = item.fga > 0 ? ((item.fgm / item.fga) * 100).toFixed(1) : "0.0";
      var efgPct = item.fga > 0 ? (((item.fgm + 0.5 * item.threeFgm) / item.fga) * 100).toFixed(1) : "0.0";
      var contestPct = item.fga > 0 ? Math.round((item.contestedFga / item.fga) * 100) : 0;
      var pInfo = PLAYER_EXPERIENCE[item.name] || { year: "-", num: "?" };

      var trigPills = Object.entries(item.triggers)
        .sort((a,b)=>b[1]-a[1])
        .slice(0, 3)
        .map(([t, count]) => \`<span class="trigger-pill">\${t} (\${count})</span>\`)
        .join(' ');

      return \`<tr>
        <td><strong>#\${idx + 1}</strong></td>
        <td>
          <div style="font-weight:800; color:#fff;">\${item.name}</div>
          <div style="font-size:11px; color:var(--mac-tan);">#\${pInfo.num || '?'} • \${item.name}</div>
        </td>
        <td>Year \${pInfo.year || '-'}</td>
        <td style="text-align:center; font-weight:700;">\${item.poss}</td>
        <td style="text-align:center;"><strong style="color:var(--pos-green); font-size:14px;">+\${item.pts}</strong></td>
        <td style="text-align:center;">\${item.fgm}/\${item.fga}</td>
        <td style="text-align:center; font-weight:bold;">\${fgPct}%</td>
        <td style="text-align:center; color:var(--mac-gold); font-weight:800;">\${efgPct}%</td>
        <td style="text-align:center; font-size:11px; color:#aaa;">\${item.paintShots}P • \${item.midShots}M • \${item.threeFga}3PT</td>
        <td style="text-align:center;">\${contestPct}%</td>
        <td style="text-align:center;">\${item.fouls} Drawn • \${item.tos} TO</td>
        <td>\${trigPills || '<span style="color:#666;">-</span>'}</td>
      </tr>\`;
    }).join('');
  }

  /* RENDER VIEW 7: LINEUP OFFENSE */
  function renderOffenseLineupTable(events, searchQ) {
    const tbody = document.getElementById('tbody-offense-lineup');
    const lMap = {};

    let filteredEvents = events.filter(ev => matchesSubFilter(ev, 'offense'));

    filteredEvents.forEach(ev => {
      var lineup = (ev.activeLineup && ev.activeLineup.length === 5) 
        ? ev.activeLineup.slice().sort().join(' | ') 
        : "Unassigned 5-Man Unit";

      if (!lMap[lineup]) {
        lMap[lineup] = {
          lineupStr: lineup,
          players: ev.activeLineup || [],
          poss: 0,
          pts: 0,
          fga: 0,
          fgm: 0,
          threeFga: 0,
          threeFgm: 0,
          paintShots: 0,
          openShots: 0,
          tos: 0
        };
      }
      var st = lMap[lineup];
      st.poss++;
      st.pts += (ev.points || 0);

      if (ev.outcome === 'turnover') {
        st.tos++;
      } else {
        st.fga++;
        if (ev.outcome.includes('make') || ev.outcome === 'and_1') st.fgm++;
        if (!ev.isContested) st.openShots++;
        if (ev.shotZone === 'C' || ev.shotZone === 'D') {
          st.threeFga++;
          if (ev.outcome.includes('make') || ev.outcome === 'and_1') st.threeFgm++;
        } else if (ev.shotZone === 'R' || ev.shotZone === 'P') {
          st.paintShots++;
        }
      }
    });

    let list = Object.values(lMap);
    if (searchQ) {
      list = list.filter(item => item.lineupStr.toLowerCase().includes(searchQ));
    }
    list.sort((a,b) => b.pts - a.pts);

    document.getElementById('off-lineup-count-label').textContent = \`Showing \${list.length} units\`;

    tbody.innerHTML = list.map((item, idx) => {
      var ppp = item.poss > 0 ? (item.pts / item.poss).toFixed(2) : "0.00";
      var efgPct = item.fga > 0 ? (((item.fgm + 0.5 * item.threeFgm) / item.fga) * 100).toFixed(1) : "0.0";
      var paintShare = item.fga > 0 ? Math.round((item.paintShots / item.fga) * 100) : 0;
      var threeShare = item.fga > 0 ? Math.round((item.threeFga / item.fga) * 100) : 0;
      var openPct = item.fga > 0 ? Math.round((item.openShots / item.fga) * 100) : 0;

      var playerPills = (item.players || []).map(p => {
        var isVet = PLAYER_EXPERIENCE[p] && PLAYER_EXPERIENCE[p].exp;
        var short = PLAYER_EXPERIENCE[p] ? PLAYER_EXPERIENCE[p].short : p;
        return \`<span class="player-pill \${isVet ? 'vet' : ''}">\${short}</span>\`;
      }).join(' ');

      return \`<tr>
        <td><strong>#\${idx + 1}</strong></td>
        <td><div>\${playerPills}</div></td>
        <td style="text-align:center; font-weight:700;">\${item.poss}</td>
        <td style="text-align:center;"><strong style="color:var(--pos-green); font-size:14px;">+\${item.pts}</strong></td>
        <td style="text-align:center; font-weight:800; color:var(--mac-gold);">\${ppp}</td>
        <td style="text-align:center;">\${item.fgm}/\${item.fga}</td>
        <td style="text-align:center; font-weight:bold;">\${efgPct}%</td>
        <td style="text-align:center;">\${paintShare}%</td>
        <td style="text-align:center;">\${threeShare}%</td>
        <td style="text-align:center; color:var(--pos-green); font-weight:700;">\${openPct}%</td>
      </tr>\`;
    }).join('');
  }

  /* RENDER VIEW 8: INDIVIDUAL DEFENSE */
  function renderDefenseIndividualTable(events, searchQ) {
    const tbody = document.getElementById('tbody-defense-ind');
    const dMap = {};

    let filteredEvents = events.filter(ev => matchesSubFilter(ev, 'defense'));

    filteredEvents.forEach(ev => {
      var d = ev.defenderName || "Team Breakdown";
      if (!dMap[d]) {
        dMap[d] = {
          name: d,
          poss: 0,
          contests: 0,
          stops: 0,
          ptsAllowed: 0,
          rimStops: 0,
          fouls: 0,
          forcedTos: 0,
          triggers: {}
        };
      }
      var st = dMap[d];
      st.poss++;
      st.ptsAllowed += (ev.pointsAllowed || 0);

      if (ev.isContested) st.contests++;
      if (ev.outcome === 'forced_to') {
        st.forcedTos++;
        st.stops++;
      } else if (ev.outcome.startsWith('stop_')) {
        st.stops++;
        if (ev.shotZone === 'R') st.rimStops++;
      } else if (ev.outcome.startsWith('foul_')) {
        st.fouls++;
      }

      if (ev.opponentTrigger) {
        st.triggers[ev.opponentTrigger] = (st.triggers[ev.opponentTrigger] || 0) + 1;
      }
    });

    let list = Object.values(dMap);
    if (searchQ) {
      list = list.filter(item => item.name.toLowerCase().includes(searchQ));
    }
    list.sort((a,b) => b.stops - a.stops);

    document.getElementById('def-ind-count-label').textContent = \`Showing \${list.length} defenders (\${filteredEvents.length} events)\`;

    tbody.innerHTML = list.map((item, idx) => {
      var stopRate = item.poss > 0 ? ((item.stops / item.poss) * 100).toFixed(1) : "0.0";
      var contestRate = item.poss > 0 ? Math.round((item.contests / item.poss) * 100) : 0;
      var pInfo = PLAYER_EXPERIENCE[item.name] || { year: "-", num: "?" };

      var topTrigger = Object.entries(item.triggers).sort((a,b)=>b[1]-a[1])[0];
      var trigTxt = topTrigger ? \`\${topTrigger[0]} (\${topTrigger[1]})\` : "-";

      return \`<tr>
        <td><strong>#\${idx + 1}</strong></td>
        <td>
          <div style="font-weight:800; color:#fff;">\${item.name}</div>
          <div style="font-size:11px; color:var(--mac-tan);">#\${pInfo.num || '?'} • Defender</div>
        </td>
        <td>Year \${pInfo.year || '-'}</td>
        <td style="text-align:center; font-weight:700;">\${item.poss}</td>
        <td style="text-align:center;">\${item.contests}</td>
        <td style="text-align:center; font-weight:bold; color:var(--mac-gold);">\${contestRate}%</td>
        <td style="text-align:center;"><strong style="color:var(--pos-green);">\${item.stops} Stops</strong></td>
        <td style="text-align:center; font-weight:800; color:var(--pos-green);">\${stopRate}%</td>
        <td style="text-align:center; color:#ff7777; font-weight:700;">\${item.ptsAllowed} PTS</td>
        <td style="text-align:center; font-weight:700;">\${item.rimStops}</td>
        <td style="text-align:center; font-size:11.5px;">\${item.fouls} Foul • \${item.forcedTos} FTO</td>
        <td><span class="trigger-pill">\${trigTxt}</span></td>
      </tr>\`;
    }).join('');
  }

  /* RENDER VIEW 9: LINEUP DEFENSE */
  function renderDefenseLineupTable(events, searchQ) {
    const tbody = document.getElementById('tbody-defense-lineup');
    const lMap = {};

    let filteredEvents = events.filter(ev => matchesSubFilter(ev, 'defense'));

    filteredEvents.forEach(ev => {
      var lineup = (ev.activeLineup && ev.activeLineup.length === 5) 
        ? ev.activeLineup.slice().sort().join(' | ') 
        : "Unassigned 5-Man Unit";

      if (!lMap[lineup]) {
        lMap[lineup] = {
          lineupStr: lineup,
          players: ev.activeLineup || [],
          poss: 0,
          stops: 0,
          ptsAllowed: 0,
          contests: 0,
          rimStops: 0
        };
      }
      var st = lMap[lineup];
      st.poss++;
      st.ptsAllowed += (ev.pointsAllowed || 0);

      if (ev.isContested) st.contests++;
      if (ev.outcome.startsWith('stop_') || ev.outcome === 'forced_to') {
        st.stops++;
        if (ev.shotZone === 'R') st.rimStops++;
      }
    });

    let list = Object.values(lMap);
    if (searchQ) {
      list = list.filter(item => item.lineupStr.toLowerCase().includes(searchQ));
    }
    list.sort((a,b) => b.stops - a.stops);

    document.getElementById('def-lineup-count-label').textContent = \`Showing \${list.length} units\`;

    tbody.innerHTML = list.map((item, idx) => {
      var stopRate = item.poss > 0 ? ((item.stops / item.poss) * 100).toFixed(1) : "0.0";
      var ppa = item.poss > 0 ? (item.ptsAllowed / item.poss).toFixed(2) : "0.00";
      var contestRate = item.poss > 0 ? Math.round((item.contests / item.poss) * 100) : 0;

      var playerPills = (item.players || []).map(p => {
        var isVet = PLAYER_EXPERIENCE[p] && PLAYER_EXPERIENCE[p].exp;
        var short = PLAYER_EXPERIENCE[p] ? PLAYER_EXPERIENCE[p].short : p;
        return \`<span class="player-pill \${isVet ? 'vet' : ''}">\${short}</span>\`;
      }).join(' ');

      return \`<tr>
        <td><strong>#\${idx + 1}</strong></td>
        <td><div>\${playerPills}</div></td>
        <td style="text-align:center; font-weight:700;">\${item.poss}</td>
        <td style="text-align:center;"><strong style="color:var(--pos-green);">\${item.stops}</strong></td>
        <td style="text-align:center; font-weight:800; color:var(--pos-green);">\${stopRate}%</td>
        <td style="text-align:center; color:#ff7777;">\${item.ptsAllowed}</td>
        <td style="text-align:center; font-weight:700;">\${ppa}</td>
        <td style="text-align:center; color:var(--mac-gold); font-weight:700;">\${contestRate}%</td>
        <td style="text-align:center;">\${item.rimStops}</td>
      </tr>\`;
    }).join('');
  }

  /* RENDER VIEW 10: TACTICAL EVENT LOG (Play-by-Play) */
  function renderTacticalEventLogTable(offEvents, defEvents, searchQ) {
    const tbody = document.getElementById('tbody-event-log');
    const filterType = document.getElementById('sel-event-type-filter').value;

    let combined = [];
    if (filterType === 'ALL' || filterType === 'OFFENSE') {
      offEvents.forEach(ev => combined.push(Object.assign({}, ev, { eventType: 'OFFENSE' })));
    }
    if (filterType === 'ALL' || filterType === 'DEFENSE') {
      defEvents.forEach(ev => combined.push(Object.assign({}, ev, { eventType: 'DEFENSE' })));
    }

    // Apply subfilter
    combined = combined.filter(ev => matchesSubFilter(ev, ev.eventType.toLowerCase()));

    // Apply search
    if (searchQ) {
      combined = combined.filter(ev => {
        var str = [
          ev.playerName || '',
          ev.defenderName || '',
          ev.playTrigger || '',
          ev.opponentTrigger || '',
          ev.shotZone || '',
          ev.outcome || '',
          ev.quarter || '',
          ev.gameClock || '',
          (ev.activeLineup || []).join(' ')
        ].join(' ').toLowerCase();
        return str.includes(searchQ);
      });
    }

    // Sort chronologically or by ID
    document.getElementById('event-log-count-label').textContent = \`Showing \${combined.length} events\`;

    tbody.innerHTML = combined.map((ev, idx) => {
      var isOff = ev.eventType === 'OFFENSE';
      var typeBadge = isOff 
        ? '<span style="background:rgba(255,159,67,0.2); color:#ff9f43; padding:2px 8px; border-radius:4px; font-weight:800; font-size:11px;">🏀 OFF</span>'
        : '<span style="background:rgba(112,161,255,0.2); color:#70a1ff; padding:2px 8px; border-radius:4px; font-weight:800; font-size:11px;">🛡️ DEF</span>';

      var pName = isOff ? ev.playerName : ev.defenderName;
      var trigger = isOff ? ev.playTrigger : ev.opponentTrigger;
      var ptsTxt = isOff 
        ? (ev.points > 0 ? \`<strong style="color:var(--pos-green);">+\${ev.points} PTS</strong>\` : '<span style="color:#aaa;">0 PTS</span>')
        : (ev.pointsAllowed > 0 ? \`<strong style="color:#ff7777;">\${ev.pointsAllowed} PTS Allowed</strong>\` : '<span style="color:var(--pos-green); font-weight:700;">✓ STOP</span>');

      var lineupPills = (ev.activeLineup || []).map(p => {
        var short = PLAYER_EXPERIENCE[p] ? PLAYER_EXPERIENCE[p].short : p;
        return \`<span style="background:#1b1d28; padding:2px 4px; border-radius:3px; font-size:10px; margin:1px; display:inline-block;">\${short}</span>\`;
      }).join('');

      return \`<tr>
        <td><strong>#\${idx + 1}</strong></td>
        <td>\${typeBadge}</td>
        <td><strong style="color:var(--mac-gold);">\${ev.quarter}</strong> \${ev.gameClock}</td>
        <td><strong style="color:#fff;">\${pName}</strong></td>
        <td><span class="trigger-pill">\${trigger}</span></td>
        <td style="text-align:center;"><span class="sym-badge">\${ev.notationSymbol || ev.shotZone}</span></td>
        <td>\${ptsTxt} <span style="font-size:11px; color:#888;">(\${(ev.outcome || '').replace(/_/g,' ')})</span></td>
        <td>\${lineupPills}</td>
        <td style="font-size:11px; color:#888;">\${ev.opponent || 'Pronghorns'}</td>
      </tr>\`;
    }).join('');
  }

  function matchesSubFilter(ev, type) {
    if (currentSubFilter === 'all') return true;
    if (currentSubFilter === 'Q1' || currentSubFilter === 'Q2' || currentSubFilter === 'Q3' || currentSubFilter === 'Q4') {
      return ev.quarter === currentSubFilter;
    }
    if (currentSubFilter === 'PnR' || currentSubFilter === 'Cut' || currentSubFilter === 'Tran') {
      var trig = type === 'offense' ? ev.playTrigger : ev.opponentTrigger;
      return trig === currentSubFilter;
    }
    if (currentSubFilter === 'R') {
      return ev.shotZone === 'R';
    }
    if (currentSubFilter === '3PT') {
      return ev.shotZone === 'C' || ev.shotZone === 'D';
    }
    if (currentSubFilter === 'contested') {
      return !!ev.isContested;
    }
    return true;
  }

  /* EXPORT CSV HANDLER */
  function exportActiveViewCSV() {
    var curOff = getActiveOffenseEvents();
    var curDef = getActiveDefenseEvents();
    var csv = "";
    var filename = "macewan_database_export.csv";

    if (currentView.startsWith('offense')) {
      filename = "macewan_offense_events.csv";
      var headers = ["id", "gameId", "opponent", "date", "quarter", "clock", "shooter", "trigger", "zone", "contested", "outcome", "pts", "symbol", "lineup"];
      csv = headers.join(",") + "\\n";
      curOff.forEach(r => {
        csv += [r.id, r.gameId, '"'+r.opponent+'"', r.date, r.quarter, r.gameClock, '"'+r.playerName+'"', '"'+r.playTrigger+'"', r.shotZone, r.isContested, r.outcome, r.points, '"'+r.notationSymbol+'"', '"'+(r.activeLineup||[]).join(';')+'"'].join(",") + "\\n";
      });
    } else if (currentView.startsWith('defense')) {
      filename = "macewan_defense_events.csv";
      var headers = ["id", "gameId", "opponent", "date", "quarter", "clock", "defender", "trigger", "zone", "contested", "outcome", "ptsAllowed", "symbol", "lineup"];
      csv = headers.join(",") + "\\n";
      curDef.forEach(r => {
        csv += [r.id, r.gameId, '"'+r.opponent+'"', r.date, r.quarter, r.gameClock, '"'+r.defenderName+'"', '"'+r.opponentTrigger+'"', r.shotZone, r.isContested, r.outcome, r.pointsAllowed, '"'+r.notationSymbol+'"', '"'+(r.activeLineup||[]).join(';')+'"'].join(",") + "\\n";
      });
    } else {
      filename = "macewan_lineup_stints.csv";
      var stints = getActiveStints();
      var headers = ["stintId", "players", "sequence", "net", "veteransCount"];
      csv = headers.join(",") + "\\n";
      stints.forEach(s => {
        csv += [s.id, '"'+s.players.join(';')+'"', '"'+s.seq+'"', s.net, s.vetCount].join(",") + "\\n";
      });
    }

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }

  function openAddGameModal() {
    document.getElementById('add-game-modal').style.display = 'flex';
  }
  function closeAddGameModal() {
    document.getElementById('add-game-modal').style.display = 'none';
  }

  function handleSaveNewGame(e) {
    e.preventDefault();
    const opponent = document.getElementById('input-opponent').value.trim();
    const date = document.getElementById('input-date').value;
    const gameType = document.getElementById('input-type').value;
    const stintsRawText = document.getElementById('input-stints-text').value.trim();

    if (!opponent || !date || !stintsRawText) return;

    const lines = stintsRawText.split('\\n');
    const newStints = [];
    lines.forEach((line, idx) => {
      const parts = line.split('|');
      if (parts.length >= 2) {
        const playerNamesRaw = parts[0].split(',').map(x => x.trim());
        const seq = parts[1].trim();
        
        // Match abbreviations to full roster names
        const fullPlayers = playerNamesRaw.map(short => {
          for (let name in PLAYER_EXPERIENCE) {
            if (PLAYER_EXPERIENCE[name].short.toLowerCase() === short.toLowerCase() || name.toLowerCase().includes(short.toLowerCase())) {
              return name;
            }
          }
          return short;
        });

        const seqVals = seq.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        const net = seqVals.reduce((a,b) => a+b, 0);

        newStints.push({
          id: idx + 1,
          page: 1,
          players: fullPlayers,
          shortNames: playerNamesRaw,
          seq: seq,
          vals: seqVals,
          net: net
        });
      }
    });

    const newGame = {
      gameId: 'game_' + date.replace(/-/g,'') + '_' + opponent.toLowerCase().replace(/\\s+/g,''),
      opponent: opponent,
      date: date,
      gameType: gameType,
      location: 'Home Gym',
      stints: newStints
    };

    gamesData.push(newGame);
    localStorage.setItem('macewan_lineup_games', JSON.stringify(gamesData));
    activeGameId = newGame.gameId;

    closeAddGameModal();
    populateGameDropdown();
    renderAllViews();
    alert('✅ Successfully logged ' + newStints.length + ' lineup stints for ' + opponent + '!');
  }

  window.onload = initApp;
</script>

</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'lineup-tracker.html'), htmlContent, 'utf8');
console.log('✅ Generated MacEwan Database (lineup-tracker.html) with Offense, Defense, and Lineup analytics successfully!');
