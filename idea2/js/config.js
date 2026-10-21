/* Altitude Exchange (Idea 2) — configuration.
 * Edit this file to change the rates, fees, miles rate, timing or the analyzer address.
 * Everything else reads from window.EXCHANGE_CONFIG. */
window.EXCHANGE_CONFIG = {
  brand: {
    // Where the QR code on the receipt sends the guest. The redemption code is appended as ?ref=CODE.
    // Replace with the campaign's Altitude card application link before the event.
    applyUrl: "https://www.unionbankph.com/",
    location: "Rockwell"         // printed on receipts; also editable in the operator panel
  },

  exchange: {
    altitudeFxFee: 0.0125,       // "UB ALTITUDE 1.25%"
    otherFxFee: 0.0175,          // "OTHER CONVERSION 1.75%" (deck figure)
    pesoPerMile: 16,             // "₱16 = 1 UB MILES"; miles are shown to 2 decimals like the deck (₱417 → 26.06)
    analyzerUrl: "/api/analyze-coins",   // Netlify function or server.js — both run lib/coin-analyzer.mjs
    imageMaxEdge: 1568,          // px; the photo of the tray sent to the analyzer
    imageQuality: 0.88,
    ratesNote: "Indicative rates",
    timing: {                    // ms
      minScan: 2200,             // "Scanning" stays up at least this long
      row: 260,                  // board rows flip in one after another
      detectHold: 2600,          // "Detecting coins from…" after the last row
      currenciesHold: 3400,      // "Currencies detected" after the last row
      totalHold: 5200,           // "Total coin value"
      converting: 2400,          // "Converting into Altitude miles"
      analyzerTimeout: 75000
    },
    idleSeconds: { error: 45, miles: 120, receipt: 60 }   // back to the start screen when nobody touches it
  },

  // Pesos per 1 unit of each currency (indicative mid-market rates for the demo — set real rates before
  // the event). `sign` is what the boards show before an amount; currencies without one show the amount only.
  // Coins the analyzer finds in a currency missing here are listed but not valued. Philippine pesos are not exchanged.
  currencies: {
    USD: { rate: 58.0, sign: "$" },   EUR: { rate: 67.5, sign: "€" },  JPY: { rate: 0.39, sign: "¥" },
    KRW: { rate: 0.042, sign: "₩" },  GBP: { rate: 78.0, sign: "£" },  CAD: { rate: 42.0, sign: "$" },
    MXN: { rate: 3.1, sign: "$" },    AUD: { rate: 38.0, sign: "$" },  NZD: { rate: 34.5, sign: "$" },
    SGD: { rate: 45.0, sign: "$" },   HKD: { rate: 7.45, sign: "$" },  TWD: { rate: 1.9, sign: "$" },
    CNY: { rate: 8.1, sign: "¥" },    THB: { rate: 1.78 },              MYR: { rate: 13.6 },
    IDR: { rate: 0.0036 },            VND: { rate: 0.0023 },            MOP: { rate: 7.2 },
    BND: { rate: 45.0, sign: "$" },   KHR: { rate: 0.0145 },            INR: { rate: 0.68 },
    AED: { rate: 15.8 },              SAR: { rate: 15.45 },             QAR: { rate: 15.9 },
    KWD: { rate: 189.0 },             BHD: { rate: 154.0 },             CHF: { rate: 72.0 },
    SEK: { rate: 6.1 },               NOK: { rate: 5.6 },               DKK: { rate: 9.05 },
    CZK: { rate: 2.7 },               PLN: { rate: 15.8 },              HUF: { rate: 0.16 },
    RON: { rate: 13.5 },              ISK: { rate: 0.42 },              TRY: { rate: 1.45 },
    ILS: { rate: 15.6 },              EGP: { rate: 1.18 },              ZAR: { rate: 3.2 },
    BRL: { rate: 10.5 },              CLP: { rate: 0.061 },             PEN: { rate: 15.5 }
  }
};
