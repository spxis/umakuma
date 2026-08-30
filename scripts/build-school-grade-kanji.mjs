import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "src/data/school-grades");
const WK_CATALOG_DIR = path.join(ROOT_DIR, "src/data/wk-catalog-levels");
const JLPT_READINGS_PATH = path.join(ROOT_DIR, "src/data/jlptReadings.json");

// Official MEXT Elementary School Curriculum Guidelines (平成29年告示 / 2020 revision)
// Grade 1: 80 Kanji
const GRADE_01 = "一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六";

// Grade 2: 160 Kanji
const GRADE_02 = "引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話";

// Grade 3: 200 Kanji
const GRADE_03 = "悪安暗医委意育員院飲運泳駅央横屋温化荷界開階寒感漢館岸起期客究急級宮球去橋業曲局銀区苦具君係軽血決研県庫湖向幸港号根祭皿仕死使始指歯詩次事持式実写者主守取酒受州拾終習集住重宿所暑助昭消商章勝乗植申身神真深進世整昔全相送想息速族他打対待代第題炭短談着注柱丁帳調追定庭笛鉄転都度投豆島湯登等動童農波配倍箱畑発反坂板皮悲美鼻筆氷表秒病品負部服福物平返勉放味命面問役薬由油有遊予羊洋葉陽様落流旅両緑礼列練路和";

// Grade 4: 202 Kanji (including 20 prefectural kanji updated in 2020)
const GRADE_04 = "愛案以衣位茨印英栄媛塩岡億加果貨課芽賀改械害街各覚潟完官管関観願岐希季旗器機議求泣給挙漁共協鏡競極熊訓軍郡群径景芸欠結建健験固功好香候康佐差菜最埼材崎昨札刷察参産散残氏司試児治滋辞鹿失借種周祝順初松笑唱焼照城縄臣信井成省清静席積折節説浅戦選然争倉巣束側続卒孫帯隊達単置仲沖兆低底的典伝徒努灯働特徳栃奈梨熱念敗梅博阪飯飛必票標不夫付府阜富副兵別辺変便包法望牧末満未民無約勇要養浴利陸良料量輪類令冷例連老労録";

// Grade 5: 193 Kanji
const GRADE_05 = "圧囲移因永営衛易益液演応往桜可仮価河過快解格確額刊幹慣眼紀基寄規喜技義逆久旧救居許境均禁句型経潔件険検限現減故個護効厚耕航鉱構興講告混査再災妻採際在財罪殺雑酸賛士支史志枝師資飼示似識質舎謝授修述術準序招証象賞条状常情織職制性政勢精製税責績接設絶祖素総造像増則測属率損貸態団断築貯張停提程適統堂銅導得毒独任燃能破犯判版比肥非費備評貧布婦武復複仏粉編弁保墓報豊防貿暴脈務夢迷綿輸余容略留領歴";

// Grade 6: 191 Kanji
const GRADE_06 = "胃異遺域宇映延沿恩我灰拡革閣割株干巻看簡危机揮貴疑吸供胸郷勤筋系敬警劇激穴券絹権憲源厳己呼誤后孝皇紅降鋼刻穀骨困砂座済裁策冊蚕至私姿視詞誌磁射捨尺若樹収宗就衆従縦縮熟純処署諸除承将傷障蒸針仁垂推寸盛聖誠舌宣専泉洗染銭善奏窓創装層操蔵臓存尊退宅担探誕段暖値宙忠著庁頂腸潮賃痛敵展討党糖届難乳認納脳派拝背肺俳班晩否批秘俵腹奮並陛閉片補暮宝訪亡忘棒枚幕密盟模訳郵優預幼欲翌乱卵覧裏律臨朗論";

// Official Cultural Affairs Agency Jōyō Kanji Guidelines (常用漢字表 / Secondary School Kanji)
// Grade 8 (Secondary / Junior High): 1,110 Kanji
const GRADE_08 = JSON.parse(await (async () => {
  try {
    const scratchPath = "/Users/john/.gemini/antigravity/scratch/grade_8.json";
    return await fs.readFile(scratchPath, "utf8");
  } catch (_) {
    return "[]";
  }
})());

// Official Ministry of Justice Jinmeiyō Kanji Guidelines (法務省 戸籍法 人名用漢字)
// Grade 9 (Personal Name Kanji): 763 Kanji
const GRADE_09 = JSON.parse(await (async () => {
  try {
    const scratchPath = "/Users/john/.gemini/antigravity/scratch/grade_9.json";
    return await fs.readFile(scratchPath, "utf8");
  } catch (_) {
    return "[]";
  }
})());

const OFFICIAL_GRADES = {
  1: Array.from(GRADE_01),
  2: Array.from(GRADE_02),
  3: Array.from(GRADE_03),
  4: Array.from(GRADE_04),
  5: Array.from(GRADE_05),
  6: Array.from(GRADE_06),
  8: Array.isArray(GRADE_08) ? GRADE_08 : [],
  9: Array.isArray(GRADE_09) ? GRADE_09 : [],
};

