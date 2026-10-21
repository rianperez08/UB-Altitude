/* The Altitude Test — configuration.
 * Edit this file to change the cities, copy, scoring, timing or branding.
 * Everything else reads from window.ALTITUDE_CONFIG. */
window.ALTITUDE_CONFIG = {
  brand: {
    title: "The Altitude Test",
    tagline: "Unlock bonus travel miles with your elevated travel knowledge",
    // Where the claim screen's QR code sends the guest. The referral code is appended as ?ref=CODE.
    // Replace with the campaign's Altitude card application link before the event.
    applyUrl: "https://www.unionbankph.com/"
  },

  game: {
    rounds: 5,              // landings per flight
    roundSeconds: 15,       // time to answer each landing
    milesPerCorrect: 15,    // UB Miles for a correct landing
    speedBonusMax: 15,      // extra miles when answering instantly, scaling down to 0 at the buzzer
    pesoPerMile: 16,        // "₱16 = 1 UB Mile"
    countdownSeconds: 3,    // take-off countdown before round 1
    revealSeconds: 3.2,     // how long the correct answer stays on screen
    transitSeconds: 1.6,    // "next destination" pause between rounds
    autoAdvanceSeconds: 9,  // score -> reward -> claim auto-advance
    idleResetSeconds: 75,   // return to the attract screen when nobody touches the end screens
    leaderboardSize: 10
  },

  // Deck order. Options are listed A–D exactly as in the deck; the screen lays them out
  // A C / B D like the mock-ups. `answer` must match one option exactly.
  cities: [
    { id: "barcelona", answer: "Barcelona, Spain", image: "assets/cities/barcelona.jpg",
      options: ["Madrid, Spain", "Barcelona, Spain", "Lisbon, Portugal", "Rome, Italy"] },
    { id: "tokyo", answer: "Tokyo, Japan", image: "assets/cities/tokyo.jpg",
      options: ["Seoul, South Korea", "Osaka, Japan", "Tokyo, Japan", "Taipei, Taiwan"] },
    { id: "las-vegas", answer: "Las Vegas, United States", image: "assets/cities/las-vegas.jpg",
      options: ["Dubai, United Arab Emirates", "Las Vegas, United States", "Macau, China", "Singapore, Singapore"] },
    { id: "sydney", answer: "Sydney, Australia", image: "assets/cities/sydney.jpg",
      options: ["Auckland, New Zealand", "Sydney, Australia", "Melbourne, Australia", "Cape Town, South Africa"] },
    { id: "salzburg", answer: "Salzburg, Austria", image: "assets/cities/salzburg.jpg",
      options: ["Salzburg, Austria", "Prague, Czech Republic", "Ljubljana, Slovenia", "Innsbruck, Austria"] }
  ],
  shuffleCities: false,   // true = random order of landings each flight
  shuffleOptions: false,  // true = shuffle the four answers each round

  // Rows added by "Seed demo leaderboard" in the settings panel (names from the deck mock-up).
  demoLeaderboard: [
    ["Alex Reyes", 105], ["Sofia Cruz", 98], ["Marco Santos", 92],
    ["Isabella Tan", 87], ["Daniel Garcia", 81], ["Bianca Lopez", 76]
  ]
};
