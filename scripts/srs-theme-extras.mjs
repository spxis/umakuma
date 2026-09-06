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
    /*
     * The reference. Every WaniKani member already knows these five words, and
     * somebody arriving from there should be able to keep them rather than
     * learn a second vocabulary on their first day. It is also the only theme
     * in English, which makes it the one to check a layout against.
     */
    id: "wanikani",
    name: "WaniKani",
    sourceName: "WaniKani",
    rating: "all",
    /* An English theme should not open on 未. */
    zero: { term: "Locked", reading: "Locked", meaning: "Not started", short: "—" },
    buckets: {
      1: bucket("Apprentice", "Apprentice", "Just met, reviewed within days"),
      2: bucket("Guru", "Guru", "Held for a week or two"),
      3: bucket("Master", "Master", "Held for a month"),
      4: bucket("Enlightened", "Enlightened", "Held for four months"),
      5: bucket("Burned", "Burned", "Done with, in WaniKani's telling"),
    },
    levels: [
      ["Apprentice I", "Apprentice I", "Four hours until the next look", 1],
      ["Apprentice II", "Apprentice II", "Eight hours", 1],
      ["Apprentice III", "Apprentice III", "A day", 1],
      ["Apprentice IV", "Apprentice IV", "Two days", 1],
      ["Guru I", "Guru I", "A week — and the stage a level counts", 2],
      ["Guru II", "Guru II", "Two weeks", 2],
      ["Master", "Master", "A month", 3],
      ["Enlightened", "Enlightened", "Four months", 4],
      ["Burned", "Burned", "WaniKani stops asking. UmaKuma lets you ask again.", 5],
    ],
  },
  {
    /*
     * The other courtesy, matching the one the WaniKani theme extends. Kanji
     * Garden names its stages after a plant's life, and somebody arriving from
     * there should be able to keep the words they already think in rather than
     * learn a second vocabulary on their first day here.
     *
     * They publish five names and we have nine rungs, so the gaps are filled
     * with the plant's own next step - a shoot, a second leaf - rather than by
     * numbering a bucket twice. English, like the WaniKani theme, because that
     * is the vocabulary being kept.
     */
    id: "kanji-garden",
    name: "Kanji Garden",
    sourceName: "Kanji Garden",
    rating: "all",
    zero: { term: "Unplanted", reading: "Unplanted", meaning: "Not sown yet", short: "—" },
    buckets: {
      1: bucket("Planting", "Planting", "In the soil, looked at within days"),
      2: bucket("Sprouting", "Sprouting", "Up, and held for a week or two"),
      3: bucket("Watering", "Watering", "Tended monthly"),
      4: bucket("Sprouted", "Sprouted", "Standing on its own for months"),
      5: bucket("Bloomed", "Bloomed", "Grown. UmaKuma still lets you ask again."),
    },
    levels: [
      ["Sown", "Sown", "Four hours until the next look", 1],
      ["Watered", "Watered", "Eight hours", 1],
      ["Warm ground", "Warm ground", "A day", 1],
      ["First shoot", "First shoot", "Two days", 1],
      ["Sprouting", "Sprouting", "A week — and the stage a level counts", 2],
      ["Second leaf", "Second leaf", "Two weeks", 2],
      ["Watering", "Watering", "A month", 3],
      ["Sprouted", "Sprouted", "Four months", 4],
      ["Bloomed", "Bloomed", "Grown, and yours to bring back down", 5],
    ],
  },
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
