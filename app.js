/* NumberGuy — vanity phone number engine. Pure client-side, no build step. */
(function () {
  "use strict";

  // --- Keypad maps ---
  const KEYPAD = {
    a: "2", b: "2", c: "2",
    d: "3", e: "3", f: "3",
    g: "4", h: "4", i: "4",
    j: "5", k: "5", l: "5",
    m: "6", n: "6", o: "6",
    p: "7", q: "7", r: "7", s: "7",
    t: "8", u: "8", v: "8",
    w: "9", x: "9", y: "9", z: "9",
  };

  const MIN_WORD_LEN = 3;
  const MAX_RESULTS = 200;
  let pageSize = 10; // 0 = show all on one page

  // Selected country (drives the dial-code prefix + how numbers are parsed).
  let selectedCountry = { name: "United States", iso: "US", dial: "1", nanp: true };

  function isoToFlag(iso) {
    return String(iso).toUpperCase().replace(/[A-Z]/g, function (c) {
      return String.fromCodePoint(127397 + c.charCodeAt(0));
    });
  }

  // --- Build digit-signature index from the word list ---
  const sigToWords = new Map(); // "3569377" -> [{word, rank}]
  const wordRank = new Map();   // "flowers" -> 12 (lower = more common/marketable)
  let TOTAL_WORDS = 1;

  function wordToDigits(word) {
    let out = "";
    for (const ch of word.toLowerCase()) {
      if (KEYPAD[ch]) out += KEYPAD[ch];
      else if (ch >= "0" && ch <= "9") out += ch;
    }
    return out;
  }

  let masterWords = [];

  // Accept many shapes: array of strings, array of objects (.word/.term/.text/
  // .value/.w), a Set, or a delimited string. Returns a flat string array.
  function normalizeWords(input) {
    if (!input) return [];
    if (typeof input === "string") return input.split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (typeof Set !== "undefined" && input instanceof Set) input = Array.from(input);
    if (!Array.isArray(input)) return [];
    const out = [];
    for (const item of input) {
      if (!item) continue;
      if (typeof item === "string") out.push(item);
      else if (typeof item === "object") {
        const w = item.word || item.term || item.text || item.value || item.w;
        if (w) out.push(String(w));
      }
    }
    return out;
  }

  function buildIndex(words) {
    sigToWords.clear();
    wordRank.clear();
    const seen = new Set();
    let rank = 0;
    for (const raw of words) {
      if (typeof raw !== "string") continue;
      const w = raw.toLowerCase();
      rank++;
      if (seen.has(w)) continue;
      seen.add(w);
      if (w.length < MIN_WORD_LEN) continue;
      const sig = wordToDigits(w);
      if (sig.length !== w.length) continue; // contained non-letters
      if (!sigToWords.has(sig)) sigToWords.set(sig, []);
      sigToWords.get(sig).push({ word: w, rank });
      if (!wordRank.has(w)) wordRank.set(w, rank);
    }
    for (const arr of sigToWords.values()) arr.sort((a, b) => a.rank - b.rank);
    TOTAL_WORDS = words.length || 1;
  }

  // --- Phone parsing ---
  function cleanDigits(s) {
    return (s || "").replace(/\D/g, "");
  }

  function parsePhone(digits) {
    const dial = selectedCountry.dial;
    let rest = digits;
    // Strip the country code if the user typed it (e.g. pasted a full number).
    if (dial && rest.indexOf(dial) === 0 && rest.length - dial.length >= 7) {
      rest = rest.slice(dial.length);
    }
    let area = "";
    let local = rest;
    let showCC = false;
    if (selectedCountry.nanp) {
      if (rest.length > 7) {
        local = rest.slice(-7);
        area = rest.slice(0, rest.length - 7);
        showCC = true;
      }
    } else {
      local = rest;
      showCC = rest.length >= 7; // show +code once it's a full-length number
    }
    return { country: showCC ? dial : "", area: area, local: local, nanp: selectedCountry.nanp };
  }

  // "1" for NANP, "+44" otherwise.
  function countryLabel(parts) {
    if (!parts.country) return "";
    return parts.nanp ? parts.country : "+" + parts.country;
  }

  function formatPhone(digits) {
    const d = cleanDigits(digits);
    let country = "";
    let rest = d;
    if (rest.length === 11 && rest[0] === "1") {
      country = "+1 ";
      rest = rest.slice(1);
    }
    if (rest.length === 10) {
      return country + "(" + rest.slice(0, 3) + ") " + rest.slice(3, 6) + "-" + rest.slice(6);
    }
    if (rest.length === 7) {
      return rest.slice(0, 3) + "-" + rest.slice(3);
    }
    return country + rest;
  }

  // --- Suggestion assembly ---
  function makeSuggestion(zone, wordSegs) {
    const sorted = wordSegs.slice().sort((a, b) => a.start - b.start);
    const segs = [];
    let pos = 0;
    let lettersCovered = 0;
    for (const ws of sorted) {
      if (ws.start > pos) segs.push({ type: "digit", text: zone.slice(pos, ws.start) });
      segs.push({ type: "word", text: ws.word.toUpperCase(), len: ws.word.length, rank: ws.rank });
      lettersCovered += ws.word.length;
      pos = ws.end;
    }
    if (pos < zone.length) segs.push({ type: "digit", text: zone.slice(pos) });
    return { segs, lettersCovered, zoneLen: zone.length };
  }

  function scoreSuggestion(s) {
    const wordSegs = s.segs.filter((x) => x.type === "word");
    const digitSegs = s.segs.filter((x) => x.type === "digit");
    let sc = s.lettersCovered * 50;
    if (s.lettersCovered === s.zoneLen) sc += 180;
    sc -= (s.segs.length - 1) * 45; // strongly prefer fewer words (a clean single word beats noisy 2-word splits)
    sc -= digitSegs.length * 15;
    if (wordSegs.length === 1) sc += 40; // bonus for a single word covering its run
    for (const w of wordSegs) {
      sc += w.len * 6;
      const rank = wordRank.get(w.text.toLowerCase()) ?? TOTAL_WORDS;
      sc += Math.round((1 - rank / TOTAL_WORDS) * 25);
    }
    return sc;
  }

  function findSingleWordMatches(zone) {
    const out = [];
    const n = zone.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + MIN_WORD_LEN; j <= n; j++) {
        const matches = sigToWords.get(zone.slice(i, j));
        if (!matches) continue;
        for (const m of matches.slice(0, 10)) {
          out.push(makeSuggestion(zone, [{ start: i, end: j, word: m.word, rank: m.rank }]));
        }
      }
    }
    return out;
  }

  function findFullSplits(zone, maxWords) {
    maxWords = maxWords || 3;
    const n = zone.length;
    const memo = new Map();
    function go(start, depth) {
      if (start === n) return [[]];
      if (depth >= maxWords) return [];
      const key = start + "|" + depth;
      if (memo.has(key)) return memo.get(key);
      const out = [];
      for (let j = start + MIN_WORD_LEN; j <= n; j++) {
        const matches = sigToWords.get(zone.slice(start, j));
        if (!matches) continue;
        const rest = go(j, depth + 1);
        if (rest.length === 0) continue;
        for (const m of matches.slice(0, 4)) {
          for (const r of rest) {
            out.push([{ start: start, end: j, word: m.word, rank: m.rank }].concat(r));
            if (out.length > 800) break;
          }
        }
        if (out.length > 800) break;
      }
      memo.set(key, out);
      return out;
    }
    return go(0, 0).map((seg) => makeSuggestion(zone, seg));
  }

  function findVanity(rawInput) {
    const digits = cleanDigits(rawInput);
    const parts = parsePhone(digits);
    const zone = parts.local;
    let raw = [];
    if (zone.length >= MIN_WORD_LEN) {
      raw = raw.concat(findSingleWordMatches(zone));
      raw = raw.concat(findFullSplits(zone));
    }
    const best = new Map();
    for (const s of raw) {
      s.score = scoreSuggestion(s);
      const key = s.segs.map((x) => x.text).join("-");
      const ex = best.get(key);
      if (!ex || ex.score < s.score) best.set(key, s);
    }
    const list = Array.from(best.values()).sort((a, b) => b.score - a.score);
    return { parts: parts, digits: digits, zone: zone, suggestions: list };
  }

  function renderLocal(segs) {
    return segs.map((x) => x.text).join("-");
  }

  function renderFullNumber(parts, segs) {
    const pieces = [];
    if (parts.country) pieces.push(countryLabel(parts));
    if (parts.area) pieces.push(parts.area);
    pieces.push(renderLocal(segs));
    return pieces.join("-");
  }

  function lettersToNumber(input) {
    let out = "";
    for (const ch of (input || "").toLowerCase()) {
      if (KEYPAD[ch]) out += KEYPAD[ch];
      else if (ch >= "0" && ch <= "9") out += ch;
    }
    return out;
  }

  // --- For-sale inventory ---
  let masterInventory = [];
  const inventoryMap = new Map(); // canonical digits -> { price, url }

  // Compare by digits; drop a leading US "1" so 1-800-… matches 800-….
  function canonicalNumber(s) {
    let d = cleanDigits(s);
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    return d;
  }

  function buildInventory(list) {
    inventoryMap.clear();
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item) continue;
      let num = "", price = "", url = "";
      if (typeof item === "string") {
        num = item;
      } else if (typeof item === "object") {
        num = item.number || item.phone || item.digits || item.n || "";
        price = item.price || "";
        url = item.url || item.link || "";
      }
      const key = canonicalNumber(num);
      if (key.length < 7) continue;
      inventoryMap.set(key, { price: price, url: url });
    }
  }

  function inventoryMatch(digits) {
    return inventoryMap.get(canonicalNumber(digits)) || null;
  }

  function inventoryUrl(entry, digits) {
    if (entry && entry.url && entry.url !== "#") return entry.url;
    if (typeof window.INVENTORY_BASE_URL === "string") {
      return window.INVENTORY_BASE_URL + canonicalNumber(digits);
    }
    return entry && entry.url ? entry.url : "#";
  }

  // ============================ UI ============================
  function el(id) { return document.getElementById(id); }

  function textSpan(text, cls) {
    const sp = document.createElement("span");
    sp.className = cls;
    sp.textContent = text;
    return sp;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
    }
  }

  function linkAttrs(a, url) {
    a.href = url || "#";
    if (url && url !== "#") { a.target = "_blank"; a.rel = "noopener"; }
  }

  // Show the "Available · For sale" banner if this number is in inventory.
  function renderInventoryBanner(digits, nice) {
    const b = el("inventoryBanner");
    b.innerHTML = "";
    const entry = inventoryMatch(digits);
    if (!entry) { b.hidden = true; return; }

    const url = inventoryUrl(entry, digits);
    const left = document.createElement("div");
    left.className = "inv-left";

    const pill = document.createElement("span");
    pill.className = "inv-pill";
    pill.textContent = "For sale";
    left.appendChild(pill);

    const text = document.createElement("span");
    text.className = "inv-text";
    const a = document.createElement("a");
    a.className = "inv-number";
    a.textContent = nice;
    linkAttrs(a, url);
    text.appendChild(a);
    text.appendChild(document.createTextNode(" is available" + (entry.price ? " · " + entry.price : "")));
    left.appendChild(text);

    const cta = document.createElement("a");
    cta.className = "inv-cta";
    cta.textContent = "Get this number →";
    linkAttrs(cta, url);

    b.appendChild(left);
    b.appendChild(cta);
    b.hidden = false;
  }

  function suggestionNode(parts, s) {
    const forSale = !!decodeState.forSale;
    const saleUrl = decodeState.forSaleUrl;
    const linkable = forSale && saleUrl && saleUrl !== "#";

    const card = document.createElement("button");
    card.className = "result" + (forSale ? " for-sale" : "");
    card.type = "button";
    card.title = linkable ? "View listing" : "Click to copy";

    const full = s.lettersCovered === s.zoneLen;
    if (full || forSale) {
      const row = document.createElement("div");
      row.className = "badge-row";
      if (full) {
        const b = document.createElement("span");
        b.className = "result-badge";
        b.textContent = "Fully spelled";
        row.appendChild(b);
      }
      if (forSale) {
        const b = document.createElement("span");
        b.className = "result-badge for-sale";
        b.textContent = "For sale";
        row.appendChild(b);
      }
      card.appendChild(row);
    }

    const num = document.createElement("div");
    num.className = "result-number";
    if (parts.country) num.appendChild(textSpan(countryLabel(parts) + "-", "muted"));
    if (parts.area) num.appendChild(textSpan(parts.area + "-", "muted"));
    s.segs.forEach(function (seg, i) {
      if (i > 0) num.appendChild(textSpan("-", "dash"));
      num.appendChild(textSpan(seg.text, seg.type === "word" ? "word" : "digit"));
    });
    card.appendChild(num);

    const meta = document.createElement("div");
    meta.className = "result-meta";
    const pct = Math.round((s.lettersCovered / s.zoneLen) * 100);
    meta.textContent = (full ? "matches all " + s.zoneLen + " digits" : pct + "% letters") +
      " · dial " + (parts.country ? parts.country + " " : "") +
      (parts.area ? parts.area + " " : "") + parts.zone;
    card.appendChild(meta);

    const copyText = renderFullNumber(parts, s.segs);
    card.addEventListener("click", function () {
      if (linkable) {
        window.open(saleUrl, "_blank", "noopener");
        return;
      }
      copyToClipboard(copyText);
      card.classList.add("copied");
      setTimeout(function () { card.classList.remove("copied"); }, 950);
    });
    return card;
  }

  // --- Scene cards: draw the top results as real-world vanity signage ---
  function sceneSegs(parts, s) {
    const out = [];
    if (parts.country) out.push({ t: countryLabel(parts) + "-", cls: "mut" });
    if (parts.area) out.push({ t: parts.area + "-", cls: "mut" });
    s.segs.forEach(function (seg, i) {
      if (i > 0) out.push({ t: "-", cls: "mut" });
      out.push({ t: seg.text, cls: seg.type === "word" ? "word" : "num" });
    });
    return out;
  }

  function svgEsc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Centered mono text sized to fit, word segments tinted.
  function sceneText(segs, x, y, maxW, maxFont, palette) {
    const str = segs.map(function (s) { return s.t; }).join("");
    const fs = Math.max(11, Math.min(maxFont, Math.floor(maxW / (str.length * 0.64))));
    const spans = segs.map(function (s) {
      return '<tspan fill="' + palette[s.cls] + '">' + svgEsc(s.t) + '</tspan>';
    }).join("");
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="middle" ' +
      'font-family="IBM Plex Mono,Menlo,monospace" font-weight="600" font-size="' + fs + '">' +
      spans + '</text>';
  }

  var SCENE_DARK = { word: "#A9A6F5", num: "#FFFFFF", mut: "rgba(255,255,255,.55)" };
  var SCENE_LIGHT = { word: "#4F46E5", num: "#10133A", mut: "rgba(16,19,58,.45)" };

  function sceneSvg(kind, segs) {
    if (kind === "billboard") {
      return '<svg viewBox="0 0 560 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">' +
        '<defs><linearGradient id="sbsky" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#DFE1F7"/><stop offset="1" stop-color="#F1F2FB"/></linearGradient>' +
        '<radialGradient id="sbglow" cx=".5" cy=".28" r=".55">' +
        '<stop offset="0" stop-color="rgba(124,108,255,.28)"/><stop offset="1" stop-color="rgba(124,108,255,0)"/></radialGradient></defs>' +
        '<rect width="560" height="250" rx="14" fill="url(#sbsky)"/>' +
        '<rect width="560" height="250" rx="14" fill="url(#sbglow)"/>' +
        '<circle cx="470" cy="46" r="17" fill="rgba(255,255,255,.75)"/>' +
        '<path d="M96 40h10l-7 178h-10zM454 40h10l-4 178h-10z" fill="#2A2380" opacity=".85"/>' +
        '<ellipse cx="280" cy="224" rx="200" ry="9" fill="rgba(16,19,58,.10)"/>' +
        '<rect x="52" y="38" width="456" height="118" rx="12" fill="#10133A"/>' +
        '<rect x="60" y="46" width="440" height="102" rx="8" fill="none" stroke="rgba(169,166,245,.4)" stroke-width="1.5"/>' +
        sceneText(segs, 280, 99, 400, 40, SCENE_DARK) +
        '<text x="280" y="132" text-anchor="middle" font-family="Plus Jakarta Sans,Arial,sans-serif" font-size="10.5" font-weight="600" letter-spacing="2.2" fill="rgba(255,255,255,.42)">CALL TODAY</text>' +
        '</svg>';
    }
    if (kind === "van") {
      return '<svg viewBox="0 0 400 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">' +
        '<defs><linearGradient id="svsky" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#E3E5F8"/><stop offset="1" stop-color="#F2F3FC"/></linearGradient></defs>' +
        '<rect width="400" height="230" rx="14" fill="url(#svsky)"/>' +
        '<path d="M14 96h30M6 116h38M14 136h30" stroke="rgba(79,70,229,.35)" stroke-width="5" stroke-linecap="round"/>' +
        '<rect x="0" y="188" width="400" height="4" fill="rgba(16,19,58,.12)"/>' +
        '<path d="M62 70a12 12 0 0112-12h196a12 12 0 0112 12v96H62z" fill="#FFFFFF" stroke="rgba(16,19,58,.14)"/>' +
        '<path d="M282 82h44a10 10 0 018 4l22 30a12 12 0 012.5 7.4V158a8 8 0 01-8 8h-68z" fill="#FFFFFF" stroke="rgba(16,19,58,.14)"/>' +
        '<path d="M292 92h30a6 6 0 015 2.6l16 22H292z" fill="#DDE0F5"/>' +
        '<rect x="62" y="150" width="298" height="16" fill="rgba(79,70,229,.14)"/>' +
        '<circle cx="118" cy="180" r="21" fill="#10133A"/><circle cx="118" cy="180" r="9" fill="#E8EAF7"/>' +
        '<circle cx="312" cy="180" r="21" fill="#10133A"/><circle cx="312" cy="180" r="9" fill="#E8EAF7"/>' +
        sceneText(segs, 172, 112, 190, 24, SCENE_LIGHT) +
        '<text x="172" y="138" text-anchor="middle" font-family="Plus Jakarta Sans,Arial,sans-serif" font-size="9.5" font-weight="700" letter-spacing="1.8" fill="rgba(16,19,58,.4)">ON THE SIDE OF YOUR FLEET</text>' +
        '</svg>';
    }
    // storefront
    return '<svg viewBox="0 0 400 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">' +
      '<defs><linearGradient id="sssky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#E3E5F8"/><stop offset="1" stop-color="#F2F3FC"/></linearGradient></defs>' +
      '<rect width="400" height="230" rx="14" fill="url(#sssky)"/>' +
      '<rect x="46" y="30" width="308" height="52" rx="10" fill="#10133A"/>' +
      sceneText(segs, 200, 57, 260, 26, SCENE_DARK) +
      '<g>' +
      ['#4F46E5', '#FFFFFF', '#4F46E5', '#FFFFFF', '#4F46E5', '#FFFFFF', '#4F46E5'].map(function (c, i) {
        return '<path d="M' + (54 + i * 42) + ' 92h42v22a21 21 0 01-42 0z" fill="' + c + '" stroke="rgba(16,19,58,.12)"/>';
      }).join("") +
      '</g>' +
      '<rect x="62" y="128" width="180" height="74" rx="6" fill="#FFFFFF" stroke="rgba(16,19,58,.14)"/>' +
      '<path d="M74 188l38-44M96 194l52-58M138 196l40-46" stroke="rgba(79,70,229,.18)" stroke-width="7" stroke-linecap="round"/>' +
      '<rect x="262" y="128" width="76" height="74" rx="6" fill="#DDE0F5" stroke="rgba(16,19,58,.14)"/>' +
      '<circle cx="326" cy="168" r="3.5" fill="#10133A"/>' +
      '<rect x="40" y="202" width="320" height="5" fill="rgba(16,19,58,.12)"/>' +
      '</svg>';
  }

  function sceneNode(parts, s, kind) {
    const card = suggestionNode(parts, s);
    card.classList.add("scene", kind === "billboard" ? "scene-full" : "scene-half");
    const body = document.createElement("div");
    body.className = "scene-body";
    while (card.firstChild) body.appendChild(card.firstChild);
    const art = document.createElement("div");
    art.className = "scene-art";
    art.setAttribute("aria-hidden", "true");
    art.innerHTML = sceneSvg(kind, sceneSegs(parts, s));
    card.appendChild(art);
    card.appendChild(body);
    return card;
  }

  var decodeState = { items: [], ctx: null, nice: "", zoneLen: 0, page: 0, forSale: false, forSaleUrl: null };

  function runDecode() {
    const note = el("toolNote");
    el("results").innerHTML = "";
    el("pagination").hidden = true;
    el("pagination").innerHTML = "";
    el("inventoryBanner").hidden = true;
    el("inventoryBanner").innerHTML = "";

    const digits = cleanDigits(el("phoneInput").value);
    if (digits.length < MIN_WORD_LEN) {
      decodeState.items = [];
      el("perPageWrap").hidden = true;
      note.textContent = "Enter a number and tap Find words to decode it.";
      return;
    }

    const res = findVanity(el("phoneInput").value);
    decodeState.nice = formatPhone(res.digits);
    decodeState.zoneLen = res.zone.length;
    decodeState.ctx = { country: res.parts.country, area: res.parts.area, zone: res.zone, nanp: res.parts.nanp };
    decodeState.items = res.suggestions.slice(0, MAX_RESULTS);
    decodeState.page = 0;

    renderInventoryBanner(res.digits, decodeState.nice);
    const invEntry = inventoryMatch(res.digits);
    decodeState.forSale = !!invEntry;
    decodeState.forSaleUrl = invEntry ? inventoryUrl(invEntry, res.digits) : null;

    if (decodeState.items.length === 0) {
      el("perPageWrap").hidden = true;
      note.textContent = decodeState.forSale
        ? "No dictionary words fit " + decodeState.nice + ", but it's available — see below."
        : "Hmm, no dictionary words fit " + decodeState.nice +
          ". Not every number spells something — try another!";
      return;
    }
    renderDecodePage();
  }

  function renderDecodePage() {
    const out = el("results");
    const note = el("toolNote");
    out.innerHTML = "";

    const total = decodeState.items.length;
    el("perPageWrap").hidden = total === 0;

    const size = pageSize > 0 ? pageSize : total;
    const pages = Math.max(1, Math.ceil(total / Math.max(1, size)));
    if (decodeState.page >= pages) decodeState.page = pages - 1;
    if (decodeState.page < 0) decodeState.page = 0;

    const start = decodeState.page * size;
    const end = Math.min(start + size, total);
    const SCENES = ["billboard", "van", "store"];
    for (let i = start; i < end; i++) {
      // First page: showcase the top three spellings as real-world signage.
      const node = (decodeState.page === 0 && i < SCENES.length)
        ? sceneNode(decodeState.ctx, decodeState.items[i], SCENES[i])
        : suggestionNode(decodeState.ctx, decodeState.items[i]);
      out.appendChild(node);
    }

    if (pages > 1) {
      note.textContent = "Showing " + (start + 1) + "–" + end + " of " + total +
        " ideas for " + decodeState.nice + " · tap any to copy";
    } else {
      note.textContent = "Found " + total + " idea" + (total === 1 ? "" : "s") +
        " for " + decodeState.nice + " (last " + decodeState.zoneLen +
        " digits) · tap any to copy";
    }

    renderPagination(pages);
  }

  function renderPagination(pages) {
    const pg = el("pagination");
    pg.innerHTML = "";
    if (pages <= 1) { pg.hidden = true; return; }
    pg.hidden = false;

    function pageBtn(label, target, opts) {
      opts = opts || {};
      const b = document.createElement("button");
      b.type = "button";
      b.className = "page-btn" + (opts.current ? " current" : "");
      b.textContent = label;
      if (opts.disabled) {
        b.disabled = true;
      } else {
        b.addEventListener("click", function () {
          decodeState.page = target;
          renderDecodePage();
          el("results").scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      return b;
    }

    pg.appendChild(pageBtn("‹ Prev", decodeState.page - 1, { disabled: decodeState.page === 0 }));
    for (let i = 0; i < pages; i++) {
      pg.appendChild(pageBtn(String(i + 1), i, { current: i === decodeState.page }));
    }
    pg.appendChild(pageBtn("Next ›", decodeState.page + 1, { disabled: decodeState.page === pages - 1 }));
  }

  function runSpell() {
    const out = el("spellResult");
    const raw = el("wordInput").value.trim();
    const digits = lettersToNumber(el("wordInput").value);
    out.innerHTML = "";

    // Empty input: hide the result card entirely — a boxed prompt here reads
    // as a second input field that can't be typed in. The tool note already
    // tells the user what to do.
    if (!raw) {
      out.hidden = true;
      return;
    }
    if (!digits) {
      out.hidden = false;
      out.innerHTML = "<div class='spell-empty'>That has no letters or digits to convert.</div>";
      return;
    }
    out.hidden = false;

    const big = document.createElement("div");
    big.className = "spell-number";
    big.textContent = formatPhone(digits);
    out.appendChild(big);

    // Visual letter -> digit keypad mapping
    const keys = document.createElement("div");
    keys.className = "spell-keys";
    for (const ch of raw) {
      const lower = ch.toLowerCase();
      let digit = null;
      if (KEYPAD[lower]) digit = KEYPAD[lower];
      else if (ch >= "0" && ch <= "9") digit = ch;
      else {
        if (ch === " ") {
          const sp = document.createElement("span");
          sp.className = "key-space";
          keys.appendChild(sp);
        }
        continue;
      }
      const cap = document.createElement("span");
      cap.className = "keycap";
      const l = document.createElement("span");
      l.className = "kc-letter";
      l.textContent = ch.toUpperCase();
      const d = document.createElement("span");
      d.className = "kc-digit";
      d.textContent = digit;
      cap.appendChild(l);
      cap.appendChild(d);
      keys.appendChild(cap);
    }
    out.appendChild(keys);

    const sub = document.createElement("div");
    sub.className = "spell-sub";
    sub.textContent = '"' + raw.toUpperCase() + '" → ' + digits +
      " · " + digits.length + " digit" + (digits.length === 1 ? "" : "s");
    out.appendChild(sub);

    if (digits.length !== 7 && digits.length !== 10 && digits.length !== 11) {
      const warn = document.createElement("div");
      warn.className = "spell-warn";
      warn.textContent = "Heads up: a standard US number is 7 or 10 digits.";
      out.appendChild(warn);
    }

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy " + digits;
    copyBtn.addEventListener("click", function () {
      copyToClipboard(digits);
      copyBtn.textContent = "Copied!";
      setTimeout(function () { copyBtn.textContent = "Copy " + digits; }, 1200);
    });
    out.appendChild(copyBtn);

    const inv = inventoryMatch(digits);
    if (inv) {
      const avail = document.createElement("div");
      const link = document.createElement("a");
      link.className = "inv-cta inv-cta-spell";
      link.textContent = "Available — for sale" + (inv.price ? " · " + inv.price : "") + " →";
      linkAttrs(link, inventoryUrl(inv, digits));
      avail.appendChild(link);
      out.appendChild(avail);
    }
  }

  function switchMode(mode) {
    const decode = mode === "decode";
    el("mode-decode").classList.toggle("active", decode);
    el("mode-spell").classList.toggle("active", !decode);
    el("panel-decode").hidden = !decode;
    el("panel-spell").hidden = decode;
    el("results").hidden = !decode;
    el("spellResult").hidden = decode;
    if (decode) {
      runDecode();
    } else {
      el("pagination").hidden = true;
      el("perPageWrap").hidden = true;
      el("inventoryBanner").hidden = true;
      el("toolNote").textContent = "Type a word and tap Get number to see what it dials.";
      runSpell();
      el("wordInput").focus();
    }
    syncClear();
  }

  function scrollToTool() {
    const t = el("tool");
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Show each clear (×) button only when its input has text.
  function syncClear() {
    el("clearPhone").hidden = !el("phoneInput").value;
    el("clearWord").hidden = !el("wordInput").value;
  }

  function clearDecode() {
    el("phoneInput").value = "";
    decodeState.items = [];
    el("results").innerHTML = "";
    el("pagination").hidden = true;
    el("pagination").innerHTML = "";
    el("perPageWrap").hidden = true;
    el("inventoryBanner").hidden = true;
    el("inventoryBanner").innerHTML = "";
    el("clearPhone").hidden = true;
    el("toolNote").textContent = "Enter a number and tap Find words to decode it.";
    el("phoneInput").focus();
  }

  function clearSpell() {
    el("wordInput").value = "";
    el("spellResult").innerHTML = "";
    el("spellResult").hidden = true;
    el("clearWord").hidden = true;
    el("toolNote").textContent = "Type a word and tap Get number to see what it dials.";
    el("wordInput").focus();
  }

  function refreshView() {
    if (el("panel-spell") && !el("panel-spell").hidden) runSpell();
    else runDecode();
  }

  // Public runtime API for plugging in a dictionary from anywhere.
  window.NumberGuy = {
    addWords: function (list) {
      masterWords = masterWords.concat(normalizeWords(list));
      buildIndex(masterWords);
      refreshView();
      return masterWords.length;
    },
    setDictionary: function (list) {
      masterWords = normalizeWords(list);
      buildIndex(masterWords);
      refreshView();
      return masterWords.length;
    },
    wordCount: function () { return masterWords.length; },
    setInventory: function (list) {
      masterInventory = Array.isArray(list) ? list : [];
      buildInventory(masterInventory);
      refreshView();
      return inventoryMap.size;
    },
    addInventory: function (list) {
      masterInventory = masterInventory.concat(Array.isArray(list) ? list : []);
      buildInventory(masterInventory);
      refreshView();
      return inventoryMap.size;
    },
    inventoryCount: function () { return inventoryMap.size; },
  };
  // Brand alias — same API under the PhoneNumbers.com name.
  window.PhoneNumbers = window.NumberGuy;

  function initCountrySelect() {
    const sel = el("ccSelect");
    if (!sel) return;
    const btn = el("ccBtn");
    const panel = el("ccPanel");
    const search = el("ccSearch");
    const list = el("ccList");
    const flagEl = el("ccFlag");
    const dialEl = el("ccDial");

    const PINNED = ["US", "CA", "GB"]; // shown first, in this order
    const data = (typeof COUNTRIES !== "undefined" ? COUNTRIES : [])
      .map(function (c) { return { name: c[0], iso: c[1], dial: c[2], flag: isoToFlag(c[1]) }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    const pinned = PINNED.map(function (code) {
      return data.find(function (c) { return c.iso === code; });
    }).filter(Boolean);
    const rest = data.filter(function (c) { return PINNED.indexOf(c.iso) === -1; });

    function itemEl(c) {
      const li = document.createElement("li");
      li.className = "cc-item";
      li.setAttribute("role", "option");
      const fl = document.createElement("span"); fl.className = "cc-i-flag"; fl.textContent = c.flag;
      const nm = document.createElement("span"); nm.className = "cc-i-name"; nm.textContent = c.name;
      const dl = document.createElement("span"); dl.className = "cc-i-dial"; dl.textContent = "+" + c.dial;
      li.appendChild(fl); li.appendChild(nm); li.appendChild(dl);
      li.addEventListener("click", function () { choose(c); });
      return li;
    }

    function renderList(filter) {
      const f = (filter || "").trim().toLowerCase();
      list.innerHTML = "";
      const frag = document.createDocumentFragment();
      let shown = 0;
      if (!f) {
        // Pinned group, divider, then the rest alphabetically.
        pinned.forEach(function (c) { frag.appendChild(itemEl(c)); shown++; });
        if (pinned.length) {
          const sep = document.createElement("li");
          sep.className = "cc-sep";
          sep.setAttribute("aria-hidden", "true");
          frag.appendChild(sep);
        }
        rest.forEach(function (c) { frag.appendChild(itemEl(c)); shown++; });
      } else {
        data.forEach(function (c) {
          if (c.name.toLowerCase().indexOf(f) === -1 && c.dial.indexOf(f.replace("+", "")) === -1) return;
          frag.appendChild(itemEl(c)); shown++;
        });
      }
      if (shown === 0) {
        const empty = document.createElement("div");
        empty.className = "cc-empty";
        empty.textContent = "No matches";
        list.appendChild(empty);
      } else {
        list.appendChild(frag);
      }
    }

    function choose(c) {
      selectedCountry = { name: c.name, iso: c.iso, dial: c.dial, nanp: c.dial === "1" };
      flagEl.textContent = c.flag;
      dialEl.textContent = "+" + c.dial;
      close();
      runDecode();
    }

    function open() {
      panel.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      search.value = "";
      renderList("");
      search.focus();
    }
    function close() {
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (panel.hidden) open(); else close();
    });
    search.addEventListener("input", function () { renderList(search.value); });
    search.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.addEventListener("click", function (e) { if (!sel.contains(e.target)) close(); });

    renderList("");
  }

  function init() {
    // Priority order: curated marketing words, then YOUR custom dictionary,
    // then the generic system breadth list. Any of them may be absent.
    masterWords = [].concat(
      typeof WORDS !== "undefined" ? WORDS : [],
      typeof CUSTOM_WORDS !== "undefined" ? normalizeWords(CUSTOM_WORDS) : [],
      typeof SYSTEM_WORDS !== "undefined" ? SYSTEM_WORDS : []
    );
    buildIndex(masterWords);

    masterInventory = typeof INVENTORY !== "undefined" && Array.isArray(INVENTORY) ? INVENTORY : [];
    buildInventory(masterInventory);
    initCountrySelect();

    el("mode-decode").addEventListener("click", function () { switchMode("decode"); });
    el("mode-spell").addEventListener("click", function () { switchMode("spell"); });

    el("findBtn").addEventListener("click", runDecode);
    el("phoneInput").addEventListener("keydown", function (e) { if (e.key === "Enter") runDecode(); });
    el("phoneInput").addEventListener("input", syncClear);
    el("clearPhone").addEventListener("click", clearDecode);

    el("pageSize").addEventListener("change", function () {
      const v = parseInt(el("pageSize").value, 10);
      pageSize = isNaN(v) ? 10 : v;
      decodeState.page = 0;
      renderDecodePage();
    });

    el("spellBtn").addEventListener("click", runSpell);
    el("wordInput").addEventListener("keydown", function (e) { if (e.key === "Enter") runSpell(); });
    el("wordInput").addEventListener("input", syncClear);
    el("clearWord").addEventListener("click", clearSpell);

    // Famous-number cards -> decode
    document.querySelectorAll("[data-decode]").forEach(function (card) {
      card.addEventListener("click", function () {
        switchMode("decode");
        el("phoneInput").value = card.getAttribute("data-decode");
        syncClear();
        runDecode();
        scrollToTool();
      });
    });

    // Inspiration chips -> spell
    document.querySelectorAll("[data-chips] .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        switchMode("spell");
        el("wordInput").value = chip.textContent.trim();
        syncClear();
        runSpell();
        scrollToTool();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
