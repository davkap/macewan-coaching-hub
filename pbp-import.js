/* Play-by-play importer for the Shot Tracker.

   Reads a Sidearm box score page (the "Play-By-Play" tab every Canada West
   school site uses, e.g. macewangriffins.ca or mrucougars.com) and turns it
   into Shot Tracker events: every shot, free-throw trip, turnover, rebound,
   foul, sub and timeout, with the correct player, clock and score.

   What the play-by-play can't know (where the shot went up, the trigger, the
   contest, catch-and-shoot or off the dribble, who was guarding) is left for
   the coach: each such event is marked `pbp.todo` and the tracker walks the
   coach through them one at a time ("film review").

   Page shape this relies on (Sidearm, Oct 2026):
   - one <table class="play-by-play"> per period, caption "Play By Play - 1st"
     (… 2nd, 3rd, 4th, OT, 2OT …). Every period is in the page, even the
     ones on hidden tabs.
   - each row: cell 0 the clock ("09:51" or "--" = same as the row above),
     cell 1 the LEFT team's play, cell 5 the RIGHT team's play. The header
     cells 1 and 5 hold the two teams' short names (e.g. MRU, MAC).
   - box score tables captioned "<Team name> <points>" with a GS column where
     starters are marked "*". Their names ("Alba Gabaldon, Jose Miguel") are
     the same people the play-by-play writes as "ALBA GABALDON,JOSE M".

   Exposes window.GriffinPBP = { parseHTML, parseDoc, build }. No DOM access
   outside parseHTML/parseDoc, so `build` can be tested on plain objects. */
