/**
 * Seeds the blog with SEO posts.
 *
 *   pnpm --filter @growthos/api exec tsx --env-file=.env scripts/seed-blog.ts
 *
 * Idempotent by slug: a post already in the table is skipped, so this never overwrites something
 * someone has since edited in the console. Pass `--drafts` to seed them unpublished.
 *
 * **These are real posts, not lorem ipsum.** They are the ones the marketing site would want
 * anyway, and every claim in them is held to what actually ships — CLAUDE.md's marketing rule
 * applies to the blog as much as to the landing page. So: no GEO or AI-citation tracking, no
 * generated imagery, no "prediction" (the scorecard is retrospective), no writing to ad accounts,
 * and nothing implying a language model wrote the copy. Where a post names a GrowthOS behaviour it
 * is one with an engine behind it in packages/logic.
 */
import { db, schema } from '@growthos/db'
import { eq } from 'drizzle-orm'
import { countWords, toPlainText } from '../src/blog.js'
import { parseMarkdown } from './markdown-to-doc.js'

const AUTHOR = 'The GrowthOS team'

interface Seed {
  slug: string
  title: string
  description: string
  tag: string
  /** ISO date. Spread backwards so the index does not show five posts from one afternoon. */
  publishedAt: string
  body: string
}

const POSTS: Seed[] = [
  {
    slug: 'core-web-vitals-what-actually-moves-them',
    title: 'Core Web Vitals: the three numbers, and what actually moves them',
    description:
      'LCP, INP and CLS are measured on real visits, not in a lab, and each has one or two dominant causes. Here is what each threshold means, why your lab score disagrees with your field data, and the fixes that move the needle.',
    tag: 'Technical SEO',
    publishedAt: '2026-08-05',
    body: `Core Web Vitals are three numbers, and almost every site that fails one fails it for the same handful of reasons. The trouble is that the tooling reports them alongside forty other diagnostics, so the two that matter are buried in a list where everything looks equally urgent.

Here is the short version: **Largest Contentful Paint** under 2.5 seconds, **Interaction to Next Paint** under 200 milliseconds, **Cumulative Layout Shift** under 0.1. Each is measured at the 75th percentile of real visits, which is the part most people miss.

## Your lab score is not your score

Run a page through a synthetic test and you get a simulated load on a throttled connection from one location. Useful for debugging. It is not what anyone is graded on.

The scores that count come from field data: actual visits, actual devices, actual networks, aggregated over 28 days at the 75th percentile. That means a quarter of your visitors can be having a worse time than your number suggests, and a single fast test run from a datacenter proves nothing about the person on a four-year-old Android phone on a train.

The practical consequence is that improvements take 28 days to fully show up, and a fix deployed today shows partial movement for a month. Plan for that. Teams routinely ship a fix, check the number a week later, see it barely moved, and revert something that was working.

## LCP is almost always the hero image

Largest Contentful Paint measures when the biggest element in the viewport finishes rendering. On most pages that is a hero image or a headline.

The dominant causes, in the order they are usually worth checking:

- **The image is discovered late.** If the hero is loaded by JavaScript, or sits behind a lazy-loading attribute, the browser cannot start fetching it until well into the load. Hero images should be in the HTML and should never be lazy-loaded.
- **The image is enormous.** A 2.4MB PNG served at 800px wide is the single most common cause of a failing LCP on a content site.
- **Render-blocking CSS and fonts.** Every stylesheet in the head delays the first paint. A font loaded without a fallback strategy can hold text invisible for seconds.
- **Slow server response.** If the document itself takes 800ms to arrive, you have spent a third of the budget before the browser has seen a single byte of content.

## INP replaced FID, and it is harder

First Input Delay only measured the delay before the browser began handling your first interaction. It was easy to pass and told you very little. Interaction to Next Paint measures the full duration of interactions across the whole visit — click to visible response — and reports roughly the worst one.

That change moved a lot of sites from passing to failing without anything about them getting worse. The usual culprits are long JavaScript tasks blocking the main thread, oversized event handlers doing layout work synchronously, and third-party tags that were never audited because they were never visible.

The fix is usually not clever: break up long tasks, defer what does not need to run on load, and check what your tag manager is actually loading. A chat widget and two analytics scripts can own more of your main thread than your entire application.

## CLS is a measurement problem disguised as a design problem

Layout shift happens when something loads late and pushes content that was already visible. Images without dimensions, ads and embeds in unreserved space, and fonts that swap to a differently-sized face are the three big ones.

All three have the same fix: reserve the space before the thing arrives. Width and height attributes on images, a fixed-height container for anything injected, and a fallback font metrically matched to the real one.

## Where this fits in a report

Core Web Vitals are a real ranking signal, but a small one, and treating them as a growth lever on their own leads to a lot of work for very little movement. They matter most as a floor: a page that fails them is losing conversions on its own merits long before rankings enter into it.

GrowthOS tracks the three field metrics per page alongside the SEO score, so a technical regression shows up next to the traffic it affects rather than in a separate tool nobody opens. That is the useful framing — not "improve the score", but "this page got slower on the day traffic dropped".`,
  },

  {
    slug: 'internal-links-are-the-cheapest-ranking-lever',
    title: 'Internal links are the cheapest ranking lever you own',
    description:
      'You already own every internal link on your site. Most content sites leave dozens of pages orphaned or buried five clicks deep, then buy backlinks instead. Here is how to find and fix that.',
    tag: 'Technical SEO',
    publishedAt: '2026-08-12',
    body: `Every internal link on your site is a link you control completely. No outreach, no budget, no waiting on someone else to publish. And on most content sites, a meaningful share of pages are either orphaned — reachable by nobody — or buried so deep that crawlers rarely reach them.

That is free authority sitting unused while the same teams price backlink campaigns.

## The two problems worth finding

**Orphan pages** have no internal links pointing at them at all. They usually got there honestly: published from a template that was never added to a hub page, or left behind when a category page was redesigned. A page with no internal links is discoverable only through the sitemap, and search engines treat sitemap-only discovery as a weak signal.

**Deep pages** are reachable, but only after four or five clicks from the homepage. Click depth correlates strongly with how often a page is crawled and how much authority it inherits. A post that took a week to write should not be five clicks from anything.

Both are trivially detectable and almost never checked, because the tools that find them present the result as a number in a technical audit rather than as a list of specific pages with specific fixes.

## Anchor text is not a place for "click here"

Internal anchor text is one of the clearest signals you can send about what a page is about, and it costs nothing to get right. Three rules cover most cases:

- **Describe the destination, not the action.** "Our guide to blended MER" beats "read more" every time.
- **Vary it, but stay on topic.** Ten identical anchors to one page is a pattern; ten related phrasings is a topic.
- **Do not link the same phrase to two different pages.** You are asking a search engine to pick, and it may not pick the one you wanted.

## Link from strength to need

The pages that already rank are the ones with authority to pass. Linking from a strong page to a page that needs help moves something real; linking from a new post that nobody reads to another new post moves almost nothing.

That inverts how most people do it. The instinct is to add links to the newest post, because it is the one in front of you. The higher-value work is going back to your best-performing pages and adding one or two links out to the pages that deserve to rank and do not.

## A workable cadence

This does not need a project. It needs a habit:

1. Once a month, list pages with no inbound internal links. Fix them by adding a link from the most relevant existing page — relevance first, not convenience.
2. List pages more than three clicks from the homepage. Ask whether a hub page or a category listing is missing.
3. When publishing anything new, add two links out to existing pages and one link in from an existing page. The last part is the one everyone skips.

That third step is the whole discipline. Publishing is the moment you have the most context about what relates to what, and it is also the moment you are most eager to be finished.

## What GrowthOS does with this

The internal link engine maps the graph, flags orphans and deep pages, and proposes specific link placements: which page to link from, which to link to, and a suggested anchor drawn from the target page's own headings and ranking queries.

It proposes. It does not edit your site. Every suggestion lands in the recommendation queue with the reasoning attached, because a link inserted by a machine into prose it did not write is how sites end up with paragraphs that read like a directory listing.`,
  },

  {
    slug: 'schema-markup-what-earns-a-rich-result',
    title: "Schema markup: what earns a rich result, and what just validates",
    description:
      'Valid structured data and eligible structured data are different things. Here are the types that still earn a visible result in 2026, the ones Google has quietly retired, and how to tell which of yours are doing anything.',
    tag: 'Technical SEO',
    publishedAt: '2026-08-20',
    body: `There is a gap between structured data that validates and structured data that earns anything, and most sites live in it. The validator turns green, the ticket gets closed, and the result in search looks exactly the same as it did before.

Validation only means the syntax parses and the required properties exist. Eligibility means Google has a rich result for that type, your page qualifies for it, and the algorithm chooses to show it. Three separate conditions, and only the first is under your control.

## What still earns something visible

The types that reliably change how a result looks:

- **Article** — feeds the headline, date and image on news and blog results. Low effort, applies to every post you have.
- **Product** — price, availability and review stars. The highest-impact type there is, and the one most tightly policed.
- **Breadcrumb** — replaces the raw URL in the result with a readable path. Small, easy, almost never wrong.
- **Organization** — feeds knowledge panel details and the logo shown beside your results.
- **LocalBusiness** — hours, address, phone, for anywhere with a physical location.
- **Video** — thumbnails and key moments, for pages where video is the main content.

## What has quietly stopped paying

**FAQ** markup was the single most over-implemented type of the last several years, and Google restricted its display to well-known authoritative government and health sites. On an ordinary commercial site it now validates perfectly and shows nothing.

**HowTo** went the same way, removed from results entirely.

Both are still worth having as a machine-readable description of the page. Neither is worth a sprint. If someone is proposing an FAQ schema project on the basis of screenshots from three years ago, that is the conversation to have.

## Three mistakes that quietly disqualify a page

**Marking up content that is not on the page.** Structured data must describe what a visitor actually sees. Review markup for reviews rendered only in a tab that loads on click, or aggregate ratings pulled from a source not shown anywhere — that is a manual action waiting to happen, not a shortcut.

**Self-serving review markup.** Reviews of your own business, on your own site, marked up as an aggregate rating on your homepage, have not been eligible for years.

**Marking up the wrong entity.** A category page marked up as a single Product, or a blog index marked up as an Article, will validate and will never be eligible. The type has to match what the page actually is.

## How to tell whether yours is doing anything

The validator is the wrong instrument for this question — it answers "is this valid", not "is this doing anything". Search Console's enhancement reports are closer: they show which pages are eligible for which rich result, and which have errors serious enough to disqualify them.

The blunt test is better still: search for a page's exact title and look at the result. Either it renders differently from an ordinary blue link, or it does not.

## What GrowthOS does with this

The schema engine reads what is already on a page, identifies the type that page actually is, and reports coverage against the types that still earn a result — separating "no markup", "markup present but not eligible", and "eligible" instead of collapsing all three into a validity score.

Generated markup is deterministic and built from the page's own content. It is a proposal you review, not something injected into your site, for the same reason the rest of this list exists: structured data that describes something the page does not contain is worse than none at all.`,
  },

  {
    slug: 'the-search-terms-report-is-a-content-brief',
    title: 'Your search terms report is a content brief you already paid for',
    description:
      'Google Ads tells you which exact queries converted, with revenue attached. That is keyword research with the guesswork removed — and most teams never move it to the SEO side of the building.',
    tag: 'Strategy',
    publishedAt: '2026-08-27',
    body: `Keyword research tools give you estimated volume and a difficulty score invented by the vendor. Your search terms report gives you the exact queries real people typed, how many converted, and what those conversions were worth.

One of these is a guess. The other is an invoice.

Most teams run both channels and never move data between them, because the reports live in different tools, are read by different people, and get reviewed on different schedules. The paid team optimises bids. The SEO team picks topics from a volume estimate. Nobody makes the one connection that is sitting there in plain sight.

## The query that converts is the article you should write

A search term that converted in Google Ads is proof of three things at once: people search it, they are ready to buy when they do, and your offer answers it. That is exactly the case an SEO topic has to make before it is worth writing, and it usually has to make it on speculation.

So the shortlist writes itself. Take search terms from the last 90 days with at least a handful of conversions. Rank them by revenue, not clicks. Anything you are paying for repeatedly, with no organic page ranking for it, is a brief.

Ranking organically for a term you currently buy does not always let you turn the ads off — the two often compound rather than substitute. But it changes the economics of the term permanently, and it keeps working when the budget pauses.

## Run it in the other direction too

The reverse trip is just as valuable and even less common.

A page that ranks well organically has already demonstrated that your message lands for that intent. Its title and meta description are, in effect, ad copy that has been tested against real search results. They are a reasonable starting point for a responsive search ad headline.

And a query where you rank on page two — real impressions, few clicks — is a good candidate for paid coverage while the organic position improves. You are already visible for it; you are just not visible enough to be chosen.

## What to actually look at

Three filters do most of the work:

- **Converting terms with no organic page.** The content gap, ordered by money rather than by volume.
- **High-spend terms where you already rank first organically.** Sometimes a defensive necessity, sometimes budget spent to appear above yourself. Worth knowing which.
- **Rising terms.** A query that has appeared for the first time in the last month and converted is early. Volume estimates will not show it for another two quarters.

## Why this is the whole idea

This is one of the six bridges GrowthOS is built around, and it is the clearest of them: converting search terms become content briefs, ranked by revenue, with the query, the conversion count and the value attached so the brief carries its own justification.

The briefs are built deterministically from your own data — the query, the pages that already rank for it, the intent cluster it belongs to. No language model writes them, and none is required to: the useful part of a brief is which query, why now, and what it is worth. That part is arithmetic.

None of this is technically difficult. It is a report joining two tables. It stays undone because the two tables are owned by different people, and that is a much harder problem than the query.`,
  },

  {
    slug: 'branded-search-is-a-demand-signal',
    title: 'Branded search is a demand signal, not an SEO win',
    description:
      "Branded queries inflate every organic report they touch. Split them out and two things become visible: what SEO actually did, and whether your other marketing is working.",
    tag: 'Measurement',
    publishedAt: '2026-09-02',
    body: `If your organic traffic report includes branded queries, it is measuring two completely different things and adding them together.

Someone searching your company name has already decided to visit you. They found out somewhere else — an ad, a podcast, a recommendation, a conference — and search was just the address bar. Ranking first for your own name is table stakes, not an achievement.

Someone searching a problem you solve has not decided anything. Winning that query is what SEO is for.

Add the two together and you get a number that goes up when the brand campaign works and down when it stops, while the actual SEO work is invisible underneath.

## What splitting them reveals

**Branded volume is a demand signal.** It tracks awareness with a short lag. When a podcast sponsorship lands or a launch gets picked up, branded search moves within days — often before any other channel shows anything, because searching a name you just heard is the first thing people do. It is one of the few honest read-outs on brand marketing that does not depend on attribution modelling at all.

**Non-branded volume is your actual SEO trend.** Flat non-branded under rising total organic means your SEO is not growing; something else is, and organic is taking the credit.

The reverse case is more painful and more common: rising non-branded under flat total organic. The SEO work is genuinely landing and it is hidden because branded volume slipped at the same time.

## Where the split gets messy

There is no clean line, and pretending otherwise produces a tidy number that is wrong.

Start with the obvious: your brand name, its misspellings, and your product names. Then the judgement calls — "yourbrand vs competitor" is branded, but it is also mid-consideration and not the same as someone typing your name to get to your login page. "yourbrand pricing" is branded and high intent. "yourbrand login" is branded and worth almost nothing, and on many sites it is the single largest branded query by volume.

The useful move is not two buckets but three: navigational, branded-consideration, and non-branded. Navigational traffic is people who are already customers, and it should be excluded from anything you call acquisition.

## Two things worth doing this week

**Exclude navigational queries from acquisition reporting.** Login, account, support, sign-in. On a mature product these can be a third of organic sessions and they are not acquisition by any definition.

**Chart branded volume against your non-search marketing.** Overlay it with campaign flights, launches, press. If branded search does not move when a campaign runs, you have learnt something about the campaign that no attribution model was going to tell you.

## How this connects to everything else

Branded search is the cleanest available proxy for demand that marketing created but cannot claim. It is also the thing that makes organic reports lie.

GrowthOS separates branded from non-branded in the SEO scorecard and reads branded volume as a demand signal alongside paid spend, rather than as an SEO metric. That is the point of a blended view: the same query volume answers a different question depending on which channel you are asking about, and a report that only knows about one channel cannot tell the difference.`,
  },
]

async function main() {
  const asDrafts = process.argv.includes('--drafts')
  let seeded = 0
  let skipped = 0

  for (const post of POSTS) {
    const [existing] = await db
      .select({ id: schema.blogPosts.id })
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.slug, post.slug))
      .limit(1)

    if (existing) {
      console.log(`  skip  ${post.slug} (already there)`)
      skipped++
      continue
    }

    const doc = parseMarkdown(post.body)
    const plainText = toPlainText(doc)

    await db.insert(schema.blogPosts).values({
      slug: post.slug,
      title: post.title,
      description: post.description,
      body: doc,
      plainText,
      wordCount: countWords(plainText),
      tag: post.tag,
      authorName: AUTHOR,
      publishedAt: asDrafts ? null : new Date(post.publishedAt),
    })

    console.log(
      `  ok    ${post.slug} — ${countWords(plainText)} words, ${doc.content?.length ?? 0} blocks`,
    )
    seeded++
  }

  console.log(`\nSeeded ${seeded}, skipped ${skipped}${asDrafts ? ' (as drafts)' : ''}.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