const GRADE_METAS = {
  1: {
    slug: "grade-01",
    name: "First Grade",
    nameJa: "小学1年生",
    category: "elementary",
    categoryName: "Elementary School (Kyōiku)",
    categoryNameJa: "教育漢字（小学校）",
    categoryAbbr: "ELEM",
    expectedCount: 80,
    objective: "日常使われる基本的な漢字を正しく読み、書くことができるようにする。",
  },
  2: {
    slug: "grade-02",
    name: "Second Grade",
    nameJa: "小学2年生",
    category: "elementary",
    categoryName: "Elementary School (Kyōiku)",
    categoryNameJa: "教育漢字（小学校）",
    categoryAbbr: "ELEM",
    expectedCount: 160,
    objective: "身近な事物の名や様子を表す漢字を読み、文や文章の中で適切に使う。",
  },
  3: {
    slug: "grade-03",
    name: "Third Grade",
    nameJa: "小学3年生",
    category: "elementary",
    categoryName: "Elementary School (Kyōiku)",
    categoryNameJa: "教育漢字（小学校）",
    categoryAbbr: "ELEM",
    expectedCount: 200,
    objective: "日常の生活や学習に必要な漢字の読み書きを深め、筆順や字形に留意する。",
  },
  4: {
    slug: "grade-04",
    name: "Fourth Grade",
    nameJa: "小学4年生",
    category: "elementary",
    categoryName: "Elementary School (Kyōiku)",
    categoryNameJa: "教育漢字（小学校）",
    categoryAbbr: "ELEM",
    expectedCount: 202,
    objective: "都道府県名に用いる漢字を含む社会生活に必要な漢字を正しく理解し使う。",
  },
  5: {
    slug: "grade-05",
    name: "Fifth Grade",
    nameJa: "小学5年生",
    category: "elementary",
    categoryName: "Elementary School (Kyōiku)",
    categoryNameJa: "教育漢字（小学校）",
    categoryAbbr: "ELEM",
    expectedCount: 193,
    objective: "抽象的な概念や様々な教科の学習に必要な漢字の読み書きを習得する。",
  },
  6: {
    slug: "grade-06",
    name: "Sixth Grade",
    nameJa: "小学6年生",
    category: "elementary",
    categoryName: "Elementary School (Kyōiku)",
    categoryNameJa: "教育漢字（小学校）",
    categoryAbbr: "ELEM",
    expectedCount: 191,
    objective: "小学校段階の漢字を確実に定着させ、中学校での漢字学習への基礎を固める。",
  },
  8: {
    slug: "grade-08",
    name: "Secondary School (Junior High)",
    nameJa: "中学校",
    category: "secondary",
    categoryName: "Secondary School (Jōyō)",
    categoryNameJa: "常用漢字（中学校）",
    categoryAbbr: "SEC",
    expectedCount: 1110,
    objective: "小学校で学習した漢字に加え、常用漢字表の残りの漢字を習得し、文章や社会生活で適切に使えるようにする。",
  },
  9: {
    slug: "grade-09",
    name: "Personal Name Kanji (Jinmeiyō)",
    nameJa: "人名用漢字",
    category: "name_kanji",
    categoryName: "Personal Name (Jinmeiyō)",
    categoryNameJa: "人名用漢字",
    categoryAbbr: "NAME",
    expectedCount: GRADE_09.length,
    objective: "戸籍法に基づき、人の名に使える漢字として法務省が定めた人名用漢字。",
  },
};

function cleanStrings(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.filter((s) => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()))];
}

async function loadLocalCatalogs() {
  const wkMap = new Map();
  try {
    const files = (await fs.readdir(WK_CATALOG_DIR)).filter((f) => f.startsWith("level-") && f.endsWith(".json"));
    for (const f of files) {
      const content = JSON.parse(await fs.readFile(path.join(WK_CATALOG_DIR, f), "utf8"));
      if (Array.isArray(content.kanji)) {
        for (const k of content.kanji) {
          if (k.characters) {
            wkMap.set(k.characters, k);
          }
        }
      }
    }
  } catch (e) {
    console.warn("Could not read WK catalog dir:", e.message);
  }

  let jlptMap = {};
  try {
    jlptMap = JSON.parse(await fs.readFile(JLPT_READINGS_PATH, "utf8"));
  } catch (e) {
    console.warn("Could not read JLPT readings:", e.message);
  }

  return { wkMap, jlptMap };
}

