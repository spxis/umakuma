/**
 * Release codenames, Ubuntu-style but on the gojūon.
 *
 * Each release's version minor walks the 44 usable kana in dictionary order —
 * を is skipped because almost nothing starts with it, and ん because nothing
 * does (our own Shiritori game ends chains on it). After わ the cycle rolls
 * over and the kana repeat with fresh word pairs; a pair itself is never
 * reused, and no word appears twice anywhere in the list — every release's
 * pair is built from words no earlier release used.
 *
 * The codename test pins every entry's reading to its computed kana and
 * requires exactly one entry per shipped version, so a new release must add
 * its name or fail `quality:check`.
 */

export const GOJUON_SEQUENCE = [
  "あ", "い", "う", "え", "お",
  "か", "き", "く", "け", "こ",
  "さ", "し", "す", "せ", "そ",
  "た", "ち", "つ", "て", "と",
  "な", "に", "ぬ", "ね", "の",
  "は", "ひ", "ふ", "へ", "ほ",
  "ま", "み", "む", "め", "も",
  "や", "ゆ", "よ",
  "ら", "り", "る", "れ", "ろ",
  "わ",
] as const;

export type ReleaseCodename = {
  /** Latin rendering shown in the footer. */
  romaji: string;
  /** The name as written, kanji and kana. */
  ja: string;
  /** Full hiragana reading; its first character must match the release's kana. */
  reading: string;
  /** What the name means, for anyone who cannot read the Japanese. */
  gloss: string;
};

export function codenameKanaForMinor(minor: number): { kana: string; cycle: number } {
  const index = (minor - 1) % GOJUON_SEQUENCE.length;
  return { kana: GOJUON_SEQUENCE[index], cycle: Math.floor((minor - 1) / GOJUON_SEQUENCE.length) + 1 };
}

/** Katakana to hiragana, so a name written in katakana still checks its kana. */
export function toHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  );
}

