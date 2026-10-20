// Offseason Strength & Conditioning Program
// Focus: hypertrophy (mass gain) + hip mobility + basketball conditioning
// 3 lifting days (Mon Lower / Wed Upper / Fri Full) + 2 player-choice days (Tue/Thu cardio or rest) + 2 weekend choice days (Sat/Sun sport-specific or rest)

// YouTube IDs (verified popular demos). Edit freely.
const YT = {
  // Mobility (hips heavy)
  worldsGreatest:    "-CiWQ2IvY34",
  hipFlow90_90:      "t4Zz6-aG8Iw",
  cossackSquat:      "nLNqEQ4B6XI",
  deepSquatHold:     "ZZI__bqlBkQ",
  couchStretch:      "ZAt7KE4AUNo",
  pigeonStretch:     "AI5A1PRYX7E",
  catCow:            "kqnua4rHVVA",
  legSwings:         "ya7xU4Obypg",
  hipCarsBig:        "wz1GbxKLkKg",
  thoracicOpener:    "SP3DAU_ky1w",
  ankleMobility:     "IikP_teeLkI",
  // Lower body strength
  backSquat:         "ultWZbUMPL8",
  frontSquat:        "tlfahNdNPPI",
  rdl:               "hCDzSR6bW10",
  trapBarDeadlift:   "EsqwERaSTMI",
  bulgarianSplit:    "uBSoEWZu07k",
  reverseLunge:      "RZKXLMxPF_I",
  hipThrust:         "LM8XHLYJoYs",
  nordicCurl:        "_e9vFU9-tkc",
  calfRaise:         "YMmgqO8Jo-k",
  legCurl:           "ELOCsoDSmrg",
  legPress:          "yZmx_Ac3880",
  walkingLunge:      "L8fvypPrzzs",
  // Upper push
  benchPress:        "rT7DgCr-3pg",
  inclineDB:         "8iPEnn-ltC8",
  ohp:               "2yjwXTZQDDI",
  pushPress:         "iaBVSJm78ko",
  dbShoulderPress:   "qEwKCR5JCog",
  dips:              "wjUmnZH528Y",
  pushup:            "IODxDxX7oi4",
  cableFly:          "I-Ue34qLxc4",
  lateralRaise:      "3VcKaXpzqRo",
  tricepRope:        "-xa-6cQaZKY",
  // Upper pull
  pullup:            "eGo4IYlbE5g",
  chinup:            "brhRXlOhsAM",
  bbRow:             "FWJR5Ve8bnQ",
  dbRow:             "DMo3HJoawrU",
  cableRow:          "GZbfZ033f74",
  latPulldown:       "CAwf7n6Luuc",
  facePull:          "rep-qVOkqgk",
  bicepCurl:         "ykJmrZ5v0Oo",
  hammerCurl:        "zC3nLlEvin4",
  rearDeltFly:       "EA7u4Q_8HQ0",
  // Core / anti-rotation
  plank:             "ASdvN_XEl_c",
  pallofPress:       "AH_QZLm_0-s",
  hangingLegRaise:   "Pr1ieGZ5atk",
  deadBug:           "g_BYB0R-4Ws",
  copenhagenPlank:   "aDsaGBnvDQo",
  // Conditioning
  shuttleRun:        "sG06wu7klpA",
  jumpRope:          "FJmRQ5iTXKE",
  airBike:           "KPrt-o_qDC0",
  hillSprint:        "Z_ciNFaNpvs",
  boxJump:           "hxldG9FX4j4",
  broadJump:         "v0yrBWA3eEs",
  bbSuicide:         "q1MVj5MXSPg",
  tabataIntro:       "XIeCMhNWFQQ"
};

// Helper for YouTube embed
function ytEmbed(id) { return `https://www.youtube.com/embed/${id}?rel=0`; }

