// Shared by build_scout_cards.js and scripts/lib/scout-writer.js so the scout cards
// and the scouting report always give a player the same closeout call.

// "5-16" -> [5, 16]
function madeAtt(s) {
  const m = String(s || '').match(/(\d+)\s*-\s*(\d+)/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [0, 0];
}

/* Closeout call from the player's season 3PT shooting (staff rules):
     under 20%            -> Shaq
     20% to under 33%     -> Rose
     33% to 38%           -> Book  (only if he takes 2+ threes a game)
     over 38%             -> Klay  (only if he takes 2+ threes a game)
   A good percentage on fewer than 2 threes a game isn't a shooter yet: Rose.
   A player who hasn't played yet gets no call. */
function closeoutFor(info) {
  if (!info.st || !info.gp) return '';
  const pct = info.fg3a ? (100 * info.fg3m / info.fg3a) : 0;
  if (pct < 20) return 'Shaq';
  if (pct < 33 || info.fg3aPg < 2) return 'Rose';
  return pct <= 38 ? 'Book' : 'Klay';
}

module.exports = { madeAtt, closeoutFor };