(function (root) {
  "use strict";

  const clean = s => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  const norm = s => clean(s).toUpperCase().replace(/[^A-Z0-9, ]/g, "").replace(/\s*,\s*/g, ",");

  /* "09:51" → 591 seconds left. "--" or blank → null (same as the row above). */
  function clockSec(t) {
    const m = String(t || "").match(/(\d{1,2}):(\d{2})/);
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }

  /* "Play By Play - 3rd" → 3, "OT" → 5, "2OT" / "2nd OT" → 6 */
  function periodOf(caption, fallback) {
    const c = clean(caption).toUpperCase();
    const ot = c.match(/(\d)?\s*(?:ST|ND|RD|TH)?\s*OT\b|OVERTIME/);
    if (ot) return 4 + (ot[1] ? +ot[1] : 1);
    const q = c.match(/(\d)\s*(?:ST|ND|RD|TH)/);
    return q ? +q[1] : fallback;
  }

  /* ---------- reading the page ---------- */
  function parseHTML(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    return parseDoc(doc);
  }

  function parseDoc(doc) {
    const out = { title: clean(doc.title), date: null, sides: { L: {}, R: {} }, teams: [], periods: [] };
    const dm = out.title.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dm) out.date = dm[3] + "-" + dm[1].padStart(2, "0") + "-" + dm[2].padStart(2, "0");

    const tables = Array.from(doc.querySelectorAll("table"));

    /* Box score: the full-game table for each team has a GS (starter) column. */
    tables.forEach(t => {
      if (!t.tHead || !t.tHead.rows[0]) return;
      const headCells = Array.from(t.tHead.rows[0].cells).map(c => clean(c.textContent).toUpperCase());
      const gsCol = headCells.indexOf("GS");
      if (gsCol < 0 || !headCells.some(h => /PLAYER/.test(h))) return;   // per-quarter tables have no GS
      const cap = t.caption ? clean(t.caption.textContent) : "";
      const m = cap.match(/^(.*?)\s+(\d+)$/);
      if (!m) return;
      const team = { name: m[1], pts: +m[2], players: [] };
      Array.from(t.tBodies[0] ? t.tBodies[0].rows : []).forEach(r => {
        const cells = Array.from(r.cells);
        if (cells.length < 3) return;
        const link = r.querySelector("a");
        let nm = clean(link ? link.textContent : cells[1].textContent);
        const num = clean(cells[0].textContent);
        nm = nm.replace(new RegExp("^" + num + "\\s+"), "");          // phone layout repeats the number
        if (!nm || /^TEAM$/i.test(nm) || /^TM$/i.test(num) || /total/i.test(nm)) return;
        const starter = gsCol > -1 && cells[gsCol] ? /\*/.test(cells[gsCol].textContent) : false;
        team.players.push({ num: num.replace(/\D/g, ""), name: nm, starter });
      });
      if (team.players.length) out.teams.push(team);
    });

    /* Play-by-play, one table per period. */
    tables.filter(t => /play-by-play/.test(t.className) || /play by play/i.test(t.caption ? t.caption.textContent : ""))
      .forEach((t, i) => {
        const cap = t.caption ? t.caption.textContent : "";
        if (!/play by play/i.test(cap)) return;
        const th = t.tHead && t.tHead.rows[0] ? Array.from(t.tHead.rows[0].cells).map(c => clean(c.textContent)) : [];
        if (th[1] && !out.sides.L.abbr) out.sides.L.abbr = th[1];
        if (th[5] && !out.sides.R.abbr) out.sides.R.abbr = th[5];
        const rows = [];
        Array.from(t.tBodies[0] ? t.tBodies[0].rows : []).forEach(r => {
          const c = r.cells;
          if (!c || c.length < 6) return;
          const left = clean(c[1].textContent), right = clean(c[5].textContent);
          const text = left || right;
          if (!text) return;
          rows.push({ t: clean(c[0].textContent), side: left ? "L" : "R", text });
        });
        out.periods.push({ p: periodOf(cap, i + 1), rows });
      });
    out.periods.sort((a, b) => a.p - b.p);
    return out;
  }

  /* ---------- names ---------- */
  /* "Alba Gabaldon, Jose Miguel" and "ALBA GABALDON,JOSE M" → same key. */
  function nameKey(n) {
    const s = norm(n);
    const [last, first] = s.includes(",") ? s.split(",") : [s.split(" ").slice(-1)[0], s.split(" ").slice(0, -1).join(" ")];
    return { last: (last || "").trim(), first: (first || "").trim() };
  }
  function sameName(a, b) {
    const A = nameKey(a), B = nameKey(b);
    if (!A.last || !B.last) return false;
    if (A.last !== B.last) return false;
    if (!A.first || !B.first) return true;
    const fa = A.first.split(" ")[0], fb = B.first.split(" ")[0];
    return fa.startsWith(fb) || fb.startsWith(fa);
  }
  /* Typos happen ("ZIOLKOWSI" for Ziolkowski): same first name and a last
     name one or two letters off. */
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function closeName(a, b) {
    if (sameName(a, b)) return true;
    const A = nameKey(a), B = nameKey(b);
    if (!A.first || !B.first || A.first.split(" ")[0] !== B.first.split(" ")[0]) return false;
    return lev(A.last, B.last) <= 2;
  }
  /* "Ryan Ziolkowski" (tracker roster, first-last) → "Ziolkowski, Ryan" */
  const lastFirst = n => { const p = clean(n).split(" "); return p.length < 2 ? clean(n) : p.slice(-1)[0] + ", " + p.slice(0, -1).join(" "); };
  const firstLast = n => { const s = clean(n); if (!s.includes(",")) return s; const [l, f] = s.split(","); return clean(f) + " " + clean(l); };

  /* ---------- turning plays into tracker events ---------- */
  const SHOT_RE = /^(GOOD|MISS)\s+(3PTR|JUMPER|LAYUP|DUNK|TIPIN|FT|HOOK|FADEAWAY)\b/;

  /* One play row → an action. `by` is the name after "by", flags are the
     scorer's bracketed notes: (fastbreak), (in the paint), (2nd chance)… */
  function readRow(text) {
    const flags = [];
    let s = String(text).replace(/\(([^)]*)\)/g, (_, f) => { flags.push(f.toLowerCase()); return ""; }).trim();
    const m = s.match(/^(.*?)\s+by\s+(.+)$/i);
    const what = clean(m ? m[1] : s).toUpperCase();
    const by = m ? clean(m[2]) : "";
    const a = { what, by: /^TEAM$/i.test(by) ? "" : by, flags };
    const sh = what.match(SHOT_RE);
    if (sh) { a.kind = sh[2] === "FT" ? "ft" : "shot"; a.made = sh[1] === "GOOD"; a.shot = sh[2]; }
    else if (/^REBOUND/.test(what)) { a.kind = "reb"; a.rtype = (what.match(/OFF|DEF|DEADB/) || [""])[0]; }
    else if (/^TURNOVE?R/.test(what)) a.kind = "to";
    else if (/^STEAL/.test(what)) a.kind = "stl";
    else if (/^ASSIST/.test(what)) a.kind = "ast";
    else if (/^BLOCK/.test(what)) a.kind = "blk";
    else if (/^FOUL/.test(what)) { a.kind = "foul"; a.tech = /TECH/.test(what); }
    else if (/^SUB IN/.test(what)) a.kind = "in";
    else if (/^SUB OUT/.test(what)) a.kind = "out";
    else if (/^TIMEOUT/.test(what)) { a.kind = "timeout"; a.media = /MEDIA|TV/.test(what); }
    else a.kind = "other";
    return a;
  }

  /*
    parsed : from parseDoc
    opts   : {
      usSide      "L" | "R" (default: the side whose team name contains opts.usMatch)
      usMatch     regex for our team name (default /macewan/i)
      usRoster    the tracker's roster [{id,num,name,pos}]
      oppRoster   opponent roster if known (numbers/names), may be []
      playTypes   the staff's trigger list (TRANS / ORB are filled in when the scorer says so)
      uid         id maker
    }
    → { events, usRoster, oppRoster, usSide, teams:{us,them}, summary, warnings }
  */
  function build(parsed, opts) {
    opts = opts || {};
    const uid = opts.uid || (() => Math.random().toString(36).slice(2, 10));
    const warnings = [];
    const L = parsed.sides.L.abbr || "", R = parsed.sides.R.abbr || "";

    /* Which box table belongs to which column: whichever team's players the
       column's plays name. */
    const sideNames = { L: new Set(), R: new Set() };
    parsed.periods.forEach(pp => pp.rows.forEach(r => { const a = readRow(r.text); if (a.by) sideNames[r.side].add(a.by); }));
    const score = (team, side) => team.players.filter(p => Array.from(sideNames[side]).some(n => sameName(n, p.name))).length;
    let teamL = null, teamR = null;
    if (parsed.teams.length >= 2) {
      const [a, b] = parsed.teams;
      if (score(a, "L") + score(b, "R") >= score(a, "R") + score(b, "L")) { teamL = a; teamR = b; } else { teamL = b; teamR = a; }
    }
    const usMatch = opts.usMatch || /macewan/i;
    let usSide = opts.usSide;
    if (!usSide) {
      if (teamL && usMatch.test(teamL.name)) usSide = "L";
      else if (teamR && usMatch.test(teamR.name)) usSide = "R";
      else if (/^MAC/i.test(L)) usSide = "L";
      else usSide = "R";
    }
    const themSide = usSide === "L" ? "R" : "L";
    const box = { [usSide]: usSide === "L" ? teamL : teamR, [themSide]: usSide === "L" ? teamR : teamL };
    const teamOf = side => (side === usSide ? "us" : "them");

    /* Rosters: our tracker roster (matched by jersey number from the box
       score, then by name), plus anyone the box score has that we don't. */
    const usRoster = JSON.parse(JSON.stringify(opts.usRoster || []));
    const oppRoster = JSON.parse(JSON.stringify(opts.oppRoster || []));
    const ids = { us: new Map(), them: new Map() };   // box/pbp name → tracker id
    const boxNames = { us: [], them: [] };            // [box score name, tracker id]

    function attach(list, team, boxTeam) {
      (boxTeam ? boxTeam.players : []).forEach(bp => {
        let p = list.find(x => sameName(lastFirst(x.name), bp.name)) ||
                list.find(x => bp.num && String(x.num) === bp.num && closeName(lastFirst(x.name), bp.name)) ||
                list.find(x => closeName(lastFirst(x.name), bp.name));
        if (!p && bp.num) {
          const byNum = list.find(x => String(x.num) === bp.num && (!x.name || !String(x.name).trim()));
          if (byNum) { byNum.name = firstLast(bp.name); p = byNum; }
        }
        if (!p) {
          p = { id: uid(), num: bp.num, name: firstLast(bp.name), pos: "" };
          list.push(p);
          if (team === "us") warnings.push(firstLast(bp.name) + " (#" + bp.num + ") was not on our roster, so he was added to this game.");
        }
        if (!p.num && bp.num) p.num = bp.num;
        bp.id = p.id;
        ids[team].set(norm(bp.name), p.id);
        boxNames[team].push([bp.name, p.id]);
      });
    }
    attach(usRoster, "us", box[usSide]);
    attach(oppRoster, "them", box[themSide]);

    function idFor(team, by) {
      if (!by) return null;
      const k = norm(by);
      if (ids[team].has(k)) return ids[team].get(k);
      /* the box score writes the same names ("Alba Gabaldon, Jose Miguel"),
         so it settles two-word surnames that a first-last roster can't */
      const hit = boxNames[team].find(b => sameName(b[0], by)) || boxNames[team].find(b => closeName(b[0], by));
      if (hit) { ids[team].set(k, hit[1]); return hit[1]; }
      const list = team === "us" ? usRoster : oppRoster;
      let p = list.find(x => sameName(lastFirst(x.name), by)) || list.find(x => closeName(lastFirst(x.name), by));
      if (!p) {
        p = { id: uid(), num: "", name: firstLast(by.replace(/,/, ", ").toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())), pos: "" };
        list.push(p);
        if (team === "us") warnings.push(p.name + " is in the play-by-play but not on our roster, so he was added without a number.");
      }
      ids[team].set(k, p.id);
      return p.id;
    }

    /* Flatten every row into actions with period, clock and team. */
    const acts = [];
    parsed.periods.forEach(pp => {
      let c = 600;
      if (pp.p > 4) c = 300;
      pp.rows.forEach(r => {
        const a = readRow(r.text);
        const t = clockSec(r.t);
        if (t != null) c = t;
        a.p = pp.p; a.c = c; a.side = r.side; a.team = teamOf(r.side);
        a.pl = idFor(a.team, a.by);
        acts.push(a);
      });
    });

    const sameMoment = (a, b) => a.p === b.p && Math.abs(a.c - b.c) <= 1;
    const pts = { us: 0, them: 0 };
    const hasPT = pt => (opts.playTypes || []).indexOf(pt) > -1;

    /* --- pass 1: link the pieces of each play together --- */
    for (let i = 0; i < acts.length; i++) {
      const a = acts[i];
      if (a.kind === "shot") {
        /* assist, block and an and-1 sit in the rows right after the shot */
        for (let j = i + 1; j < acts.length && sameMoment(acts[j], a); j++) {
          const b = acts[j];
          if (b.kind === "shot" || b.kind === "to") break;
          if (b.kind === "ast" && a.made && b.team === a.team && !b.used) { a.ast = b.pl; b.used = true; }
          if (b.kind === "blk" && !a.made && b.team !== a.team && !b.used) { a.blk = b.pl; b.used = true; }
        }
      }
      if (a.kind === "to") {
        for (let j = Math.max(0, i - 3); j < Math.min(acts.length, i + 4); j++) {
          const b = acts[j];
          if (b === a || b.used || !sameMoment(a, b)) continue;
          if (b.kind === "stl" && b.team !== a.team) { a.stl = b.pl; a.live = true; b.used = true; }
          if (b.kind === "foul" && !b.tech && b.team === a.team && b.pl && b.pl === a.pl) { a.offFoul = true; b.used = true; }
        }
      }
    }

    /* Free-throw trips: back-to-back FTs by one shooter at one moment. */
    for (let i = 0; i < acts.length; i++) {
      const a = acts[i];
      if (a.kind !== "ft" || a.used) continue;
      const trip = [a];
      for (let j = i + 1; j < acts.length && sameMoment(acts[j], a); j++) {
        const b = acts[j];
        if (b.kind === "ft" && b.pl === a.pl && b.team === a.team && !b.used) trip.push(b);
        else if (b.kind === "ft" || b.kind === "shot" || b.kind === "to") break;
      }
      trip.forEach(t => (t.used = true));
      a.trip = trip;
      a.seq = trip.map(t => (t.made ? "M" : "X")).join("");

      /* The foul that sent him to the line: the latest unclaimed foul by the
         other team in the few seconds before. */
      let foul = null;
      for (let j = i - 1; j >= 0 && acts[j].p === a.p && acts[j].c - a.c <= 4; j--) {
        const b = acts[j];
        if (b.kind === "foul" && !b.used && b.team !== a.team && !b.tech) { foul = b; break; }
      }
      const tech = !foul && acts.slice(Math.max(0, i - 6), i).some(b => b.kind === "foul" && b.tech && sameMoment(b, a));

      /* A single free throw right after his own basket is an and-1. */
      if (trip.length === 1 && !tech) {
        for (let j = i - 1; j >= 0 && acts[j].p === a.p && acts[j].c - a.c <= 3; j--) {
          const s = acts[j];
          if (s.kind === "shot" && s.made && s.pl === a.pl && s.team === a.team && !s.and1) {
            s.and1 = true; s.ftMade = a.made; if (foul) { s.fouler = foul.pl; foul.used = true; }
            a.andOf = s; break;
          }
          if (s.kind === "shot" || s.kind === "to") break;
        }
        if (a.andOf) { delete a.trip; continue; }      // written with the basket, not as its own trip
      }
      if (foul) { foul.used = true; a.fouler = foul.pl; a.foulCount = foul.teamFoulsBefore; }
      a.noFoul = !foul;
      a.tech = tech;
    }

    /* Team fouls before each foul, for the bonus question below. */
    const tf = {};
    acts.forEach(a => {
      if (a.kind !== "foul" || a.tech) return;
      const k = a.team + a.p;
      a.teamFoulsBefore = tf[k] || 0;
      tf[k] = (tf[k] || 0) + 1;
    });
    acts.forEach(a => {
      if (a.kind === "ft" && a.trip && !a.noFoul) {
        const f = acts.find(b => b.kind === "foul" && b.pl === a.fouler && b.used && b.p === a.p && b.c >= a.c && b.c - a.c <= 4);
        a.inBonus = f ? f.teamFoulsBefore >= 4 : false;   // FIBA: the 5th team foul in a quarter is the first in the bonus
      }
    });

    /* --- pass 2: write the events --- */
    const events = [];
    const push = (ev, a) => { ev.id = uid(); ev.p = a.p; ev.c = a.c; events.push(ev); return ev; };
    const zone = cls => ({
      rim: { zone: "rim", x: 250, y: 72 }, paint: { zone: "paint", x: 250, y: 150 },
      mid: { zone: "midT", x: 250, y: 258 }, three: { zone: "t3", x: 250, y: 312 }
    }[cls]);

    /* Who's on the floor for us at the start of each period. Quarter 1 comes
       from the box score's starters; later quarters from who plays before he
       is subbed in, topped up from the end of the previous quarter. */
    const usStarters = box[usSide] ? box[usSide].players.filter(p => p.starter).map(p => p.id) : [];
    let floor = [];
    let pendingReb = null;      // team whose miss is still waiting for a board
    let lastOwnOreb = null;     // {team, idx} to tag putbacks as ORB

    parsed.periods.forEach(pp => {
      const pa = acts.filter(a => a.p === pp.p);
      const seen = [], firstIn = new Set();
      pa.forEach(a => {
        if (a.team !== "us" || !a.pl || seen.indexOf(a.pl) > -1) return;
        seen.push(a.pl);
        if (a.kind === "in") firstIn.add(a.pl);
      });
      let start = pp.p === 1 && usStarters.length === 5 ? usStarters.slice()
        : seen.filter(id => !firstIn.has(id)).slice(0, 5);
      if (start.length < 5) floor.forEach(id => { if (start.length < 5 && start.indexOf(id) < 0 && !firstIn.has(id)) start.push(id); });
      if (start.length < 5) warnings.push("Couldn't work out all five of our starters for " + (pp.p <= 4 ? "Q" + pp.p : "OT" + (pp.p - 4)) + " — check the lineup there.");
      push({ type: "lineup", team: "us", ids: start.slice() }, { p: pp.p, c: pp.p <= 4 ? 600 : 300 });
      floor = start.slice();
      pendingReb = null;

      for (let k = 0; k < pa.length; k++) {
        const a = pa[k];
        if (a.used && a.kind !== "ft") continue;

        if (a.kind === "in" || a.kind === "out") {
          if (a.team !== "us") continue;
          /* every sub at this moment goes in as one swap */
          const ins = [], outs = [];
          let j = k;
          /* only other subs are skipped over here: anything else at this
             moment (their free throws, a foul) is still to be written */
          for (; j < pa.length && pa[j].c === a.c && (pa[j].kind === "in" || pa[j].kind === "out"); j++) {
            const b = pa[j];
            if (b.team !== "us" || !b.pl) continue;
            if (b.kind === "in" && ins.indexOf(b.pl) < 0 && floor.indexOf(b.pl) < 0) ins.push(b.pl);
            if (b.kind === "out" && outs.indexOf(b.pl) < 0 && floor.indexOf(b.pl) > -1) outs.push(b.pl);
          }
          k = j - 1;
          if (!ins.length && !outs.length) continue;
          push({ type: "sub", team: "us", in: ins, out: outs }, a);
          const nf = floor.map(id => (outs.indexOf(id) > -1 && ins.length ? ins.shift() : id)).filter(id => outs.indexOf(id) < 0);
          floor = nf.concat(ins.filter(id => nf.indexOf(id) < 0));
          continue;
        }

        if (a.kind === "shot") {
          let cls = a.shot === "3PTR" ? "three" : (a.shot === "LAYUP" || a.shot === "DUNK" || a.shot === "TIPIN") ? "rim" : "mid";
          if (cls === "mid" && a.flags.some(f => /paint/.test(f))) cls = "paint";
          const z = zone(cls);
          let pt = "Unknown";
          if (a.flags.some(f => /fast ?break/.test(f)) && hasPT("TRANS")) pt = "TRANS";
          else if ((a.shot === "TIPIN" || a.flags.some(f => /2nd|second/.test(f)) ||
                   (lastOwnOreb && lastOwnOreb.team === a.team && lastOwnOreb.k === k - 1)) && hasPT("ORB")) pt = "ORB";
          const ev = {
            type: "shot", team: a.team, pl: a.pl, pt, cls, zone: z.zone, x: z.x, y: z.y, preset: true,
            st: null, ct: null, made: !!a.made, and1: !!a.and1, blocked: !!a.blk,
            pbp: { todo: true, shot: a.shot, flags: a.flags }
          };
          if (a.and1) ev.ftMade = !!a.ftMade;
          if (a.ast) ev.ast = a.ast;
          if (a.blk) ev.blk = a.blk;
          if (a.fouler) ev.fouler = a.fouler;
          push(ev, a);
          if (a.made) pts[a.team] += cls === "three" ? 3 : 2;
          if (a.and1 && a.ftMade) pts[a.team] += 1;
          pendingReb = (!a.made || (a.and1 && !a.ftMade)) ? a.team : null;
          lastOwnOreb = null;
          continue;
        }

        if (a.kind === "ft") {
          if (!a.trip) continue;                 // part of a trip already written, or an and-1
          const n = a.trip.length;
          const ev = { type: "ft", team: a.team, pl: a.pl, pt: "Unknown", seq: a.seq };
          if (a.fouler) ev.fouler = a.fouler;
          if (a.noFoul) ev.noFoul = true;
          /* Not in the bonus, two or three shots: he was fouled shooting —
             a chance the coach places on the court. In the bonus it could be
             either, so it's asked. One shot with no basket (a technical, or a
             foul the scorer didn't log) is just points. */
          if (!a.noFoul && (n === 3 || (n === 2 && !a.inBonus))) {
            const cls = n === 3 ? "three" : "rim", z = zone(cls);
            Object.assign(ev, { cls, zone: z.zone, x: z.x, y: z.y, preset: true, st: null, ct: null });
            ev.pbp = { todo: true, ftTrip: n, shooting: true };
          } else if (!a.noFoul && n === 2) {
            ev.pbp = { todo: true, ftTrip: n, shooting: null };   // bonus: shooting foul or not?
          } else {
            ev.pbp = { todo: false, ftTrip: n };
          }
          if (a.flags.some(f => /fast ?break/.test(f)) && hasPT("TRANS")) ev.pt = "TRANS";
          push(ev, a);
          pts[a.team] += (a.seq.match(/M/g) || []).length;
          pendingReb = a.seq.slice(-1) === "X" ? a.team : null;
          continue;
        }

        if (a.kind === "to") {
          const ev = {
            type: "to", team: a.team, pl: a.pl, pt: "Unknown", live: !!a.live,
            kind: a.offFoul ? "Offensive foul" : null, cls: null, zone: null,
            pbp: { todo: true }
          };
          if (a.stl) ev.stl = a.stl;
          push(ev, a);
          pendingReb = null;
          lastOwnOreb = null;
          continue;
        }

        if (a.kind === "reb") {
          if (a.pl) {
            push({ type: "reb", team: a.team, pl: a.pl }, a);
            pendingReb = null;
            lastOwnOreb = a.rtype === "OFF" ? { team: a.team, k } : null;
          } else if (pendingReb) {
            /* a team rebound (out of bounds off someone): it only counts when
               a live miss is waiting for a board */
            push({ type: "reb", team: a.team, pl: null }, a);
            lastOwnOreb = a.team === pendingReb ? { team: a.team, k } : null;
            pendingReb = null;
          }
          continue;
        }

        if (a.kind === "foul") {
          if (a.used) continue;
          push({ type: "foul", team: a.team, pl: a.pl }, a);
          continue;
        }

        if (a.kind === "timeout") {
          if (!a.media) push({ type: "timeout", team: a.team }, a);
          continue;
        }
      }
      push({ type: "period_end" }, { p: pp.p, c: 0 });
    });

    const tUs = box[usSide], tThem = box[themSide];
    const summary = {
      us: { name: tUs ? tUs.name : (usSide === "L" ? L : R), abbr: usSide === "L" ? L : R, pts: pts.us, boxPts: tUs ? tUs.pts : null },
      them: { name: tThem ? tThem.name : (usSide === "L" ? R : L), abbr: usSide === "L" ? R : L, pts: pts.them, boxPts: tThem ? tThem.pts : null },
      periods: parsed.periods.length,
      shots: events.filter(e => e.type === "shot").length,
      trips: events.filter(e => e.type === "ft").length,
      tos: events.filter(e => e.type === "to").length,
      todo: events.filter(e => e.pbp && e.pbp.todo).length,
      date: parsed.date
    };
    if (summary.us.boxPts != null && summary.us.boxPts !== pts.us)
      warnings.push("Our points add up to " + pts.us + " but the box score says " + summary.us.boxPts + ".");
    if (summary.them.boxPts != null && summary.them.boxPts !== pts.them)
      warnings.push("Their points add up to " + pts.them + " but the box score says " + summary.them.boxPts + ".");
    return { events, usRoster, oppRoster, usSide, summary, warnings };
  }

  const api = { parseHTML, parseDoc, build, readRow, sameName, closeName };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GriffinPBP = api;
})(typeof window !== "undefined" ? window : globalThis);
