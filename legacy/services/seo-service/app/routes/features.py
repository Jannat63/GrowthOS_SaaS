from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import List, Optional, Dict

from app.crawler import crawl_site, audit_page
from app.pagespeed import get_core_web_vitals, PageSpeedError
from app.keyword_clustering import cluster_keywords
from app.schema_generator import (
    generate_article_schema, generate_faq_schema, generate_product_schema,
    generate_breadcrumb_schema, generate_local_business_schema,
)
from app.content_brief import generate_content_brief
from app.long_tail import generate_long_tail_variations
from app.sitemap_and_links import (
    generate_sitemap_xml, generate_robots_txt, find_orphaned_pages, compute_link_equity_distribution,
)

router = APIRouter(prefix="/seo", tags=["seo"])


# ---- Site Audit (real crawler) ----
class CrawlRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    start_url: str
    max_pages: int = 10


@router.post("/audit/crawl")
def run_crawl(req: CrawlRequest):
    results = crawl_site(req.start_url, max_pages=req.max_pages)
    return {
        "pagesAudited": len(results),
        "pages": [
            {
                "url": r.url,
                "statusCode": r.status_code,
                "title": r.title,
                "wordCount": r.word_count,
                "h1Count": r.h1_count,
                "hasCanonical": r.has_canonical,
                "issues": r.issues,
            }
            for r in results
        ],
    }


# ---- Technical SEO (real PageSpeed API) ----
@router.get("/technical/core-web-vitals")
def core_web_vitals(url: str, strategy: str = "mobile"):
    try:
        return get_core_web_vitals(url, strategy)
    except PageSpeedError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ---- Keyword Clustering (free algorithm) ----
class ClusterRequest(BaseModel):
    keywords: List[str]
    similarity_threshold: float = 0.3


@router.post("/keywords/cluster")
def cluster(req: ClusterRequest):
    return {"clusters": cluster_keywords(req.keywords, req.similarity_threshold)}


# ---- Content Brief (rule-based, no LLM) ----
@router.get("/content/brief")
def content_brief(keyword: str, difficulty: int = 50):
    return generate_content_brief(keyword, difficulty)


# ---- Schema Markup Generator ----
class FAQPair(BaseModel):
    question: str
    answer: str


class SchemaRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    schema_type: str  # "article" | "faq" | "product" | "breadcrumb" | "local_business"
    article_headline: Optional[str] = None
    article_author: Optional[str] = None
    article_date_published: Optional[str] = None
    faq_pairs: Optional[List[FAQPair]] = None
    product_name: Optional[str] = None
    product_description: Optional[str] = None
    product_price: Optional[float] = None


@router.post("/content/schema")
def generate_schema(req: SchemaRequest):
    if req.schema_type == "article":
        if not (req.article_headline and req.article_author and req.article_date_published):
            raise HTTPException(status_code=400, detail="article schema requires headline, author, datePublished")
        return {"jsonLd": generate_article_schema(req.article_headline, req.article_author, req.article_date_published)}
    if req.schema_type == "faq":
        if not req.faq_pairs:
            raise HTTPException(status_code=400, detail="faq schema requires faqPairs")
        return {"jsonLd": generate_faq_schema([p.model_dump() for p in req.faq_pairs])}
    if req.schema_type == "product":
        if not (req.product_name and req.product_description and req.product_price is not None):
            raise HTTPException(status_code=400, detail="product schema requires name, description, price")
        return {"jsonLd": generate_product_schema(req.product_name, req.product_description, req.product_price)}
    raise HTTPException(status_code=400, detail=f"Unsupported schema_type '{req.schema_type}'")


# ---- Long-Tail Keyword Finder (free pattern generator) ----
@router.get("/keywords/long-tail")
def long_tail(seed_keyword: str):
    return {"variations": generate_long_tail_variations(seed_keyword)}


# ---- Sitemap & Robots.txt Manager ----
class SitemapRequest(BaseModel):
    urls: List[str]


@router.post("/technical/sitemap")
def sitemap(req: SitemapRequest):
    return {"xml": generate_sitemap_xml(req.urls)}


class RobotsRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    sitemap_url: str
    disallow_paths: Optional[List[str]] = None


@router.post("/technical/robots-txt")
def robots_txt(req: RobotsRequest):
    return {"content": generate_robots_txt(req.sitemap_url, req.disallow_paths)}


# ---- Internal Link Optimizer (real, computed from the crawler's own graph) ----
class LinkAnalysisRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    start_url: str
    max_pages: int = 15


@router.post("/technical/link-analysis")
def link_analysis(req: LinkAnalysisRequest):
    results = crawl_site(req.start_url, max_pages=req.max_pages)
    orphans = find_orphaned_pages(results)
    equity = compute_link_equity_distribution(results)
    return {
        "pagesAnalyzed": len(results),
        "orphanedPages": orphans,
        "linkEquityDistribution": [{"url": url, "incomingLinks": count} for url, count in equity.items()],
    }
