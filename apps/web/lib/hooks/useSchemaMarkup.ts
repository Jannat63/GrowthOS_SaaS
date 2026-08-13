"use client";
import { useQuery } from "@tanstack/react-query";
import type { SchemaMarkupResponse, SchemaMarkupType } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

const ALL_TYPES: SchemaMarkupType[] = [
  "WebPage",
  "Article",
  "Product",
  "CollectionPage",
  "FAQPage",
  "Organization",
];

const TYPE_HINTS: Array<{ prefix: RegExp; type: SchemaMarkupType }> = [
  { prefix: /^\/(blog|news|articles?|guides?)\//i, type: "Article" },
  { prefix: /^\/(products?)\//i, type: "Product" },
  { prefix: /^\/(collections?|category|categories)\//i, type: "CollectionPage" },
  { prefix: /faq/i, type: "FAQPage" },
];

// Condensed mirror of the API's buildSchemaMarkup — approximate, not byte-for-byte (same
// relationship every other mock in this app has to its live counterpart), so the tool stays
// usable while offline/API-unreachable.
function mockSchemaMarkup(pageUrl: string, typeOverride?: SchemaMarkupType): SchemaMarkupResponse {
  const type = typeOverride ?? TYPE_HINTS.find((h) => h.prefix.test(pageUrl))?.type ?? "WebPage";
  const slug = pageUrl.split("/").filter(Boolean).pop() ?? "";
  const name =
    slug
      .replace(/[-_]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0]!.toUpperCase() + w.slice(1))
      .join(" ") || "Untitled Page";

  const base = { "@context": "https://schema.org", name, url: pageUrl };
  const byType: Record<SchemaMarkupType, { jsonLd: Record<string, unknown>; placeholders: string[] }> = {
    WebPage: { jsonLd: { ...base, "@type": "WebPage", description: "[SET_DESCRIPTION]" }, placeholders: ["description"] },
    Article: {
      jsonLd: { ...base, "@type": "BlogPosting", headline: name, datePublished: "[SET_DATE_PUBLISHED]", dateModified: "[SET_DATE_MODIFIED]", image: "[SET_IMAGE_URL]" },
      placeholders: ["datePublished", "dateModified", "image"],
    },
    Product: {
      jsonLd: { ...base, "@type": "Product", description: "[SET_DESCRIPTION]", image: "[SET_IMAGE_URL]", offers: { "@type": "Offer", priceCurrency: "[SET_CURRENCY]", price: "[SET_PRICE]", availability: "https://schema.org/InStock" } },
      placeholders: ["description", "image", "price", "priceCurrency"],
    },
    CollectionPage: { jsonLd: { ...base, "@type": "CollectionPage", description: "[SET_DESCRIPTION]" }, placeholders: ["description"] },
    FAQPage: {
      jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "[SET_QUESTION_1]", acceptedAnswer: { "@type": "Answer", text: "[SET_ANSWER_1]" } }] },
      placeholders: ["mainEntity"],
    },
    Organization: {
      jsonLd: { "@context": "https://schema.org", "@type": "Organization", name, url: pageUrl, logo: "[SET_LOGO_URL]", description: "[SET_DESCRIPTION]", sameAs: ["[SET_SOCIAL_PROFILE_URL]"] },
      placeholders: ["logo", "description", "sameAs"],
    },
  };

  const { jsonLd, placeholders } = byType[type];
  return { pageUrl, detectedType: type, availableTypes: ALL_TYPES, jsonLd, placeholders };
}

export function useSchemaMarkup(
  workspaceId: string | null | undefined,
  pageUrl: string | null,
  typeOverride?: SchemaMarkupType
) {
  return useQuery<{ data: SchemaMarkupResponse; source: "live" | "mock" }>({
    queryKey: ["seo-schema-markup", workspaceId, pageUrl, typeOverride],
    enabled: Boolean(workspaceId) && Boolean(pageUrl),
    queryFn: () =>
      liveOrMock(
        () => {
          const params = new URLSearchParams({ page: pageUrl! });
          if (typeOverride) params.set("type", typeOverride);
          return api.get<SchemaMarkupResponse>(
            `/workspaces/${workspaceId}/seo/schema-markup?${params.toString()}`
          );
        },
        () => mockSchemaMarkup(pageUrl!, typeOverride)
      ),
  });
}
