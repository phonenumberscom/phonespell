/* ============================================================
   PhoneNumbers — YOUR for-sale inventory.
   ------------------------------------------------------------
   Any number listed here gets flagged in the results as
   "Available · For sale" with a clickable link to its listing.

   Each entry can be a plain number string, or an object:
       "1-800-356-9377"
       { number: "1-800-356-9377", price: "$25,000", url: "https://numberguy.ai/buy/18003569377" }

   - number : any format. We compare by digits only, and a leading
              US country code "1" is ignored (so 1-800-… matches 800-…).
   - price  : optional label shown next to "For sale".
   - url    : optional link for the number + the "Get this number" button.
              If omitted, set window.INVENTORY_BASE_URL below and we'll
              link to BASE + the number's digits.

   Load it at runtime instead (from a file/API/DB) if you prefer:
       PhoneNumbers.setInventory(list);   // replace all
       PhoneNumbers.addInventory(list);   // merge in
       PhoneNumbers.inventoryCount();
   ============================================================ */

// Optional fallback link, used when an entry has no `url` of its own.
// The number's digits are appended, e.g. ".../number/18003569377".
// window.INVENTORY_BASE_URL = "https://numberguy.ai/number/";

var INVENTORY = [
  // 👇 EXAMPLE entries — replace with your real for-sale numbers.
  { number: "1-800-356-9377", price: "$25,000", url: "#" },
  { number: "313-888-8888", price: "$50,000", url: "#" },
];
