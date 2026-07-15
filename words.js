/*
 * NumberGuy word list.
 * Curated for vanity phone numbers: business/marketing terms plus common
 * English words, lengths 2-7. Lowercase, de-duplicated at load time.
 * Earlier words are treated as slightly more "memorable" by the ranker.
 */
var WORDS = [
  // --- High-value marketing / business ---
  "save", "saver", "cash", "money", "deal", "deals", "sale", "sales", "buy",
  "sell", "sold", "shop", "store", "stores", "market", "value", "price",
  "prices", "free", "bonus", "offer", "offers", "win", "winner", "prize",
  "lucky", "best", "top", "great", "super", "mega", "ultra", "prime", "elite",
  "pro", "expert", "experts", "master", "quote", "quotes", "agent", "agents",
  "broker", "client", "deal", "fast", "quick", "rapid", "speedy", "now", "today",
  "instant", "easy", "simple", "smart", "wise", "trust", "secure", "safe",
  "shield", "guard", "global", "world", "nation", "local", "direct", "express",
  "premium", "luxury", "royal", "crown", "star", "stars", "gold", "golden",
  "silver", "diamond", "brand", "brands",

  // --- Money / finance ---
  "bank", "banks", "loan", "loans", "credit", "debit", "fund", "funds", "invest",
  "wealth", "rich", "income", "profit", "budget", "tax", "taxes", "refund",
  "payday", "lender", "lenders", "finance", "capital", "asset", "assets", "bonds",
  "stocks", "trade", "trader", "wallet", "coin", "coins", "dollar", "cents",

  // --- Autos / transport ---
  "auto", "autos", "car", "cars", "truck", "trucks", "motor", "motors", "drive",
  "driver", "wheels", "tires", "tire", "dealer", "lease", "rental", "rentals",
  "rent", "ride", "rides", "taxi", "cab", "cabs", "limo", "limos", "fleet",
  "garage", "engine", "diesel", "gas", "fuel", "speed", "racing", "wagon", "van",
  "vans", "bus", "buses", "bike", "bikes", "boat", "boats", "yacht", "plane",
  "flight", "flights", "travel", "trips", "tour", "tours", "cruise",

  // --- Home / real estate / trades ---
  "home", "homes", "house", "houses", "realty", "estate", "condo", "rooms",
  "room", "rent", "lease", "build", "builder", "remodel", "repair", "repairs",
  "fix", "fixer", "handy", "roof", "roofer", "roofing", "floor", "floors",
  "tile", "tiles", "paint", "painter", "glass", "window", "windows", "doors",
  "door", "gate", "fence", "fences", "deck", "patio", "pool", "pools", "lawn",
  "yard", "garden", "tree", "trees", "movers", "moving", "haul", "junk", "trash",
  "clean", "cleans", "maids", "maid", "wash", "carpet", "plumb", "pipes", "drain",
  "drains", "sewer", "hvac", "heat", "heater", "cool", "cooler", "air", "vent",
  "power", "wire", "wiring", "solar", "energy", "lights", "light", "lamp",
  "locks", "lock", "keys", "key", "alarm", "alarms", "safety", "pest", "bugs",

  // --- Health / medical / wellness ---
  "doctor", "doctors", "med", "meds", "medic", "health", "care", "cares",
  "caring", "clinic", "nurse", "nurses", "dental", "dentist", "teeth", "tooth",
  "smile", "smiles", "braces", "vision", "eyes", "eye", "optic", "ear", "hear",
  "hearing", "heart", "hearts", "bones", "rehab", "detox", "therapy", "healing",
  "wellness", "vital", "fit", "fitness", "gym", "gyms", "yoga", "workout",
  "muscle", "strong", "energy", "vitamin", "diet", "slim", "weight", "skin",
  "beauty", "spa", "spas", "salon", "salons", "hair", "nails", "nail", "facial",
  "makeup", "relax", "calm", "peace", "happy", "joy", "smile", "life", "lives",
  "vida", "soul", "mind", "minds", "brain", "rescue", "medix",

  // --- Food / dining ---
  "food", "foods", "eat", "eats", "menu", "menus", "diner", "cafe", "cafes",
  "grill", "grills", "kitchen", "chef", "chefs", "cook", "cooks", "bake",
  "bakery", "bread", "cake", "cakes", "pizza", "pasta", "tacos", "taco",
  "burger", "fries", "wings", "bbq", "smoke", "deli", "meat", "meats", "fish",
  "seafood", "sushi", "fresh", "juice", "juices", "coffee", "java", "brew",
  "beer", "beers", "wine", "wines", "bar", "bars", "pub", "pubs", "drink",
  "drinks", "candy", "sweet", "sweets", "sugar", "honey", "cream", "milk",
  "snack", "snacks", "feast", "yummy", "tasty", "dine", "table", "tables",
  "order", "orders", "deliver", "catering", "cater",

  // --- Pets / animals ---
  "pet", "pets", "dog", "dogs", "cat", "cats", "puppy", "kitty", "vet", "vets",
  "paws", "paw", "tails", "tail", "groom", "kennel", "horse", "horses", "farm",
  "farms", "ranch", "barn", "bird", "birds", "fish", "zoo",

  // --- Legal / professional services ---
  "contact", "contacts", "law", "laws", "lawyer", "lawyers", "legal", "attorney", "court", "courts",
  "judge", "justice", "rights", "claim", "claims", "case", "cases", "injury",
  "injured", "accident", "crash", "ticket", "tickets", "bail", "divorce",
  "custody", "estate", "wills", "trust", "trusts", "tax", "audit", "accountant",
  "books", "payroll", "notary", "permit", "permits", "license", "office",
  "offices", "agency", "agencies", "consult", "advisor", "advice", "service",
  "services", "solution", "support", "help", "helper", "helpline", "hotline",

  // --- Tech / media / communication ---
  "tech", "techs", "data", "cloud", "web", "webs", "site", "sites", "net",
  "online", "wifi", "phone", "phones", "mobile", "cell", "cells", "call",
  "calls", "dial", "ring", "talk", "talks", "chat", "text", "texts", "voice",
  "voices", "media", "video", "videos", "audio", "music", "songs", "song",
  "radio", "stream", "live", "show", "shows", "stage", "studio", "photo",
  "photos", "camera", "print", "prints", "design", "create", "build", "code",
  "coder", "apps", "app", "game", "games", "gamer", "play", "player", "fun",
  "smart", "robot", "digital", "signal", "network", "system", "byte", "pixel",

  // --- People / family / community ---
  "people", "person", "family", "kids", "kid", "child", "baby", "babies",
  "mom", "moms", "dad", "dads", "mama", "papa", "team", "teams", "group",
  "groups", "club", "clubs", "crew", "squad", "friend", "friends", "buddy",
  "neighbor", "church", "faith", "grace", "hope", "love", "loves", "lover",
  "dating", "date", "match", "single", "bride", "groom", "wedding", "party",
  "events", "event", "gift", "gifts", "flowers", "florist", "balloon",

  // --- Action verbs ---
  "get", "gets", "got", "give", "gives", "go", "going", "come", "make", "made",
  "do", "does", "find", "found", "look", "see", "seek", "ask", "tell", "say",
  "show", "send", "ship", "deliver", "pick", "pack", "fix", "build", "grow",
  "boost", "rise", "lift", "move", "moved", "run", "runs", "jump", "fly",
  "fly", "drive", "ride", "swim", "walk", "work", "works", "hire", "join",
  "learn", "teach", "train", "study", "read", "write", "draw", "paint", "cook",
  "clean", "wash", "shop", "save", "spend", "earn", "win", "play", "rest",
  "sleep", "wake", "start", "begin", "stop", "open", "close", "lock", "click",
  "tap", "swipe", "scan", "share", "post", "like", "love", "trust", "choose",
  "pick", "want", "need", "wish", "dream", "plan", "act", "lead", "guide",

  // --- Descriptors / adjectives ---
  "big", "huge", "giant", "small", "tiny", "long", "short", "tall", "wide",
  "deep", "high", "low", "hot", "cold", "warm", "cool", "new", "old", "young",
  "fresh", "clean", "pure", "real", "true", "good", "great", "nice", "fine",
  "rich", "poor", "happy", "lucky", "ready", "able", "open", "free", "easy",
  "hard", "soft", "fast", "slow", "loud", "calm", "wild", "brave", "bold",
  "kind", "fair", "wise", "bright", "shiny", "clear", "dark", "light", "color",
  "green", "blue", "red", "gold", "white", "black", "pink", "gray", "brown",

  // --- Nature / outdoors ---
  "sun", "moon", "star", "stars", "sky", "cloud", "rain", "snow", "wind",
  "storm", "fire", "flame", "water", "ocean", "sea", "lake", "river", "creek",
  "beach", "shore", "wave", "waves", "sand", "rock", "stone", "mountain",
  "hill", "valley", "forest", "woods", "tree", "leaf", "leaves", "flower",
  "rose", "grass", "earth", "land", "field", "park", "trail", "north", "south",
  "east", "west", "summit", "peak", "ridge", "river", "bay", "cove", "isle",

  // --- Time / misc nouns ---
  "time", "times", "hour", "hours", "day", "days", "week", "year", "years",
  "night", "nights", "morning", "noon", "today", "always", "forever", "moment",
  "season", "spring", "summer", "autumn", "winter", "holiday", "vacation",

  // --- Common everyday words for broad coverage ---
  "the", "and", "for", "you", "your", "our", "all", "any", "one", "two",
  "ten", "first", "next", "more", "most", "less", "this", "that", "here",
  "there", "where", "when", "what", "who", "how", "why", "yes", "way", "ways",
  "word", "words", "name", "names", "list", "lists", "page", "pages", "book",
  "books", "card", "cards", "box", "boxes", "bag", "bags", "case", "cases",
  "tool", "tools", "part", "parts", "item", "items", "stuff", "thing", "things",
  "idea", "ideas", "fact", "facts", "news", "story", "stories", "report",
  "guide", "guides", "tip", "tips", "trick", "tricks", "step", "steps", "level",
  "point", "points", "score", "goal", "goals", "win", "wins", "rule", "rules",
  "test", "tests", "exam", "class", "course", "school", "college", "campus",
  "degree", "math", "science", "history", "english", "spanish", "french",

  // --- Brandable / catchy short words ---
  "ace", "aces", "apex", "axis", "buzz", "echo", "flux", "glow", "haze", "jet",
  "jets", "kite", "luna", "max", "maxx", "neo", "nova", "onyx", "opal", "oz",
  "pixel", "quest", "rush", "sage", "spark", "swift", "vibe", "vibes", "zen",
  "zone", "zoom", "zest", "zip", "zips", "edge", "epic", "fab", "flow", "fox",
  "fury", "gem", "gems", "halo", "hero", "heroes", "hub", "hubs", "icon",
  "joy", "kingdom", "king", "kings", "queen", "lion", "lions", "magic", "mojo",
  "muse", "myth", "ninja", "oasis", "orbit", "pearl", "phoenix", "pulse",
  "ruby", "saga", "titan", "vortex", "wave", "wisp", "wolf", "wolves", "zeal",

  // --- US cities / places (often used in local vanity numbers) ---
  "texas", "ohio", "miami", "tampa", "denver", "boston", "vegas", "tahoe",
  "aspen", "maui", "kona", "nyc", "la", "usa",
];

// Expose for browser and (optionally) Node.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORDS };
}