/** Index 0 names v0.1.0; a release's codename is CODENAMES[minor - 1]. */
export const CODENAMES: readonly ReleaseCodename[] = [
  { romaji: "Amai Anko", ja: "甘いあんこ", reading: "あまいあんこ", gloss: "sweet red-bean paste" },
  { romaji: "Iki na Izakaya", ja: "粋な居酒屋", reading: "いきないざかや", gloss: "stylish pub" },
  { romaji: "Ureshii Uma", ja: "嬉しい馬", reading: "うれしいうま", gloss: "happy horse" },
  { romaji: "Egao no Enoshima", ja: "笑顔の江ノ島", reading: "えがおのえのしま", gloss: "Enoshima of smiles" },
  { romaji: "Okashi no Oukoku", ja: "お菓子の王国", reading: "おかしのおうこく", gloss: "kingdom of sweets" },
  { romaji: "Kagayaku Kappa", ja: "輝く河童", reading: "かがやくかっぱ", gloss: "gleaming kappa" },
  { romaji: "Kirakira Kitsune", ja: "きらきら狐", reading: "きらきらきつね", gloss: "sparkling fox" },
  { romaji: "Kuroi Kuma", ja: "黒い熊", reading: "くろいくま", gloss: "black bear" },
  { romaji: "Kedakai Kendama", ja: "気高いけん玉", reading: "けだかいけんだま", gloss: "noble kendama" },
  { romaji: "Kogane no Koi", ja: "黄金の鯉", reading: "こがねのこい", gloss: "golden koi" },
  { romaji: "Sakura Samurai", ja: "桜侍", reading: "さくらざむらい", gloss: "cherry-blossom samurai" },
  { romaji: "Shibui Shiba", ja: "渋い柴", reading: "しぶいしば", gloss: "effortlessly cool shiba dog" },
  { romaji: "Suteki na Sushi", ja: "素敵な寿司", reading: "すてきなすし", gloss: "splendid sushi" },
  { romaji: "Sekkachi na Senbei", ja: "せっかちな煎餅", reading: "せっかちなせんべい", gloss: "impatient rice cracker" },
  { romaji: "Sorairo Soba", ja: "空色蕎麦", reading: "そらいろそば", gloss: "sky-blue soba" },
  { romaji: "Tanoshii Tanuki", ja: "楽しい狸", reading: "たのしいたぬき", gloss: "merry tanuki" },
  { romaji: "Chiisana Chouchin", ja: "小さな提灯", reading: "ちいさなちょうちん", gloss: "little paper lantern" },
  { romaji: "Tsuyoi Tsuru", ja: "強い鶴", reading: "つよいつる", gloss: "strong crane" },
  { romaji: "Teruteru Tengu", ja: "てるてる天狗", reading: "てるてるてんぐ", gloss: "shining tengu" },
  { romaji: "Tobikiri Tonkatsu", ja: "とびきりとんかつ", reading: "とびきりとんかつ", gloss: "exceptional pork cutlet" },
  { romaji: "Nagomi Nabe", ja: "和み鍋", reading: "なごみなべ", gloss: "soothing hotpot" },
  { romaji: "Nigiyaka Ninja", ja: "賑やか忍者", reading: "にぎやかにんじゃ", gloss: "boisterous ninja" },
  { romaji: "Nukumori Nurikabe", ja: "ぬくもり塗壁", reading: "ぬくもりぬりかべ", gloss: "warm-hearted wall yokai" },
  { romaji: "Nemui Neko", ja: "眠い猫", reading: "ねむいねこ", gloss: "sleepy cat" },
  { romaji: "Nonbiri Norimaki", ja: "のんびり海苔巻き", reading: "のんびりのりまき", gloss: "easygoing sushi roll" },
  { romaji: "Haikara Hanabi", ja: "ハイカラ花火", reading: "はいからはなび", gloss: "fashionable fireworks" },
  { romaji: "Hikaru Hitsuji", ja: "光る羊", reading: "ひかるひつじ", gloss: "glowing sheep" },
  { romaji: "Fuwafuwa Fuji", ja: "ふわふわ富士", reading: "ふわふわふじ", gloss: "fluffy Mount Fuji" },
  { romaji: "Heiwa na Hebi", ja: "平和な蛇", reading: "へいわなへび", gloss: "peaceful snake" },
  { romaji: "Hokahoka Hotaru", ja: "ほかほか蛍", reading: "ほかほかほたる", gloss: "toasty firefly" },
  { romaji: "Manmaru Matcha", ja: "真ん丸抹茶", reading: "まんまるまっちゃ", gloss: "perfectly round matcha" },
  { romaji: "Midori Miso", ja: "緑味噌", reading: "みどりみそ", gloss: "green miso" },
  { romaji: "Mugen Mugicha", ja: "無限麦茶", reading: "むげんむぎちゃ", gloss: "infinite barley tea" },
  { romaji: "Medetai Melonpan", ja: "めでたいメロンパン", reading: "めでたいめろんぱん", gloss: "auspicious melon bread" },
  { romaji: "Mochimochi Momiji", ja: "もちもち紅葉", reading: "もちもちもみじ", gloss: "springy autumn maple" },
  { romaji: "Yasashii Yatai", ja: "優しい屋台", reading: "やさしいやたい", gloss: "gentle food stall" },
  { romaji: "Yukimi Yuzu", ja: "雪見柚子", reading: "ゆきみゆず", gloss: "snow-viewing yuzu" },
  { romaji: "Yoake Youkai", ja: "夜明け妖怪", reading: "よあけようかい", gloss: "daybreak yokai" },
  { romaji: "Rakuen Ramen", ja: "楽園ラーメン", reading: "らくえんらーめん", gloss: "paradise ramen" },
  { romaji: "Ririshii Ryuu", ja: "凛々しい龍", reading: "りりしいりゅう", gloss: "gallant dragon" },
  { romaji: "Runrun Ruribitaki", ja: "るんるんルリビタキ", reading: "るんるんるりびたき", gloss: "cheerful bluetail bird" },
  { romaji: "Retoro Ressha", ja: "レトロ列車", reading: "れとろれっしゃ", gloss: "retro train" },
  { romaji: "Roman Rousoku", ja: "浪漫蝋燭", reading: "ろまんろうそく", gloss: "romantic candle" },
  { romaji: "Wakuwaku Washi", ja: "わくわく鷲", reading: "わくわくわし", gloss: "excited eagle" },
  { romaji: "Atsuatsu Anmitsu", ja: "熱々あんみつ", reading: "あつあつあんみつ", gloss: "piping-hot anmitsu" },
  { romaji: "Inazuma Inari", ja: "稲妻稲荷", reading: "いなずまいなり", gloss: "lightning inari" },
  { romaji: "Utau Umeboshi", ja: "歌う梅干し", reading: "うたううめぼし", gloss: "singing pickled plum" },
  { romaji: "Enishi no Ema", ja: "縁の絵馬", reading: "えにしのえま", gloss: "votive plaque of destiny" },
  { romaji: "Odoru Onigiri", ja: "踊るおにぎり", reading: "おどるおにぎり", gloss: "dancing rice ball" },
  { romaji: "Kaminari Karaage", ja: "雷唐揚げ", reading: "かみなりからあげ", gloss: "thunder fried chicken" },
  { romaji: "Kinpika Kinkakuji", ja: "金ぴか金閣寺", reading: "きんぴかきんかくじ", gloss: "gleaming Golden Pavilion" },
  { romaji: "Kuishinbou Kujira", ja: "食いしん坊鯨", reading: "くいしんぼうくじら", gloss: "glutton whale" },
  { romaji: "Kenran Keshiki", ja: "絢爛景色", reading: "けんらんけしき", gloss: "dazzling scenery" },
  { romaji: "Kongari Korokke", ja: "こんがりコロッケ", reading: "こんがりころっけ", gloss: "golden-fried croquette" },
  { romaji: "Sawayaka Sashimi", ja: "爽やか刺身", reading: "さわやかさしみ", gloss: "refreshing sashimi" },
  { romaji: "Shinobi Shinkansen", ja: "忍び新幹線", reading: "しのびしんかんせん", gloss: "stealth bullet train" },
  { romaji: "Suzushii Suika", ja: "涼しい西瓜", reading: "すずしいすいか", gloss: "cool watermelon" },
  { romaji: "Seiketsu na Sentou", ja: "清潔な銭湯", reading: "せいけつなせんとう", gloss: "spotless bathhouse" },
  { romaji: "Soyokaze Soumen", ja: "そよ風素麺", reading: "そよかぜそうめん", gloss: "gentle-breeze noodles" },
  { romaji: "Takaramono Taiyaki", ja: "宝物鯛焼き", reading: "たからものたいやき", gloss: "treasure taiyaki" },
  { romaji: "Chikara Chawanmushi", ja: "力茶碗蒸し", reading: "ちからちゃわんむし", gloss: "power egg custard" },
  { romaji: "Tsurutsuru Tsukimi", ja: "つるつる月見", reading: "つるつるつきみ", gloss: "silky moon-viewing" },
  { romaji: "Teppan Tebasaki", ja: "鉄板手羽先", reading: "てっぱんてばさき", gloss: "iron-plate chicken wings" },
  { romaji: "Tokimeki Torii", ja: "ときめき鳥居", reading: "ときめきとりい", gloss: "heart-flutter shrine gate" },
  { romaji: "Natsumatsuri Naruto", ja: "夏祭り鳴門", reading: "なつまつりなると", gloss: "summer-festival whirlpools" },
  { romaji: "Nikoniko Nikujaga", ja: "にこにこ肉じゃが", reading: "にこにこにくじゃが", gloss: "smiling potato stew" },
  { romaji: "Nukazuke Nuigurumi", ja: "糠漬けぬいぐるみ", reading: "ぬかづけぬいぐるみ", gloss: "bran-pickle plushie" },
  { romaji: "Nebuta Nerikiri", ja: "ねぶた練り切り", reading: "ねぶたねりきり", gloss: "festival sweets" },
  { romaji: "Nodoka Noren", ja: "長閑暖簾", reading: "のどかのれん", gloss: "tranquil shop curtain" },
  { romaji: "Harukaze Hanami", ja: "春風花見", reading: "はるかぜはなみ", gloss: "spring-breeze blossom viewing" },
  { romaji: "Hinode Himawari", ja: "日の出向日葵", reading: "ひのでひまわり", gloss: "sunrise sunflower" },
  { romaji: "Fuurin Fukurou", ja: "風鈴梟", reading: "ふうりんふくろう", gloss: "wind-chime owl" },
  { romaji: "Henro Heiya", ja: "遍路平野", reading: "へんろへいや", gloss: "pilgrim plain" },
  { romaji: "Hoshizora Houseki", ja: "星空宝石", reading: "ほしぞらほうせき", gloss: "starry-sky jewel" },
  { romaji: "Maneki Matsuri", ja: "招き祭り", reading: "まねきまつり", gloss: "beckoning festival" },
  { romaji: "Michishio Miyako", ja: "満ち潮都", reading: "みちしおみやこ", gloss: "high-tide capital" },
  { romaji: "Mukashi Musubi", ja: "昔結び", reading: "むかしむすび", gloss: "old-times knot" },
  { romaji: "Megumi Meguri", ja: "恵み巡り", reading: "めぐみめぐり", gloss: "blessing pilgrimage" },
  { romaji: "Momotarou Monaka", ja: "桃太郎最中", reading: "ももたろうもなか", gloss: "Momotaro wafer cake" },
  { romaji: "Yasuragi Yakimochi", ja: "安らぎ焼き餅", reading: "やすらぎやきもち", gloss: "restful grilled rice cake" },
  { romaji: "Yuuyake Yukata", ja: "夕焼け浴衣", reading: "ゆうやけゆかた", gloss: "sunset yukata" },
  { romaji: "Yozakura Yokochou", ja: "夜桜横丁", reading: "よざくらよこちょう", gloss: "night-blossom alley" },
  { romaji: "Rakugaki Ranpu", ja: "落書きランプ", reading: "らくがきらんぷ", gloss: "doodle lamp" },
  { romaji: "Rinrin Ringo", ja: "りんりん林檎", reading: "りんりんりんご", gloss: "chiming apple" },
  { romaji: "Ruriiro Rusuban", ja: "瑠璃色留守番", reading: "るりいろるすばん", gloss: "lapis-blue homewatch" },
  { romaji: "Reimei Renge", ja: "黎明蓮華", reading: "れいめいれんげ", gloss: "dawn lotus" },
  { romaji: "Rojiura Rokuro", ja: "路地裏轆轤", reading: "ろじうらろくろ", gloss: "back-alley potter's wheel" },
  { romaji: "Wagashi Warabimochi", ja: "和菓子蕨餅", reading: "わがしわらびもち", gloss: "sweets and bracken mochi" },
  { romaji: "Aoi Ajisai", ja: "青い紫陽花", reading: "あおいあじさい", gloss: "blue hydrangea" },
  { romaji: "Ichigo Izumi", ja: "苺泉", reading: "いちごいずみ", gloss: "strawberry spring" },
  { romaji: "Ukiyo Uguisu", ja: "浮世鶯", reading: "うきようぐいす", gloss: "floating-world nightingale" },
  { romaji: "Ehon Enpitsu", ja: "絵本鉛筆", reading: "えほんえんぴつ", gloss: "picture-book pencil" },
  { romaji: "Origami Ohagi", ja: "折り紙おはぎ", reading: "おりがみおはぎ", gloss: "origami rice cake" },
  { romaji: "Kaze no Kakigoori", ja: "風のかき氷", reading: "かぜのかきごおり", gloss: "shaved ice on the breeze" },
  { romaji: "Kingyo Kisetsu", ja: "金魚季節", reading: "きんぎょきせつ", gloss: "goldfish season" },
  { romaji: "Kumo no Kurashi", ja: "雲の暮らし", reading: "くものくらし", gloss: "life among clouds" },
  { romaji: "Keiko Biyori", ja: "稽古日和", reading: "けいこびより", gloss: "a fine day to practise" },
  { romaji: "Komorebi Komichi", ja: "木漏れ日小径", reading: "こもれびこみち", gloss: "a lane of dappled sunlight" },
  { romaji: "Satoyama Sanpo", ja: "里山散歩", reading: "さとやまさんぽ", gloss: "a walk through the foothills" },
  { romaji: "Shizukesa Shigure", ja: "静けさ時雨", reading: "しずけさしぐれ", gloss: "the quiet of a passing shower" },
  { romaji: "Suisai Sumire", ja: "水彩菫", reading: "すいさいすみれ", gloss: "a violet in watercolour" },
  { romaji: "Seseragi Semi", ja: "せせらぎ蝉", reading: "せせらぎせみ", gloss: "cicadas over a babbling brook" },
  { romaji: "Soshun Sogen", ja: "早春草原", reading: "そうしゅんそうげん", gloss: "grassland in early spring" },
  { romaji: "Tabi Takibi", ja: "旅焚火", reading: "たびたきび", gloss: "a campfire on the road" },
  { romaji: "Chidori Chaya", ja: "千鳥茶屋", reading: "ちどりちゃや", gloss: "a teahouse where the plovers gather" },
  { romaji: "Tsuyu Tsubame", ja: "梅雨燕", reading: "つゆつばめ", gloss: "swallows in the rainy season" },
  { romaji: "Tegami Tebako", ja: "手紙手箱", reading: "てがみてばこ", gloss: "letters in a keepsake box" },
  { romaji: "Toge no Tomoshibi", ja: "峠の灯", reading: "とうげのともしび", gloss: "a light on the mountain pass" },
  { romaji: "Nanohana Nagisa", ja: "菜の花渚", reading: "なのはななぎさ", gloss: "rape blossoms along the shore" },
  { romaji: "Niji no Niwa", ja: "虹の庭", reading: "にじのにわ", gloss: "a garden under a rainbow" },
  { romaji: "Nukemichi Numa", ja: "抜け道沼", reading: "ぬけみちぬま", gloss: "a shortcut past the marsh" },
  { romaji: "Negai no Neiro", ja: "願いの音色", reading: "ねがいのねいろ", gloss: "the tone of a wish" },
  { romaji: "Nohara no Nozomi", ja: "野原の望み", reading: "のはらののぞみ", gloss: "a wish across the meadow" },
  { romaji: "Hatsuyuki Hiroba", ja: "初雪広場", reading: "はつゆきひろば", gloss: "first snow on the square" },
  { romaji: "Hitoyasumi Hidamari", ja: "一休み日だまり", reading: "ひとやすみひだまり", gloss: "a rest in a patch of sun" },
  { romaji: "Fubuki no Futaba", ja: "吹雪の二葉", reading: "ふぶきのふたば", gloss: "two leaves in a snowstorm" },
  { romaji: "Heya no Hekiga", ja: "部屋の壁画", reading: "へやのへきが", gloss: "a mural in the room" },
  { romaji: "Hoozuki Hosomichi", ja: "鬼灯細道", reading: "ほおずきほそみち", gloss: "a lane of lantern plants" },
  { romaji: "Mado no Maboroshi", ja: "窓の幻", reading: "まどのまぼろし", gloss: "a mirage at the window" },
  { romaji: "Mikazuki Misaki", ja: "三日月岬", reading: "みかづきみさき", gloss: "a crescent moon over the cape" },
  { romaji: "Murasaki no Mukuge", ja: "紫の木槿", reading: "むらさきのむくげ", gloss: "a purple rose of Sharon" },
  { romaji: "Meiro no Mejirushi", ja: "迷路の目印", reading: "めいろのめじるし", gloss: "a landmark in the maze" },
  { romaji: "Mokuren Monogatari", ja: "木蓮物語", reading: "もくれんものがたり", gloss: "a tale told under magnolias" },
  { romaji: "Yanagi no Yuube", ja: "柳の夕べ", reading: "やなぎのゆうべ", gloss: "an evening among willows" },
  { romaji: "Yukidoke Yorimichi", ja: "雪解け寄り道", reading: "ゆきどけよりみち", gloss: "a detour through the thaw" },
  { romaji: "Yonaga no Yoi", ja: "夜長の宵", reading: "よながのよい", gloss: "an evening in the long night" },
  { romaji: "Raimei Rasen", ja: "雷鳴螺旋", reading: "らいめいらせん", gloss: "thunderclap spiral" },
  { romaji: "Rindou Ritsudou", ja: "竜胆律動", reading: "りんどうりつどう", gloss: "the gentian's rhythm" },
  { romaji: "Rurou Ruiseki", ja: "流浪累積", reading: "るろうるいせき", gloss: "what wandering piles up" },
  { romaji: "Renzoku Rekishi", ja: "連続歴史", reading: "れんぞくれきし", gloss: "history, without a gap" },
  { romaji: "Rosen Rokuon", ja: "路線録音", reading: "ろせんろくおん", gloss: "a recording of the route" },
  { romaji: "Wakaba Wadachi", ja: "若葉轍", reading: "わかばわだち", gloss: "new leaves in the wheel ruts" },
  { romaji: "Ashiato Ayatori", ja: "足跡あやとり", reading: "あしあとあやとり", gloss: "footprints in a cat's cradle" },
  { romaji: "Ichiban Inori", ja: "一番祈り", reading: "いちばんいのり", gloss: "the first wish of the day" },
  { romaji: "Uneri Utsuwa", ja: "うねり器", reading: "うねりうつわ", gloss: "a vessel with a swell to it" },
  { romaji: "Emaki Egaku", ja: "絵巻描く", reading: "えまきえがく", gloss: "painting the picture scroll" },
  { romaji: "Ooban Otehon", ja: "大判お手本", reading: "おおばんおてほん", gloss: "large-format copybook" },
  { romaji: "Kami no Kazu", ja: "紙の数", reading: "かみのかず", gloss: "the number of sheets" },
];

/**
 * The kanji form worth printing beside the reading, or `null` when the name is
 * already written in kana and showing both would just repeat it.
 */
export function codenameKanji(codename: ReleaseCodename): string | null {
  return codename.ja === codename.reading ? null : codename.ja;
}

export function codenameForMinor(minor: number): ReleaseCodename | null {
  return CODENAMES[minor - 1] ?? null;
}

export function codenameForVersion(version: string): ReleaseCodename | null {
  const minor = Number(version.split(".")[1]);
  return Number.isFinite(minor) ? codenameForMinor(minor) : null;
}