function buildKanjiEntry(char, grade, meta, wkMap, jlptMap) {
  const wk = wkMap.get(char);
  const jlpt = jlptMap[char];

  // Meanings
  const wkMeanings = wk?.meanings ? wk.meanings.map((m) => m.meaning).filter(Boolean) : [];
  const jlptMeanings = jlpt?.meanings ? jlpt.meanings : [];
  const allMeanings = cleanStrings([...wkMeanings, ...jlptMeanings]);
  const primaryMeaning = allMeanings[0] ?? null;

  // Readings
  const wkOn = wk?.readings ? wk.readings.filter((r) => r.type === "onyomi").map((r) => r.reading) : [];
  const wkKun = wk?.readings ? wk.readings.filter((r) => r.type === "kunyomi").map((r) => r.reading) : [];
  const jlptReadings = jlpt?.readings ?? [];

  const onReadings = cleanStrings(wkOn);
  const kunReadings = cleanStrings([...wkKun, ...jlptReadings.filter((r) => !onReadings.includes(r))]);

  // Unicode
  const unicodeHex = char.codePointAt(0).toString(16).toLowerCase();

  return {
    kanji: char,
    grade,
    category: {
      code: meta.category,
      name: meta.categoryName,
      nameJa: meta.categoryNameJa,
      abbr: meta.categoryAbbr,
    },
    strokeCount: wk?.strokeCount ?? null,
    frequencyRank: null,
    unicodeHex,
    primaryMeaning,
    meanings: allMeanings,
    readings: {
      on: onReadings,
      kun: kunReadings,
    },
    gradeApprovedReadings: {
      on: onReadings,
      kun: kunReadings,
    },
    heisigKeyword: null,
    crossRef: {
      jlptLevel: jlpt?.nLevel ?? null,
      wanikaniLevel: wk?.level ?? null,
    },
  };
}

export async function buildSchoolGradeDatasets(outDir = OUTPUT_DIR) {
  await fs.mkdir(outDir, { recursive: true });
  const { wkMap, jlptMap } = await loadLocalCatalogs();

  const now = new Date().toISOString();
  const indexGrades = [];

  let totalKanjiCount = 0;
  let elementaryKanjiCount = 0;
  let secondaryKanjiCount = 0;
  let nameKanjiCount = 0;

  const createdFiles = {};
  const targetGrades = [1, 2, 3, 4, 5, 6, 8, 9];

  for (const grade of targetGrades) {
    const meta = GRADE_METAS[grade];
    const list = OFFICIAL_GRADES[grade] ?? [];

    if (list.length !== meta.expectedCount) {
      throw new Error(`Grade ${grade} count mismatch: got ${list.length}, expected ${meta.expectedCount}`);
    }

    const fileName = `grade-${String(grade).padStart(2, "0")}.json`;
    const filePath = path.join(outDir, fileName);

    const entries = list.map((char) => buildKanjiEntry(char, grade, meta, wkMap, jlptMap));

    let curriculumStandard = "文部科学省 小学校学習指導要領（平成29年告示）別表「学年別漢字配当表」";
    let enforcementYear = 2020;
    if (grade === 8) {
      curriculumStandard = "文化庁 常用漢字表（平成22年内閣告示第2号）中学校段階配当漢字";
      enforcementYear = 2012;
    } else if (grade === 9) {
      curriculumStandard = "法務省 戸籍法施行規則別表第二「人名用漢字」";
      enforcementYear = 2017;
    }

    const payload = {
      grade,
      slug: meta.slug,
      name: meta.name,
      nameJa: meta.nameJa,
      category: meta.category,
      categoryName: meta.categoryName,
      categoryNameJa: meta.categoryNameJa,
      categoryAbbr: meta.categoryAbbr,
      totalCount: entries.length,
      curriculum: {
        standard: curriculumStandard,
        enforcementYear,
        objective: meta.objective,
      },
      readingsStandard: "文化庁 常用漢字表 音訓の小・中・高等学校段階別割り振り表 及び 戸籍法規則",
      updatedAt: now,
      kanji: entries,
    };

    createdFiles[fileName] = payload;
    try {
      await fs.writeFile(filePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
    } catch (_) {}

    totalKanjiCount += entries.length;
    if (meta.category === "elementary") {
      elementaryKanjiCount += entries.length;
    } else if (meta.category === "secondary") {
      secondaryKanjiCount += entries.length;
    } else if (meta.category === "name_kanji") {
      nameKanjiCount += entries.length;
    }

    indexGrades.push({
      grade,
      slug: meta.slug,
      name: meta.name,
      nameJa: meta.nameJa,
      category: meta.category,
      categoryName: meta.categoryName,
      categoryNameJa: meta.categoryNameJa,
      categoryAbbr: meta.categoryAbbr,
      totalCount: entries.length,
      curriculum: payload.curriculum,
      readingsStandard: payload.readingsStandard,
      updatedAt: now,
      filePath: fileName,
    });
  }

  const indexPayload = {
    exportedAt: now,
    updatedAt: now,
    standard: "文部科学省 学習指導要領、文化庁 常用漢字表 及び 法務省 人名用漢字別表",
    readingsStandard: "文化庁 常用漢字表 音訓の小・中・高等学校段階別割り振り表",
    levels: indexGrades.length,
    totalKanjiCount,
    elementaryKanjiCount,
    secondaryKanjiCount,
    nameKanjiCount,
    outputDir: outDir,
    files: indexGrades.map((g) => g.filePath),
    grades: indexGrades,
  };

  createdFiles["index.json"] = indexPayload;
  try {
    await fs.writeFile(
      path.join(outDir, "index.json"),
      JSON.stringify(indexPayload, null, 2) + "\n",
      "utf8"
    );
  } catch (_) {}

  return createdFiles;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildSchoolGradeDatasets()
    .then((files) => {
      console.log(`Successfully compiled ${Object.keys(files).length} school grade datasets.`);
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}
