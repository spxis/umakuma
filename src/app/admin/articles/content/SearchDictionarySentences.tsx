import { Figures, Jp, Lead, Note, P, Points, Release, Section, Term } from "../ArticleProse";

/**
 * The search rebuild and the two corpora, written up the day they shipped.
 *
 * Kept because the numbers in it were measured rather than assumed, and three
 * of them corrected something stated confidently beforehand. That is the part
 * worth having six months from now.
 */
export default function SearchDictionarySentences() {
  return (
    <div className="space-y-8">
      <Lead>
        Fourteen releases over two days: the search box rebuilt end to end, two reference corpora
        imported, and four real bugs found along the way. Every one committed on its own, released on
        its own, and verified live before the next started.
      </Lead>

      <Figures
        items={[
          { value: "14", label: "releases shipped" },
          { value: "10,384", label: "kanji in the dictionary" },
          { value: "232,731", label: "example sentences" },
          { value: "1,034", label: "unit tests passing" },
        ]}
      />

      <Section title="What shipped">
        <div>
          <Release version="0.152.0" codename="届く灯台" reading="Todoku Toudai">
            “watashi” returned nothing, because readings are stored in kana. A query now folds into
            every spelling it could mean — raw, hiragana, katakana — and scores by its best variant.
          </Release>
          <Release version="0.153.0" codename="滑らかな流れ" reading="Nameraka na Nagare">
            Header and search page run the same combobox: ghost-grey completion that Enter locks in,
            a clear button, the magnifier as submit, half width until focused, and the results page
            keeping the site navigation it used to drop.
          </Release>
          <Release version="0.159.0" codename="開く引き出し" reading="Hiraku Hikidashi">
            “a” is 122 rows; the dropdown fetched all of them and threw away all but ten. Both
            surfaces now take a window that grows as you arrow or scroll toward the end.
          </Release>
          <Release version="0.160.0" codename="踏み出す舟" reading="Fumidasu Fune">
            Clicking the magnifier with nothing typed did nothing at all. Empty now means “take me to
            search”.
          </Release>
          <Release version="0.161.0" codename="平気な舳先" reading="Heiki na Hesaki">
            “See all N results” sat bottom-left in the same type as a result. Now centred, full
            width, tinted when arrowed onto.
          </Release>
          <Release version="0.162.0" codename="保管の本棚" reading="Hokan no Hondana">
            Five recent searches shown, twenty remembered — so forgetting one reveals the sixth
            rather than leaving a gap. Stored per device, so signed-out visitors get them too.
          </Release>
          <Release version="0.172.0" codename="履歴のリボン" reading="Rireki no Ribon">
            Recent searches moved out of their own card and into the results list as its closing
            rows, behind a titled band — same card, same rhythm, same lane the glyphs occupy.
          </Release>
          <Release version="0.177.0" codename="現れる灯り" reading="Arawareru Akari">
            All three catalogues searched every meaning then ranked on the first alone, so anything
            matched on another was found and discarded. “magnate” went 0 → 2 hits; “home” 21 → 45,
            with <Jp>家</Jp> among them.
          </Release>
          <Release version="0.179.0" codename="受け入れる家" reading="Ukeireru Uchi">
            Every result linked into a member’s own explorer, so a signed-out reader got rows of dead
            text on the page most likely to reach them. Single kanji now open their public page.
          </Release>
          <Release version="0.181.0" codename="大きな覚書" reading="Ooki na Oboegaki">
            KANJIDIC2 shipped with the site: 10,384 characters with every meaning, every on and kun
            reading, name readings, stroke counts, grades and frequency ranks.
          </Release>
          <Release version="0.183.0" codename="気づく記録" reading="Kizuku Kiroku">
            <Jp>渕</Jp> and <Jp>煕</Jp> — both inside the 1,500 most frequent characters — returned
            nothing until the dictionary became a fourth source. It fills gaps rather than adding a
            fourth copy of every common character.
          </Release>
          <Release version="0.184.0" codename="区切る空間" reading="Kugiru Kukan">
            A hundred results made the page many screens tall. Rows now scroll inside the card while
            the box, tabs and recent searches hold their place.
          </Release>
          <Release version="0.185.0" codename="決して気配" reading="Kesshite Kehai">
            232,731 Tatoeba sentences, indexed by the characters they contain, easiest first.{" "}
            <Jp>水</Jp> opens with <Jp>水をくれ！</Jp> rather than one of the other 1,644 it appears
            in.
          </Release>
          <Release version="0.191.0" codename="底力の空" reading="Sokojikara no Sora">
            A glyph is text too. Radical cyan sat at 2.41:1 on white, so the pill reading “RADICAL”
            was legible while the <Jp>水</Jp> beside it was not.
          </Release>
        </div>
      </Section>

      <Section title="What we measured">
        <P>
          Numbers that changed a decision — including three where measuring corrected something
          asserted confidently beforehand.
        </P>
        <Points
          items={[
            <>
              <Term>94%</Term> of Japanese Tatoeba sentences have an English translation, not the
              ~50% first guessed. That removed storage as an argument for dropping the rest.
            </>,
            <>
              <Term>111</Term> kanji are uniquely covered by untranslated sentences, and only 47 are
              common — archaic variants like <Jp>國</Jp> and <Jp>奧</Jp>. That settled keeping them
              anyway, since they cost 2% and are what a kana vocabulary word would need later.
            </>,
            <>
              <Term>28%</Term> of the dictionary’s characters have any example sentence at all:
              2,916 of 10,384. The sentence block renders nothing for the rest rather than an empty
              shelf.
            </>,
            <>
              <Term>3.7 MB</Term> — the whole kanji dictionary as generated JSON, smaller than the
              stroke data already in the repo. It needed no database and no production schema push,
              though both imports had been said to need one.
            </>,
            <>
              <Term>7,410</Term> dictionary entries the build script silently dropped on its first
              run, because <code>Number(null)</code> is 0 and every ungraded character was being
              labelled grade 0. The build now refuses to write unless every entry lands in a file.
            </>,
            <>
              <Term>~90 ms</Term> for a sentence lookup against 232,731 rows, via the GIN index on
              the kanji array.
            </>,
          ]}
        />
        <Note>
          One correction worth carrying forward: <Jp>苺</Jp> was described as missing from our data.
          It is in the school-grades catalogue and search found it all along — the JLPT table is the
          one with holes. The characters search genuinely could not find were <Jp>渕</Jp> and{" "}
          <Jp>煕</Jp>.
        </Note>
      </Section>

      <Section title="Working notes">
        <Points
          items={[
            <>
              <Term>Never reserve a version number.</Term> Four sessions share this checkout, and
              main moved nine releases during one piece of work. Numbers are computed against{" "}
              <code>origin/main</code> in the same breath as the commit that spends them.
            </>,
            <>
              <Term>Schema reaches production before the commit does.</Term> The deploy runs a drift
              check and halts on disagreement, so committing a Prisma change first would block every
              session’s deploys. Tatoeba went push → ingest → commit, in that order.
            </>,
            <>
              <Term>Licences are conditions, not credits.</Term> KanjiVG (CC BY-SA 3.0), KANJIDIC2
              (CC BY-SA 4.0) and Tatoeba (CC BY 2.0 FR) are each named on every page that shows their
              data, with a test asserting the credit exists.
            </>,
            <>
              <Term>Ratios pass in one theme and fail in the other.</Term> The first palette fix put
              dark crimson on a dark pill and made a label unreadable. Every ratio still passed —
              they were all measured against white.
            </>,
          ]}
        />
      </Section>
    </div>
  );
}
