// Shared HTML pieces for the docs site: head, header, footer, structured data.

export const SITE = "https://aman5062.github.io/Piilite/";
export const REPO = "https://github.com/aman5062/Piilite";
export const NPM = "https://www.npmjs.com/package/piilite";
export const AUTHOR = { name: "Aman kumar keshri", url: "https://github.com/aman5062" };
export const PUBLISHED = "2026-10-27";

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** A code block. Comments get a quiet colour; nothing else is highlighted. */
export function code(src, lang = "js") {
  const body = esc(src.replace(/^\n+|\s+$/g, "")).replace(/(^|\s)(\/\/[^\n]*|#[^\n!][^\n]*)/g, (m, pre, c) =>
    lang === "bash" || c.startsWith("//") ? `${pre}<span class="c-com">${c}</span>` : m
  );
  return `<div class="code"><span class="lang">${lang}</span><pre><code>${body}</code></pre></div>`;
}

/** A table. `num` = indexes of numeric columns (right aligned). */
export function table(head, rows, { num = [], caption } = {}) {
  const cell = (tag, v, i) => `<${tag}${tag === "th" ? ' scope="col"' : ""}${num.includes(i) ? ' class="num"' : ""}>${v}</${tag}>`;
  return `<div class="table"><table>${caption ? `<caption class="sr">${caption}</caption>` : ""}<thead><tr>${head
    .map((h, i) => cell("th", h, i))
    .join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v, i) => cell("td", v, i)).join("")}</tr>`).join("")}</tbody></table></div>`;
}

export const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/** h2 with a stable id; collected into the on-page table of contents. */
export const h2 = (text, id = slugify(text)) => `<h2 id="${id}"><a class="anchor" href="#${id}">${text}</a></h2>`;
export const h3 = (text, id = slugify(text)) => `<h3 id="${id}"><a class="anchor" href="#${id}">${text}</a></h3>`;

const NAV = [
  ["", "Home"],
  ["guide/", "Guide"],
  ["india-pii/", "Indian PII"],
  ["llm/", "LLM apps"],
  ["presets/", "Presets"],
  ["playground/", "Playground"],
  ["openredaction/", "vs OpenRedaction"],
  ["accuracy/", "Accuracy"],
  ["faq/", "FAQ"],
];

const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0f766e"/><path d="M32 12 16 18v12c0 11 7 19 16 22 9-3 16-11 16-22V18z" fill="#fff"/><rect x="22" y="29" width="20" height="6" rx="3" fill="#0f766e"/></svg>`;
const GITHUB = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;

function header(page, root) {
  const items = NAV.map(
    ([slug, label]) =>
      `<li><a href="${root}${slug}"${slug === page.path ? ' aria-current="page"' : ""}>${label}</a></li>`
  ).join("");
  return `<header class="site-header"><div class="bar">
<a class="brand" href="${root}" aria-label="piilite home">${LOGO}<span>piilite</span></a>
<nav class="nav" aria-label="Main"><ul class="nav-desktop">${items}</ul><details class="nav-mobile"><summary class="nav-toggle">Menu</summary><ul>${items}</ul></details></nav>
<a class="gh" href="${REPO}" aria-label="piilite on GitHub" rel="noopener">${GITHUB}</a>
</div></header>`;
}

function footer(root, version) {
  return `<footer class="site-footer"><div class="inner">
<div><h2>piilite ${esc(version)}</h2><p>India-first PII detection and masking for JavaScript. MIT licensed.</p><p>Built by <a href="${AUTHOR.url}" rel="author">${AUTHOR.name}</a>.</p></div>
<div><h2>Docs</h2><ul><li><a href="${root}guide/">Guide</a></li><li><a href="${root}india-pii/">Indian PII types</a></li><li><a href="${root}llm/">LLM apps</a></li><li><a href="${root}presets/">Presets</a></li></ul></div>
<div><h2>Learn</h2><ul><li><a href="${root}playground/">Playground</a></li><li><a href="${root}accuracy/">Accuracy</a></li><li><a href="${root}openredaction/">vs OpenRedaction</a></li><li><a href="${root}faq/">FAQ</a></li></ul></div>
<div><h2>Project</h2><ul><li><a href="${REPO}" rel="noopener">GitHub</a></li><li><a href="${NPM}" rel="noopener">npm</a></li><li><a href="${REPO}/issues" rel="noopener">Report an issue</a></li><li><a href="${root}llms.txt">llms.txt</a></li></ul></div>
</div></footer>`;
}

