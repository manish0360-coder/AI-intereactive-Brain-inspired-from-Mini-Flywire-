// ==========================================================
// ACQ-1 — confirmatory lock.  Set in its own commit after the protocol freeze; readiness.mjs checks it against the frozen files.
// ==========================================================
export const ACQ_AUTHORIZATION = Object.freeze({
 "freezeCommit": "4d1baff31373313a644253943af2897a0f860230",
 "protocolSha256": {
  "DESIGN.md": "ac1bdf35f0f159d935022ae7a743ae4269221ed1a1c2b262a70b1ae782796e1a",
  "DECISION_TABLE.md": "a35837bad8b022f305e44e83f20333a609f0162164d542b95ce5dbe21adf23d1",
  "POWER_ANALYSIS.md": "456bbdaf5dec258b6e98e1ee34c5b00031c9a39fd0c089de9d20c920ecbbd382",
  "config.mjs": "b9982b216d1f63b15ffc7677a8ce568ec1d51672c908cd49548d2790920a1c44",
  "analysis.mjs": "678c72a13e67e7d6e986a7c4e3038f5550f44d1d8456a1ea3179d137a249bef8",
  "metric.mjs": "84b362d25d14fe8637f13e8d234f0da6354c823e58f7a94e5615ce492047bf51",
  "states.mjs": "9fc6567cb89e81e1997729fa10f65f0d999b5fb4b5edf0cc96fc07ed38aa778d",
  "env.mjs": "61de7c37cf6dd416cf4ca61a7a24232d32db76414ace2dcac8f09b819b93952d",
  "baselines.mjs": "d0578c72aa5c39e8b541962b24d5858934868f5729d8af5b97883cd3c9591328",
  "session_mfw.mjs": "b616f2affa12f2c2797eda30332ba081716cee93ffb1865d7c5736990fa99db4",
  "run_confirmatory.mjs": "9608fceadca34b114d7eef8125027baa32bc2b229981601ae36941854d6c0712",
  "analyze.mjs": "4e0ffbdba3c192b079ac999c0df433da5d8ebdf8bbf405035b3967129c428e76",
  "allocation.mjs": "257787ffb0a1506ce41f7be4cf3b93babc7b58c02d72c7a318eefc81928730bc",
  "evidence/allocation.json": "413cd7416565ecf7ce17093e5a5ebe1e43930167694fc1b0745e39e260995c34",
  "evidence/stream_2032_4039.json": "c7306b5dc7eb8deb14c8f74e9c914115cee5d85131fdeb149307eef6c403c3d0",
  "evidence/power_sim.json": "e754b9909d81067fbe5a38e7f64d79c1bd5a0d302c696bb7f253a8ca091aff06",
  "evidence/dev_gates.json": "7ccfd0f9b4628cabc695e8202321da0d79ef311023e29030e781b078276e75e8"
 },
 "delta": 0.1,
 "n": 100,
 "steps": 12000,
 "window": [
  9000,
  12000
 ],
 "variants": [
  "P",
  "A",
  "H"
 ],
 "allocation": [
  {
   "index": 3240,
   "configSeed": 365489,
   "goal": 8,
   "switchStates": 4
  },
  {
   "index": 3241,
   "configSeed": 365530,
   "goal": 12,
   "switchStates": 4
  },
  {
   "index": 3242,
   "configSeed": 365535,
   "goal": 16,
   "switchStates": 9
  },
  {
   "index": 3243,
   "configSeed": 365643,
   "goal": 19,
   "switchStates": 4
  },
  {
   "index": 3244,
   "configSeed": 365695,
   "goal": 8,
   "switchStates": 7
  },
  {
   "index": 3245,
   "configSeed": 365708,
   "goal": 12,
   "switchStates": 9
  },
  {
   "index": 3246,
   "configSeed": 365789,
   "goal": 16,
   "switchStates": 2
  },
  {
   "index": 3247,
   "configSeed": 365791,
   "goal": 19,
   "switchStates": 7
  },
  {
   "index": 3248,
   "configSeed": 365811,
   "goal": 8,
   "switchStates": 7
  },
  {
   "index": 3249,
   "configSeed": 365866,
   "goal": 12,
   "switchStates": 9
  },
  {
   "index": 3250,
   "configSeed": 365889,
   "goal": 16,
   "switchStates": 5
  },
  {
   "index": 3251,
   "configSeed": 365907,
   "goal": 19,
   "switchStates": 6
  },
  {
   "index": 3252,
   "configSeed": 365975,
   "goal": 8,
   "switchStates": 8
  },
  {
   "index": 3253,
   "configSeed": 366009,
   "goal": 12,
   "switchStates": 7
  },
  {
   "index": 3254,
   "configSeed": 366076,
   "goal": 16,
   "switchStates": 4
  },
  {
   "index": 3255,
   "configSeed": 366080,
   "goal": 19,
   "switchStates": 4
  },
  {
   "index": 3256,
   "configSeed": 366082,
   "goal": 8,
   "switchStates": 4
  },
  {
   "index": 3257,
   "configSeed": 366089,
   "goal": 12,
   "switchStates": 4
  },
  {
   "index": 3258,
   "configSeed": 366095,
   "goal": 16,
   "switchStates": 5
  },
  {
   "index": 3259,
   "configSeed": 366123,
   "goal": 19,
   "switchStates": 7
  },
  {
   "index": 3260,
   "configSeed": 366140,
   "goal": 8,
   "switchStates": 5
  },
  {
   "index": 3261,
   "configSeed": 366256,
   "goal": 12,
   "switchStates": 9
  },
  {
   "index": 3262,
   "configSeed": 366282,
   "goal": 16,
   "switchStates": 3
  },
  {
   "index": 3263,
   "configSeed": 366283,
   "goal": 19,
   "switchStates": 10
  },
  {
   "index": 3264,
   "configSeed": 366314,
   "goal": 8,
   "switchStates": 5
  },
  {
   "index": 3265,
   "configSeed": 366357,
   "goal": 12,
   "switchStates": 5
  },
  {
   "index": 3266,
   "configSeed": 366501,
   "goal": 16,
   "switchStates": 10
  },
  {
   "index": 3267,
   "configSeed": 366517,
   "goal": 19,
   "switchStates": 3
  },
  {
   "index": 3268,
   "configSeed": 366522,
   "goal": 8,
   "switchStates": 7
  },
  {
   "index": 3269,
   "configSeed": 366544,
   "goal": 12,
   "switchStates": 8
  },
  {
   "index": 3270,
   "configSeed": 366549,
   "goal": 16,
   "switchStates": 8
  },
  {
   "index": 3271,
   "configSeed": 366584,
   "goal": 19,
   "switchStates": 5
  },
  {
   "index": 3272,
   "configSeed": 366685,
   "goal": 8,
   "switchStates": 7
  },
  {
   "index": 3273,
   "configSeed": 366715,
   "goal": 12,
   "switchStates": 7
  },
  {
   "index": 3274,
   "configSeed": 366735,
   "goal": 16,
   "switchStates": 8
  },
  {
   "index": 3275,
   "configSeed": 366832,
   "goal": 19,
   "switchStates": 8
  },
  {
   "index": 3276,
   "configSeed": 366866,
   "goal": 8,
   "switchStates": 7
  },
  {
   "index": 3277,
   "configSeed": 366885,
   "goal": 12,
   "switchStates": 8
  },
  {
   "index": 3278,
   "configSeed": 366895,
   "goal": 16,
   "switchStates": 5
  },
  {
   "index": 3279,
   "configSeed": 366927,
   "goal": 19,
   "switchStates": 4
  },
  {
   "index": 3280,
   "configSeed": 366975,
   "goal": 8,
   "switchStates": 10
  },
  {
   "index": 3281,
   "configSeed": 367031,
   "goal": 12,
   "switchStates": 5
  },
  {
   "index": 3282,
   "configSeed": 367084,
   "goal": 16,
   "switchStates": 6
  },
  {
   "index": 3283,
   "configSeed": 367187,
   "goal": 19,
   "switchStates": 6
  },
  {
   "index": 3284,
   "configSeed": 367210,
   "goal": 8,
   "switchStates": 6
  },
  {
   "index": 3285,
   "configSeed": 367232,
   "goal": 12,
   "switchStates": 5
  },
  {
   "index": 3286,
   "configSeed": 367259,
   "goal": 16,
   "switchStates": 6
  },
  {
   "index": 3287,
   "configSeed": 367291,
   "goal": 19,
   "switchStates": 7
  },
  {
   "index": 3288,
   "configSeed": 367357,
   "goal": 8,
   "switchStates": 4
  },
  {
   "index": 3289,
   "configSeed": 367383,
   "goal": 12,
   "switchStates": 8
  },
  {
   "index": 3290,
   "configSeed": 367455,
   "goal": 16,
   "switchStates": 6
  },
  {
   "index": 3291,
   "configSeed": 367497,
   "goal": 19,
   "switchStates": 5
  },
  {
   "index": 3292,
   "configSeed": 367532,
   "goal": 8,
   "switchStates": 5
  },
  {
   "index": 3293,
   "configSeed": 367536,
   "goal": 12,
   "switchStates": 8
  },
  {
   "index": 3294,
   "configSeed": 367547,
   "goal": 16,
   "switchStates": 6
  },
  {
   "index": 3295,
   "configSeed": 367620,
   "goal": 19,
   "switchStates": 10
  },
  {
   "index": 3296,
   "configSeed": 367668,
   "goal": 8,
   "switchStates": 9
  },
  {
   "index": 3297,
   "configSeed": 367717,
   "goal": 12,
   "switchStates": 7
  },
  {
   "index": 3298,
   "configSeed": 367895,
   "goal": 16,
   "switchStates": 4
  },
  {
   "index": 3299,
   "configSeed": 368088,
   "goal": 19,
   "switchStates": 9
  },
  {
   "index": 3300,
   "configSeed": 368092,
   "goal": 8,
   "switchStates": 8
  },
  {
   "index": 3301,
   "configSeed": 368198,
   "goal": 12,
   "switchStates": 8
  },
  {
   "index": 3302,
   "configSeed": 368211,
   "goal": 16,
   "switchStates": 2
  },
  {
   "index": 3303,
   "configSeed": 368213,
   "goal": 19,
   "switchStates": 5
  },
  {
   "index": 3304,
   "configSeed": 368216,
   "goal": 8,
   "switchStates": 6
  },
  {
   "index": 3305,
   "configSeed": 368223,
   "goal": 12,
   "switchStates": 8
  },
  {
   "index": 3306,
   "configSeed": 368224,
   "goal": 16,
   "switchStates": 4
  },
  {
   "index": 3307,
   "configSeed": 368240,
   "goal": 19,
   "switchStates": 5
  },
  {
   "index": 3308,
   "configSeed": 368318,
   "goal": 8,
   "switchStates": 5
  },
  {
   "index": 3309,
   "configSeed": 368346,
   "goal": 12,
   "switchStates": 5
  },
  {
   "index": 3310,
   "configSeed": 368439,
   "goal": 16,
   "switchStates": 4
  },
  {
   "index": 3311,
   "configSeed": 368449,
   "goal": 19,
   "switchStates": 6
  },
  {
   "index": 3312,
   "configSeed": 368475,
   "goal": 8,
   "switchStates": 7
  },
  {
   "index": 3313,
   "configSeed": 368554,
   "goal": 12,
   "switchStates": 6
  },
  {
   "index": 3314,
   "configSeed": 368622,
   "goal": 16,
   "switchStates": 8
  },
  {
   "index": 3315,
   "configSeed": 368665,
   "goal": 19,
   "switchStates": 5
  },
  {
   "index": 3316,
   "configSeed": 368688,
   "goal": 8,
   "switchStates": 5
  },
  {
   "index": 3317,
   "configSeed": 368762,
   "goal": 12,
   "switchStates": 7
  },
  {
   "index": 3318,
   "configSeed": 368812,
   "goal": 16,
   "switchStates": 2
  },
  {
   "index": 3319,
   "configSeed": 368839,
   "goal": 19,
   "switchStates": 8
  },
  {
   "index": 3320,
   "configSeed": 368881,
   "goal": 8,
   "switchStates": 9
  },
  {
   "index": 3321,
   "configSeed": 368884,
   "goal": 12,
   "switchStates": 4
  },
  {
   "index": 3322,
   "configSeed": 368904,
   "goal": 16,
   "switchStates": 6
  },
  {
   "index": 3323,
   "configSeed": 368911,
   "goal": 19,
   "switchStates": 10
  },
  {
   "index": 3324,
   "configSeed": 368929,
   "goal": 8,
   "switchStates": 7
  },
  {
   "index": 3325,
   "configSeed": 368936,
   "goal": 12,
   "switchStates": 8
  },
  {
   "index": 3326,
   "configSeed": 368976,
   "goal": 16,
   "switchStates": 7
  },
  {
   "index": 3327,
   "configSeed": 369000,
   "goal": 19,
   "switchStates": 10
  },
  {
   "index": 3328,
   "configSeed": 369002,
   "goal": 8,
   "switchStates": 7
  },
  {
   "index": 3329,
   "configSeed": 369018,
   "goal": 12,
   "switchStates": 10
  },
  {
   "index": 3330,
   "configSeed": 369021,
   "goal": 16,
   "switchStates": 5
  },
  {
   "index": 3331,
   "configSeed": 369032,
   "goal": 19,
   "switchStates": 8
  },
  {
   "index": 3332,
   "configSeed": 369087,
   "goal": 8,
   "switchStates": 5
  },
  {
   "index": 3333,
   "configSeed": 369120,
   "goal": 12,
   "switchStates": 7
  },
  {
   "index": 3334,
   "configSeed": 369182,
   "goal": 16,
   "switchStates": 7
  },
  {
   "index": 3335,
   "configSeed": 369277,
   "goal": 19,
   "switchStates": 10
  },
  {
   "index": 3336,
   "configSeed": 369308,
   "goal": 8,
   "switchStates": 4
  },
  {
   "index": 3337,
   "configSeed": 369354,
   "goal": 12,
   "switchStates": 2
  },
  {
   "index": 3338,
   "configSeed": 369385,
   "goal": 16,
   "switchStates": 9
  },
  {
   "index": 3339,
   "configSeed": 369480,
   "goal": 19,
   "switchStates": 3
  }
 ],
 "authorizedBy": "Research Director ruling of 2026-10-31 (M-COGA-9, conditional on every readiness gate)",
 "date": "2026-10-31"
});
