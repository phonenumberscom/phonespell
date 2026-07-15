/* ============================================================
   PhoneNumbers — YOUR custom dictionary plug-in.
   ------------------------------------------------------------
   This is the slot for your own word list. It SUPPLEMENTS the
   built-in lists and is ranked right after the small curated
   marketing list (and ahead of the large generic system list).

   THREE WAYS TO PLUG IN — use whichever fits your data:

   1) Paste a plain array of words below:
        var CUSTOM_WORDS = ["plumber", "realtor", "dentist"];

   2) Paste objects — the loader reads .word / .term / .text / .value:
        var CUSTOM_WORDS = [{ word: "plumber" }, { word: "realtor" }];

   3) Load it from anywhere (file, API, DB) at runtime and call:
        PhoneNumbers.addWords(arrayOrStringOrObjects);   // merge in
        PhoneNumbers.setDictionary(list);                // replace all
        PhoneNumbers.wordCount();                         // current size
      e.g.
        fetch("/my-words.json")
          .then(r => r.json())
          .then(list => PhoneNumbers.addWords(list));

   Notes:
   - Case doesn't matter; words are lowercased internally.
   - Only A-Z letters count (digits pass through); other chars
     and words shorter than 3 letters are ignored.
   - Duplicates are removed automatically.
   ============================================================ */
var CUSTOM_WORDS = [
  // 👇 paste your dictionary words here
  "steemer", // 783-3637 — lets the 1-800-STEEMER example card decode
];