function toc(body) {
  const items = [...body.matchAll(/<h2 id="([^"]+)"><a class="anchor" href="#[^"]+">(.*?)<\/a><\/h2>/g)];
  if (items.length < 3) return "";
  return `<nav class="toc" aria-label="On this page"><p>On this page</p><ol>${items
    .map(([, id, text]) => `<li><a href="#${id}">${text.replace(/<[^>]+>/g, "")}</a></li>`)
    .join("")}</ol></nav>`;
}

function breadcrumbs(page, root) {
  if (!page.path) return "";
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${root}">piilite</a></li><li aria-current="page">${esc(page.crumb)}</li></ol></nav>`;
}

export function structuredData(page, ctx) {
  const url = SITE + page.path;
  const person = { "@type": "Person", "@id": `${SITE}#author`, name: AUTHOR.name, url: AUTHOR.url };
  const software = {
    "@type": "SoftwareApplication",
    "@id": `${SITE}#software`,
    name: "piilite",
    description: ctx.tagline,
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "PII detection and data masking library",
    operatingSystem: "Cross-platform: Node.js 18+, browsers, Bun, Deno",
    softwareVersion: ctx.version,
    url: SITE,
    downloadUrl: NPM,
    installUrl: NPM,
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@id": `${SITE}#author` },
    featureList: ctx.features,
    keywords: ctx.keywords.join(", "),
    softwareRequirements: "Node.js 18 or later, or any modern browser",
    fileSize: `${ctx.gzipKB} KB (gzipped)`,
  };
  const graph = [
    { "@type": "WebSite", "@id": `${SITE}#website`, url: SITE, name: "piilite", description: ctx.tagline, inLanguage: "en", publisher: { "@id": `${SITE}#author` } },
    person,
    software,
    {
      "@type": "SoftwareSourceCode",
      "@id": `${SITE}#source`,
      name: "piilite",
      codeRepository: REPO,
      programmingLanguage: ["JavaScript", "TypeScript"],
      runtimePlatform: "Node.js",
      license: "https://opensource.org/licenses/MIT",
      author: { "@id": `${SITE}#author` },
      targetProduct: { "@id": `${SITE}#software` },
    },
  ];
  const webPage = {
    "@type": page.schemaType ?? (page.path ? "TechArticle" : "WebPage"),
    "@id": `${url}#page`,
    url,
    name: page.title,
    headline: page.h1.replace(/<[^>]+>/g, ""),
    description: page.description,
    inLanguage: "en",
    isPartOf: { "@id": `${SITE}#website` },
    about: { "@id": `${SITE}#software` },
    author: { "@id": `${SITE}#author` },
    datePublished: PUBLISHED,
    dateModified: ctx.today,
    image: `${SITE}assets/og.png`,
  };
  if (page.path) {
    webPage.breadcrumb = { "@id": `${url}#breadcrumb` };
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "piilite", item: SITE },
        { "@type": "ListItem", position: 2, name: page.crumb, item: url },
      ],
    });
  }
  graph.push(webPage);
  if (page.faq) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: page.faq.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() },
      })),
    });
  }
  if (page.extraSchema) graph.push(...page.extraSchema(ctx));
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

export function render(page, ctx) {
  const root = page.path ? "../".repeat(page.path.split("/").filter(Boolean).length) : "";
  const url = SITE + page.path;
  const title = esc(page.title);
  const desc = esc(page.description);
  const body = page.body(ctx);
  const article = page.wide
    ? `<article>${breadcrumbs(page, root)}${body}</article>`
    : `<div class="page"><article>${breadcrumbs(page, root)}${body}<p class="updated">Last updated <time datetime="${ctx.today}">${ctx.todayHuman}</time> · piilite ${esc(ctx.version)}</p></article>${toc(body)}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="author" content="${esc(AUTHOR.name)}">
<meta name="keywords" content="${esc((page.keywords ?? ctx.keywords).join(", "))}">
<meta property="og:type" content="${page.path ? "article" : "website"}">
<meta property="og:site_name" content="piilite">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="piilite: India-first PII detection and masking for JavaScript">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${SITE}assets/og.png">
<meta name="theme-color" content="#0f766e" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1115" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${root}assets/apple-touch-icon.png">
<link rel="sitemap" type="application/xml" href="${root}sitemap.xml">
<link rel="stylesheet" href="${root}assets/site.css">
<script type="application/ld+json">${structuredData(page, ctx)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${header(page, root)}
<main id="main">
${article}
</main>
${footer(root, ctx.version)}
<script src="${root}assets/site.js" defer></script>
${page.scripts ? page.scripts(root) : ""}
</body>
</html>
`;
}
