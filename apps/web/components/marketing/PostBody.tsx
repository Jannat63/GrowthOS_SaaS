import type { RichTextDoc, RichTextNode } from "@growthos/types";

/**
 * Renders a stored post body.
 *
 * This is the reason the body is a ProseMirror document rather than an HTML string: nothing here
 * uses `dangerouslySetInnerHTML`, so there is no path from the database to the browser's HTML parser
 * at all. The walker below knows a fixed set of node and mark types and **ignores everything else**,
 * so a node this renderer has never heard of cannot render, let alone execute.
 *
 * Styling comes from `.prose-signal` in globals.css, which the editor also uses — one definition of
 * the type scale, shared, which is what makes "what you type is what ships" true rather than
 * aspirational. This component therefore emits bare tags and adds no classes of its own.
 *
 * Replaces MdxContent.tsx and its component map, value for value.
 */

/** Marks, innermost last, so `link > strong > text` nests in that order. */
const MARK_ORDER = ["link", "code", "bold", "italic"] as const;

/**
 * Addresses we will render.
 *
 * Authors here are platform staff, so this is not a defence against a hostile user — it is a
 * defence against a pasted address doing something nobody intended. `javascript:` in an href is the
 * one way a document that is never parsed as HTML could still execute something, and it costs four
 * lines to close.
 */
function safeUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (url === "") return null;
  // Site-relative and anchor links are ours by construction.
  if (url.startsWith("/") || url.startsWith("#")) return url;
  return /^(https?:|mailto:|tel:)/i.test(url) ? url : null;
}

function Text({ node }: { node: RichTextNode }) {
  const text = node.text ?? "";
  let element: React.ReactNode = text;

  // Applied outermost-last so the order in MARK_ORDER is the nesting order on screen.
  for (const name of [...MARK_ORDER].reverse()) {
    const mark = node.marks?.find((m) => m.type === name);
    if (!mark) continue;

    if (name === "bold") element = <strong>{element}</strong>;
    else if (name === "italic") element = <em>{element}</em>;
    else if (name === "code") element = <code>{element}</code>;
    else if (name === "link") {
      const href = safeUrl(mark.attrs?.href);
      // A link we will not follow still has to show its words.
      if (href) {
        const external = /^https?:/i.test(href);
        element = (
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {element}
          </a>
        );
      }
    }
  }

  return <>{element}</>;
}

function Children({ nodes }: { nodes: RichTextNode[] | undefined }) {
  if (!nodes) return null;
  return (
    <>
      {nodes.map((child, i) => (
        <Node key={i} node={child} />
      ))}
    </>
  );
}

function Node({ node }: { node: RichTextNode }): React.ReactElement | null {
  switch (node.type) {
    case "text":
      return <Text node={node} />;

    case "paragraph":
      return (
        <p>
          <Children nodes={node.content} />
        </p>
      );

    case "heading": {
      // The post title is the page's h1, so a body heading starts at h2. A stored level outside
      // 2–3 is clamped rather than dropped: the words matter more than the level, and an h4 in the
      // document should not silently vanish from the page.
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 2;
      const Tag = level >= 3 ? "h3" : "h2";
      return (
        <Tag id={headingId(node)}>
          <Children nodes={node.content} />
        </Tag>
      );
    }

    case "bulletList":
      return (
        <ul>
          <Children nodes={node.content} />
        </ul>
      );

    case "orderedList": {
      const start = typeof node.attrs?.start === "number" ? node.attrs.start : 1;
      return (
        <ol start={start === 1 ? undefined : start}>
          <Children nodes={node.content} />
        </ol>
      );
    }

    case "listItem":
      return (
        <li>
          <Children nodes={node.content} />
        </li>
      );

    case "blockquote":
      return (
        <blockquote>
          <Children nodes={node.content} />
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre>
          <code>
            <Children nodes={node.content} />
          </code>
        </pre>
      );

    case "horizontalRule":
      return <hr />;

    case "hardBreak":
      return <br />;

    case "image": {
      const src = safeUrl(node.attrs?.src);
      if (!src) return null;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      const caption = typeof node.attrs?.title === "string" ? node.attrs.title : "";
      return (
        <figure>
          {/* Deliberately not next/image: these addresses are typed by an author and can point
              anywhere, and next/image refuses any host not listed in next.config. A plain img
              renders whatever the author actually wrote. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} loading="lazy" />
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      );
    }

    default:
      // An unrecognised node renders its children if it has any, and nothing if it does not. A
      // wrapper node added by a future editor version therefore degrades to its contents rather
      // than deleting them.
      return node.content ? <Children nodes={node.content} /> : null;
  }
}

/**
 * A heading's anchor, from its own words.
 *
 * The prose stylesheet sets `scroll-margin-top` on headings, which only means anything if there is
 * something to scroll to. This is what makes a link to a section inside a post possible.
 */
function headingId(node: RichTextNode): string | undefined {
  const text = (node.content ?? [])
    .map((c) => c.text ?? "")
    .join("")
    .trim();
  if (!text) return undefined;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function PostBody({ doc }: { doc: RichTextDoc }) {
  return (
    <div className="prose-signal">
      <Children nodes={doc?.content} />
    </div>
  );
}
