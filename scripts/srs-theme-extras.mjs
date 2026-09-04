/**
 * Themes written here rather than parsed from the brainstorm.
 *
 * All three are deliberately built from ordinary Japanese rather than brand
 * names: a park ladder of real ride words instead of the parks that own them,
 * ghosts that have been public property for four hundred years, and a horror
 * ladder made of the genre's furniture — a cursed tape, the bottom of a well —
 * rather than the films that furnished it.
 */

const bucket = (term, reading, meaning) => ({ term, reading, meaning });

export const EXTRA_THEMES = [
  {
    id: "amusement-park",
    name: "Thrill Seeker",
    sourceName: "Amusement Park",
    rating: "all",
    buckets: {
      1: bucket("入門者", "Nyūmonsha", "Beginner Rider"),
      2: bucket("絶叫デビュー", "Zekkyō Debyū", "First Scream"),
      3: bucket("コースター乗り", "Kōsutā Nori", "Coaster Rider"),
      4: bucket("世界記録級", "Sekai Kiroku-kyū", "World-Record Class"),
      5: bucket("絶叫王", "Zekkyō-ō", "King of Screams"),
    },
    levels: [
      ["メリーゴーラウンド", "Merī Gōraundo", "Merry-go-round", 1],
      ["観覧車", "Kanransha", "Ferris wheel", 1],
      ["コーヒーカップ", "Kōhī Kappu", "Spinning teacups", 1],
      ["ゴーカート", "Gō Kāto", "Go-kart", 1],
      ["急流すべり", "Kyūryū Suberi", "Log flume", 2],
      ["お化け屋敷", "Obake Yashiki", "Haunted house", 2],
      ["ジェットコースター", "Jetto Kōsutā", "Roller coaster", 3],
      ["絶叫マシン", "Zekkyō Mashin", "Scream machine", 4],
      ["絶叫王", "Zekkyō-ō", "King of Screams", 5],
    ],
  },
  {
    id: "obake",
    name: "Obake",
    sourceName: "Japanese Ghosts",
    rating: "teen",
    buckets: {
      1: bucket("人魂", "Hitodama", "Spirit Lights"),
      2: bucket("幽霊", "Yūrei", "Ghosts"),
      3: bucket("怨霊", "Onryō", "Vengeful Spirit"),
      4: bucket("大怨霊", "Dai-onryō", "Great Vengeful Spirit"),
      5: bucket("百鬼夜行", "Hyakki Yagyō", "Night Parade of a Hundred Demons"),
    },
    levels: [
      ["人魂", "Hitodama", "Spirit orb", 1],
      ["座敷童子", "Zashiki-warashi", "House-child spirit, brings luck", 1],
      ["のっぺらぼう", "Nopperabō", "The faceless one", 1],
      ["雪女", "Yuki-onna", "The snow woman", 1],
      ["口裂け女", "Kuchisake-onna", "The slit-mouthed woman", 2],
      ["お菊", "Okiku", "The well ghost who counts plates", 2],
      ["お岩", "Oiwa", "The most famous vengeful ghost of all", 3],
      ["怨霊", "Onryō", "A grudge that outlives its body", 4],
      ["百鬼夜行", "Hyakki Yagyō", "The night parade of a hundred demons", 5],
    ],
  },
  {
    id: "kaidan",
    name: "Kaidan",
    sourceName: "Ghost Story / J-Horror",
    rating: "teen",
    buckets: {
      1: bucket("噂", "Uwasa", "Rumour"),
      2: bucket("呪い", "Noroi", "Curse"),
      3: bucket("祟り", "Tatari", "Haunting"),
      4: bucket("怨念", "Onnen", "Grudge"),
      5: bucket("語り部", "Kataribe", "The Storyteller"),
    },
    levels: [
      ["噂話", "Uwasa-banashi", "A rumour going round", 1],
      ["都市伝説", "Toshi Densetsu", "Urban legend", 1],
      ["心霊写真", "Shinrei Shashin", "Spirit photograph", 1],
      ["肝試し", "Kimodameshi", "Test of courage", 1],
      ["呪いのビデオ", "Noroi no Bideo", "The cursed tape", 2],
      ["井戸の底", "Ido no Soko", "The bottom of the well", 2],
      ["祟り", "Tatari", "The haunting itself", 3],
      ["怨念", "Onnen", "Grudge", 4],
      ["語り部", "Kataribe", "The one who tells the tale", 5],
    ],
  },
];
