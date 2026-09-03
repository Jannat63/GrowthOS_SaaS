import type { FastifyInstance } from 'fastify'
import type { BlogPost, BlogPostSummary } from '@growthos/types'
import { parsePage } from '../pagination.js'
import { getPublishedPost, listPublishedPosts, listPublishedSlugs, listRelatedPosts } from '../blog.js'

/**
 * The public blog surface — the only routes under /api/v1 with no authentication at all.
 *
 * Everything here reads through `isLive` in ../blog.ts, so a draft or a scheduled post is not
 * merely hidden from the console's list: it does not exist as far as these endpoints are concerned.
 * That is the property worth having, because these responses go into Next's ISR cache and onto the
 * public internet, where an accidental early publish cannot be recalled.
 *
 * No audit logging: these are anonymous reads of published marketing pages, not access to a
 * customer's account. The global rate limiter registered in app.ts already covers them.
 */
export async function registerBlogRoutes(app: FastifyInstance) {
  app.get('/api/v1/blog', async (request): Promise<{ data: BlogPostSummary[]; total: number }> => {
    const page = parsePage(request.query, 50)
    return listPublishedPosts(page)
  })

  /**
   * Slugs only, for `generateStaticParams`. Its own endpoint because the build would otherwise page
   * through the full index to collect a list of strings.
   */
  app.get('/api/v1/blog/slugs', async (): Promise<{ data: string[] }> => {
    return { data: await listPublishedSlugs() }
  })

  app.get('/api/v1/blog/:slug', async (request, reply): Promise<BlogPost | { error: unknown }> => {
    const { slug } = request.params as { slug: string }
    const post = await getPublishedPost(slug)
    if (!post) {
      reply.status(404)
      return { error: { code: 'NOT_FOUND', message: 'No published post at that address.', statusCode: 404 } }
    }
    return post
  })

  app.get('/api/v1/blog/:slug/related', async (request): Promise<{ data: BlogPostSummary[] }> => {
    const { slug } = request.params as { slug: string }
    return { data: await listRelatedPosts(slug, 2) }
  })
}