const PROGRAM = {
  meta: {
    name: "Offseason Mass + Mobility",
    weeks: 8,
    split: "Mon Lower • Wed Upper • Fri Full Body • Tue/Thu Cardio-or-Rest • Sat/Sun Sport-or-Rest",
    goal: "Add lean mass, unlock hips, stay basketball-fast"
  },
  // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  // type "choice" lets the player pick between two workouts that day
  week: [
    { day: "Monday",    type: "lift",   title: "Lower Body",              id: "lowerDay" },
    { day: "Tuesday",   type: "choice", title: "Cardio or Rest — You Pick",
      options: [
        { id: "cardio", label: "Cardio", tag: "hot",  tagText: "CARDIO" },
        { id: "rest",   label: "Rest",   tag: "cool", tagText: "REST" }
      ]},
    { day: "Wednesday", type: "lift",   title: "Upper Body",              id: "upperDay" },
    { day: "Thursday",  type: "choice", title: "Cardio or Rest — You Pick",
      options: [
        { id: "cardio", label: "Cardio", tag: "hot",  tagText: "CARDIO" },
        { id: "rest",   label: "Rest",   tag: "cool", tagText: "REST" }
      ]},
    { day: "Friday",    type: "lift",   title: "Full Body",               id: "fullBody" },
    { day: "Saturday",  type: "choice", title: "Sport-Specific or Rest — You Pick",
      options: [
        { id: "sportSpecific", label: "Sport-Specific Fitness", tag: "hot",  tagText: "COURT" },
        { id: "rest",          label: "Rest",                   tag: "cool", tagText: "REST" }
      ]},
    { day: "Sunday",    type: "choice", title: "Sport-Specific or Rest — You Pick",
      options: [
        { id: "sportSpecific", label: "Sport-Specific Fitness", tag: "hot",  tagText: "COURT" },
        { id: "rest",          label: "Rest",                   tag: "cool", tagText: "REST" }
      ]}
  ],
  workouts: {
    lowerDay: {
      title: "Lower Body",
      tag: "hot",
      tagText: "MASS",
      blocks: [
        { name: "Warm-up", items: [
          { ex: "World's Greatest Stretch", sets: "2 x 5/side", yt: YT.worldsGreatest, cues: "Lunge, hand to floor, twist up. Open the hip." },
          { ex: "90/90 Hip Flow",           sets: "2 min",      yt: YT.hipFlow90_90,   cues: "Switch sides slowly, sit tall, breathe into the stretch." },
          { ex: "Cossack Squat",            sets: "2 x 6/side", yt: YT.cossackSquat,   cues: "Sit into one hip, opposite leg straight. Adductor opener." }
        ]},
        { name: "Strength", items: [
          { ex: "Back Squat",               sets: "5 x 5",      yt: YT.backSquat,      cues: "Brace, knees track toes, hit parallel or below. 2 min rest." },
          { ex: "Romanian Deadlift",        sets: "4 x 6",      yt: YT.rdl,            cues: "Soft knees, push hips back, feel the hamstrings." }
        ]},
        { name: "Hypertrophy", items: [
          { ex: "Bulgarian Split Squat",    sets: "3 x 8/leg",  yt: YT.bulgarianSplit, cues: "Front foot flat, back foot elevated, controlled descent." },
          { ex: "Hip Thrust",               sets: "3 x 10",     yt: YT.hipThrust,      cues: "Chin tucked, ribs down, full glute lockout. Pause 1 sec at top." },
          { ex: "Leg Curl",                 sets: "3 x 12",     yt: YT.legCurl,        cues: "Slow eccentric (3 sec down). Hamstring growth." },
          { ex: "Standing Calf Raise",      sets: "4 x 15",     yt: YT.calfRaise,      cues: "Full stretch at bottom, full squeeze at top." }
        ]},
        { name: "Core", items: [
          { ex: "Hanging Leg Raise",        sets: "3 x 10",     yt: YT.hangingLegRaise, cues: "No swing. Lift legs to 90° controlled." },
          { ex: "Copenhagen Plank",         sets: "3 x 20s/side", yt: YT.copenhagenPlank, cues: "Adductor + groin strength = injury-proof hips." }
        ]}
      ],
      notes: "Mon = legs day. Add 5 lb to squat each week if all reps are clean. Eat to grow."
    },
    upperDay: {
      title: "Upper Body",
      tag: "hot",
      tagText: "MASS",
      blocks: [
        { name: "Warm-up", items: [
          { ex: "Thoracic Opener",          sets: "2 x 8/side", yt: YT.thoracicOpener, cues: "Open the upper back before pressing." },
          { ex: "Band Pull-Apart",          sets: "2 x 15",     yt: YT.facePull,       cues: "Light band, scaps active." },
          { ex: "Cat-Cow",                  sets: "2 x 8",      yt: YT.catCow,         cues: "Mobilize the spine before loading." }
        ]},
        { name: "Strength — Push + Pull", items: [
          { ex: "Bench Press",              sets: "5 x 5",      yt: YT.benchPress,     cues: "Feet planted, shoulder blades retracted, bar to mid-chest." },
          { ex: "Pull-Up (weighted if able)", sets: "5 x 5",    yt: YT.pullup,         cues: "Full hang to chin over bar. Add weight when easy." }
        ]},
        { name: "Hypertrophy — Push", items: [
          { ex: "Overhead Press",           sets: "3 x 8",      yt: YT.ohp,            cues: "Glutes tight, ribs down, full lockout overhead." },
          { ex: "Incline DB Press",         sets: "3 x 10",     yt: YT.inclineDB,      cues: "30-45° bench, control the eccentric." },
          { ex: "Lateral Raise",            sets: "3 x 15",     yt: YT.lateralRaise,   cues: "Lead with elbows, slight bend. Pinky up at top." },
          { ex: "Tricep Rope Pushdown",     sets: "3 x 12",     yt: YT.tricepRope,     cues: "Elbows pinned to ribs, spread the rope at bottom." }
        ]},
        { name: "Hypertrophy — Pull", items: [
          { ex: "Single-Arm DB Row",        sets: "3 x 10/arm", yt: YT.dbRow,          cues: "Long pull, drive elbow to hip, squeeze 1 sec." },
          { ex: "Face Pull",                sets: "3 x 15",     yt: YT.facePull,       cues: "External rotation at end. Healthy shoulders." },
          { ex: "Hammer Curl",              sets: "3 x 12",     yt: YT.hammerCurl,     cues: "Neutral grip, controlled — no swinging." }
        ]}
      ],
      notes: "Wed = upper. Push and pull balanced. Strong back = strong shot — don't skip face pulls."
    },
    fullBody: {
      title: "Full Body",
      tag: "hot",
      tagText: "TOTAL",
      blocks: [
        { name: "Warm-up", items: [
          { ex: "World's Greatest Stretch", sets: "2 x 5/side", yt: YT.worldsGreatest, cues: "Full body opener — hips and t-spine in one move." },
          { ex: "Leg Swings",               sets: "2 x 10/dir", yt: YT.legSwings,      cues: "Front-back, then side-side. Loosen the hips." },
          { ex: "Band Pull-Apart",          sets: "2 x 15",     yt: YT.facePull,       cues: "Wake up the upper back." }
        ]},
        { name: "Strength — Compound Lifts", items: [
          { ex: "Trap Bar Deadlift",        sets: "4 x 5",      yt: YT.trapBarDeadlift, cues: "Hips back, neutral spine, drive floor away. 2-3 min rest." },
          { ex: "Push Press",               sets: "4 x 5",      yt: YT.pushPress,      cues: "Quick dip, drive with legs, lock out overhead." }
        ]},
        { name: "Hypertrophy", items: [
          { ex: "Walking Lunge (DB)",       sets: "3 x 10/leg", yt: YT.walkingLunge,   cues: "Long stride, knee kisses floor, drive through front heel." },
          { ex: "Barbell Row",              sets: "3 x 8",      yt: YT.bbRow,          cues: "Hinge to ~45°, pull to lower chest, control down." },
          { ex: "Dips",                     sets: "3 x 10",     yt: YT.dips,           cues: "Slight forward lean for chest emphasis. Add weight when easy." },
          { ex: "Bicep Curl",               sets: "3 x 12",     yt: YT.bicepCurl,      cues: "Strict — no swinging. Squeeze at top." }
        ]},
        { name: "Power + Core", items: [
          { ex: "Box Jump",                 sets: "4 x 4",      yt: YT.boxJump,        cues: "Step DOWN every rep. Quality over height." },
          { ex: "Pallof Press",             sets: "3 x 10/side", yt: YT.pallofPress,   cues: "Resist rotation. Slow press out, slow return." },
          { ex: "Plank",                    sets: "3 x 45s",    yt: YT.plank,          cues: "Glutes squeezed, ribs down, breathe." }
        ]}
      ],
      notes: "Fri = full send. Hit every pattern. End the week strong."
    },
    cardio: {
      title: "Cardio + Mobility",
      tag: "cool",
      tagText: "CARDIO",
      blocks: [
        { name: "Warm-up", items: [
          { ex: "Jump Rope",                sets: "5 min easy", yt: YT.jumpRope,       cues: "Light, rhythmic, get the blood moving." }
        ]},
        { name: "Main Work — Tempo Intervals", items: [
          { ex: "Air Bike or Rower",        sets: "10 x 30s on / 90s off", yt: YT.airBike, cues: "30s @ ~85% effort. Recover fully between rounds." },
          { ex: "Box Jumps",                sets: "5 x 5",      yt: YT.boxJump,        cues: "Step DOWN every rep — never jump down. Quality over height." }
        ]},
        { name: "Mobility Cooldown", items: [
          { ex: "Pigeon Pose",              sets: "60s/side x 2", yt: YT.pigeonStretch, cues: "Square hips, breathe into the glute stretch." },
          { ex: "Couch Stretch",            sets: "60s/side x 2", yt: YT.couchStretch, cues: "Quad + hip flexor. Squeeze glute of stretching leg." }
        ]}
      ],
      notes: "Aerobic-anaerobic mix. Builds the engine without frying the legs."
    },
    sportSpecific: {
      title: "Sport-Specific Fitness",
      tag: "hot",
      tagText: "COURT",
      blocks: [
        { name: "Warm-up", items: [
          { ex: "Dynamic Warm-up Flow",     sets: "8 min",      yt: YT.worldsGreatest, cues: "Full body movement prep. Get sweat on." }
        ]},
        { name: "Main Work — Basketball Specific", items: [
          { ex: "Suicides (full court)",    sets: "6 x :35 work / :45 rest", yt: YT.bbSuicide, cues: "Touch every line. Beat your time as you progress." },
          { ex: "17s (sideline to sideline)", sets: "4 x 17 in :60", yt: YT.shuttleRun, cues: "Touch each sideline. Stay low on transitions." },
          { ex: "Broad Jump",               sets: "5 x 3",      yt: YT.broadJump,      cues: "Stick the landing. Reset between reps." }
        ]},
        { name: "Mobility Cooldown", items: [
          { ex: "90/90 Hip Flow",           sets: "3 min",      yt: YT.hipFlow90_90,   cues: "Slow and deliberate. Earn the position." },
          { ex: "Deep Squat Hold",          sets: "2 x 60s",    yt: YT.deepSquatHold,  cues: "Heels down, chest up, breathe. Open the hips." }
        ]}
      ],
      notes: "Leave it on the floor. Game-shape work — moves you can't fake on the court."
    },
    lowerA: {
      title: "Lower Body — Squat Focus",
      tag: "hot",
      tagText: "MASS",
      blocks: [
        { name: "Warm-up", items: [
          { ex: "World's Greatest Stretch", sets: "2 x 5/side", yt: YT.worldsGreatest, cues: "Lunge, hand to floor, twist up. Open the hip." },
          { ex: "90/90 Hip Flow",           sets: "2 min",      yt: YT.hipFlow90_90,   cues: "Switch sides slowly, sit tall, breathe into the stretch." },
          { ex: "Goblet Squat (light)",     sets: "2 x 8",      yt: YT.frontSquat,     cues: "Use as warm-up — DB held at chest, full depth." }
        ]},
        { name: "Strength", items: [
          { ex: "Back Squat",               sets: "5 x 5",      yt: YT.backSquat,      cues: "Brace, knees track toes, hit parallel or below. 2 min rest." },
          { ex: "Bulgarian Split Squat",    sets: "3 x 8/leg",  yt: YT.bulgarianSplit, cues: "Front foot flat, back foot elevated, controlled descent." }
        ]},
        { name: "Hypertrophy", items: [
          { ex: "Walking Lunge (DB)",       sets: "3 x 12/leg", yt: YT.walkingLunge,   cues: "Long stride, knee kisses floor, drive through front heel." },
          { ex: "Leg Curl",                 sets: "3 x 12",     yt: YT.legCurl,        cues: "Slow eccentric (3 sec down). Hamstring growth." },
          { ex: "Standing Calf Raise",      sets: "4 x 15",     yt: YT.calfRaise,      cues: "Full stretch at bottom, full squeeze at top." }
        ]},
        { name: "Core", items: [
          { ex: "Hanging Leg Raise",        sets: "3 x 10",     yt: YT.hangingLegRaise, cues: "No swing. Lift legs to 90° controlled." }
        ]}
      ],
      notes: "Add 5 lb to squat each week if all reps are clean. Eat to grow."
    },
    upperPush: {
      title: "Upper Body — Push",
      tag: "hot",
      tagText: "MASS",
      blocks: [
        { name: "Warm-up", items: [
          { ex: "Thoracic Opener",          sets: "2 x 8/side", yt: YT.thoracicOpener, cues: "Open the upper back before pressing." },
          { ex: "Band Pull-Apart",          sets: "2 x 15",     yt: YT.facePull,       cues: "Light band, scaps active." }
        ]},
        { name: "Strength", items: [
          { ex: "Bench Press",              sets: "5 x 5",      yt: YT.benchPress,     cues: "Feet planted, shoulder blades retracted, bar to mid-chest." },
          { ex: "Overhead Press",           sets: "4 x 6",      yt: YT.ohp,            cues: "Glutes tight, ribs down, full lockout overhead." }
        ]},
        { name: "Hypertrophy", items: [
          { ex: "Incline DB Press",         sets: "3 x 10",     yt: YT.inclineDB,      cues: "30-45° bench, control the eccentric." },
          { ex: "Dips",                     sets: "3 x 10",     yt: YT.dips,           cues: "Slight forward lean for chest emphasis. Add weight when easy." },
          { ex: "Lateral Raise",            sets: "3 x 15",     yt: YT.lateralRaise,   cues: "Lead with elbows, slight bend. Pinky up at top." },
          { ex: "Tricep Rope Pushdown",     sets: "3 x 12",     yt: YT.tricepRope,     cues: "Elbows pinned to ribs, spread the rope at bottom." }
        ]}
      ],
      notes: "Push press allowed if shoulders fatigued — drive with legs."
    },
    lowerB: {
      title: "Lower Body — Hinge Focus",
      tag: "hot",
      tagText: "MASS",
      blocks: [
        { name: "Warm-up", items: [
          { ex: "Cossack Squat",            sets: "2 x 6/side", yt: YT.cossackSquat,   cues: "Sit into one hip, opposite leg straight. Adductor opener." },
          { ex: "Leg Swings",               sets: "2 x 10/dir", yt: YT.legSwings,      cues: "Front-back, then side-side. Loosen the hips." }
        ]},
        { name: "Strength", items: [
          { ex: "Trap Bar Deadlift",        sets: "5 x 5",      yt: YT.trapBarDeadlift, cues: "Hips back, neutral spine, drive floor away. 2-3 min rest." },
          { ex: "Romanian Deadlift",        sets: "3 x 8",      yt: YT.rdl,            cues: "Soft knees, push hips back, feel the hamstrings." }
        ]},
        { name: "Hypertrophy", items: [
          { ex: "Hip Thrust",               sets: "4 x 10",     yt: YT.hipThrust,      cues: "Chin tucked, ribs down, full glute lockout. Pause 1 sec at top." },
          { ex: "Reverse Lunge",            sets: "3 x 10/leg", yt: YT.reverseLunge,   cues: "Step back, knee softly to floor, drive up through front heel." },
          { ex: "Nordic Curl (assisted ok)",sets: "3 x 6",      yt: YT.nordicCurl,     cues: "Slowest possible eccentric. Use band assist if needed." }
        ]},
        { name: "Core", items: [
          { ex: "Pallof Press",             sets: "3 x 10/side", yt: YT.pallofPress,   cues: "Resist rotation. Slow press out, slow return." },
          { ex: "Copenhagen Plank",         sets: "3 x 20s/side", yt: YT.copenhagenPlank, cues: "Adductor + groin strength = injury-proof hips." }
        ]}
      ],
      notes: "Hinge day = posterior chain. This is your jump day fuel."
    },
    upperPull: {
      title: "Upper Body — Pull",
      tag: "hot",
      tagText: "MASS",
      blocks: [
        { name: "Warm-up", items: [
          { ex: "Cat-Cow",                  sets: "2 x 8",      yt: YT.catCow,         cues: "Mobilize the spine before loading." },
          { ex: "Band Pull-Apart",          sets: "2 x 15",     yt: YT.facePull,       cues: "Wake up the rear delts and rhomboids." }
        ]},
        { name: "Strength", items: [
          { ex: "Pull-Up (weighted if able)", sets: "5 x 5",    yt: YT.pullup,         cues: "Full hang to chin over bar. Add weight when easy." },
          { ex: "Barbell Row",              sets: "4 x 8",      yt: YT.bbRow,          cues: "Hinge to ~45°, pull to lower chest, control down." }
        ]},
        { name: "Hypertrophy", items: [
          { ex: "Single-Arm DB Row",        sets: "3 x 10/arm", yt: YT.dbRow,          cues: "Long pull, drive elbow to hip, squeeze 1 sec." },
          { ex: "Lat Pulldown",             sets: "3 x 12",     yt: YT.latPulldown,    cues: "Chest up, pull to upper chest, control negative." },
          { ex: "Face Pull",                sets: "3 x 15",     yt: YT.facePull,       cues: "External rotation at end. Healthy shoulders." },
          { ex: "Hammer Curl",              sets: "3 x 12",     yt: YT.hammerCurl,     cues: "Neutral grip, controlled — no swinging." }
        ]}
      ],
      notes: "Strong back = strong shot. Don't skip face pulls."
    },
    condA: {
      title: "Conditioning + Mobility (Mid-Week)",
      tag: "cool",
      tagText: "CARDIO",
      blocks: [
        { name: "Warm-up", items: [
          { ex: "Jump Rope",                sets: "5 min easy", yt: YT.jumpRope,       cues: "Light, rhythmic, get the blood moving." }
        ]},
        { name: "Main Work — Tempo Intervals", items: [
          { ex: "Air Bike or Rower",        sets: "10 x 30s on / 90s off", yt: YT.airBike, cues: "30s @ ~85% effort. Recover fully between rounds." },
          { ex: "Box Jumps",                sets: "5 x 5",      yt: YT.boxJump,        cues: "Step DOWN every rep — never jump down. Quality over height." }
        ]},
        { name: "Mobility Cooldown", items: [
          { ex: "Pigeon Pose",              sets: "60s/side x 2", yt: YT.pigeonStretch, cues: "Square hips, breathe into the glute stretch." },
          { ex: "Couch Stretch",            sets: "60s/side x 2", yt: YT.couchStretch, cues: "Quad + hip flexor. Squeeze glute of stretching leg." }
        ]}
      ],
      notes: "Keep this aerobic-anaerobic mix — builds the engine without frying the legs."
    },
    condB: {
      title: "Court Conditioning",
      tag: "cool",
      tagText: "COURT",
      blocks: [
        { name: "Warm-up", items: [
          { ex: "Dynamic Warm-up Flow",     sets: "8 min",      yt: YT.worldsGreatest, cues: "Full body movement prep. Get sweat on." }
        ]},
        { name: "Main Work — Basketball Specific", items: [
          { ex: "Suicides (full court)",    sets: "6 x :35 work / :45 rest", yt: YT.bbSuicide, cues: "Touch every line. Beat your time as you progress." },
          { ex: "17s (sideline to sideline)", sets: "4 x 17 in :60", yt: YT.shuttleRun, cues: "Touch each sideline. Stay low on transitions." },
          { ex: "Broad Jump",               sets: "5 x 3",      yt: YT.broadJump,      cues: "Stick the landing. Reset between reps." }
        ]},
        { name: "Mobility Cooldown", items: [
          { ex: "90/90 Hip Flow",           sets: "3 min",      yt: YT.hipFlow90_90,   cues: "Slow and deliberate. Earn the position." },
          { ex: "Deep Squat Hold",          sets: "2 x 60s",    yt: YT.deepSquatHold,  cues: "Heels down, chest up, breathe. Open the hips." }
        ]}
      ],
      notes: "Saturday = leave it on the floor. Recover Sunday."
    },
    rest: {
      title: "Active Recovery + Mobility",
      tag: "cool",
      tagText: "RESET",
      blocks: [
        { name: "Recovery Flow", items: [
          { ex: "Easy Walk or Bike",        sets: "20-30 min",  yt: YT.jumpRope,       cues: "Zone 1. Conversational pace." },
          { ex: "Full Mobility Routine",    sets: "See Mobility tab", yt: YT.hipFlow90_90, cues: "Hit the daily mobility flow. 10-15 min." }
        ]}
      ],
      notes: "Rest is when you grow. Sleep 8+ hours. Eat to recover."
    }
  },
  // Daily mobility — do every day, AM or pre-bed (10-15 min)
  mobility: {
    title: "Daily Mobility — Hip & Hoops Edition",
    intro: "Do this every single day. 10-15 minutes. Hips dictate first step, vertical, defensive slide — protect them.",
    items: [
      { ex: "Cat-Cow",                  sets: "10 reps",     yt: YT.catCow,         cues: "Wake up the spine. Slow breathing." },
      { ex: "World's Greatest Stretch", sets: "5/side",      yt: YT.worldsGreatest, cues: "The single best full-body opener. Don't skip the rotation." },
      { ex: "90/90 Hip Switches",       sets: "10 switches", yt: YT.hipFlow90_90,   cues: "Internal + external rotation in one move." },
      { ex: "Cossack Squat",            sets: "8/side",      yt: YT.cossackSquat,   cues: "Hits adductors and deep hip — game-changer for lateral D." },
      { ex: "Couch Stretch",            sets: "60s/side",    yt: YT.couchStretch,   cues: "Most basketball players have brutal hip flexors. Fix it." },
      { ex: "Pigeon Pose",              sets: "60s/side",    yt: YT.pigeonStretch,  cues: "Glute and external rotator stretch. Breathe into it." },
      { ex: "Hip CARs",                 sets: "5/direction/side", yt: YT.hipCarsBig, cues: "Controlled articular rotations — bulletproofs the joint." },
      { ex: "Deep Squat Hold",          sets: "60-90s",      yt: YT.deepSquatHold,  cues: "Heels flat. Reclaim the position you were born with." },
      { ex: "Ankle Mobility",           sets: "10/side",     yt: YT.ankleMobility,  cues: "Knee over toes — free up dorsiflexion." },
      { ex: "Thoracic Opener",          sets: "8/side",      yt: YT.thoracicOpener, cues: "Open the upper back. Better posture, better shot." }
    ],
    notes: "Hips and ankles are non-negotiable. Tight hips = slow first step + busted knees."
  },
  conditioning: {
    title: "Conditioning Library",
    intro: "Mid-week tempo (Wed) builds aerobic base. Saturday court work sharpens basketball-specific output. Don't add more — you'll cut into mass gains.",
    items: [
      { ex: "Air Bike Intervals",   sets: "10 x 30s/90s", yt: YT.airBike,    cues: "Wednesday staple. Builds engine without pounding joints." },
      { ex: "Jump Rope",            sets: "5-10 min",     yt: YT.jumpRope,   cues: "Foot speed, calves, coordination. Daily-friendly." },
      { ex: "Suicides",             sets: "6 x :35/:45",  yt: YT.bbSuicide,  cues: "The classic. Touch every line every time." },
      { ex: "17s",                  sets: "4 x 17/:60",   yt: YT.shuttleRun, cues: "Sideline to sideline 17 times in 60 seconds." },
      { ex: "Hill Sprints",         sets: "8 x 15s",      yt: YT.hillSprint, cues: "If you have a hill nearby — pure power conditioning." },
      { ex: "Box Jumps",            sets: "5 x 5",        yt: YT.boxJump,    cues: "STEP down. Never jump down. Power, not endurance." },
      { ex: "Tabata (anything)",    sets: "8 x 20/10",    yt: YT.tabataIntro, cues: "Rower, bike, jump rope, burpees. 4 min of suffering." }
    ],
    notes: "Rule: if conditioning makes you skip a lifting session, you did too much."
  }
};
