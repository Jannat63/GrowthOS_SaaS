"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  BlogPost,
  BlogPostFilter,
  BlogPostInput,
  BlogPostSort,
  BlogPostSummary,
} from "@growthos/types";
import { api } from "@/lib/api/client";

/**
 * The console's blog queries.
 *
 * Separate from useAdmin.ts because the two answer to different rules. Everything there reads a
 * customer's account, so it is throttled by `staleTime` to keep the audit log honest and every
 * write costs a reason and a password. The blog is platform content: writes are frequent by design
 * (this is a writing tool), they carry no step-up, and refetching the list is not a line in a
 * permanent record of who looked at whose data.
 */

const BLOG_STALE_MS = 30_000;

export const BLOG_PAGE_SIZE = 20;

export interface BlogQuery {
  search?: string;
  filter?: BlogPostFilter | undefined;
  sort?: BlogPostSort | undefined;
  offset?: number;
  limit?: number;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function useAdminPosts(params: BlogQuery = {}) {
  const { search, filter, sort, offset = 0, limit = BLOG_PAGE_SIZE } = params;
  const qs = query({ search, filter, sort, limit, offset });
  return useQuery<{ data: BlogPostSummary[]; total: number }>({
    queryKey: ["admin", "blog", qs],
    staleTime: BLOG_STALE_MS,
    queryFn: () => api.get<{ data: BlogPostSummary[]; total: number }>(`/admin/blog${qs}`),
  });
}

export function useAdminPost(id: string | null) {
  return useQuery<BlogPost>({
    queryKey: ["admin", "blog", "post", id],
    // No staleTime: this is the document being edited, and a stale copy overwriting a newer one is
    // the one failure a writing tool must not have.
    staleTime: 0,
    enabled: Boolean(id),
    queryFn: () => api.get<BlogPost>(`/admin/blog/${id}`),
  });
}

/**
 * Creating a post is a navigation, not a form.
 *
 * "New post" writes an empty draft immediately and opens it, rather than opening a blank form that
 * exists only in memory until someone remembers to save. It means autosave works the same way on
 * the first keystroke as on the thousandth, and closing the tab cannot lose a post that was never
 * written down.
 */
export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BlogPostInput) => api.post<BlogPost>("/admin/blog", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "blog"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't create the post.");
    },
  });
}

/**
 * Saving.
 *
 * `silent` exists for autosave: a toast every thirty seconds while someone is writing is not
 * reassurance, it is a distraction with a countdown. The editor shows saved state in its header
 * instead, and only an explicit Save says so out loud.
 */
export function useUpdatePost(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ silent: _silent, ...input }: BlogPostInput & { silent?: boolean }) =>
      api.patch<BlogPost>(`/admin/blog/${id}`, input),
    onSuccess: (post, variables) => {
      queryClient.setQueryData(["admin", "blog", "post", id], post);
      queryClient.invalidateQueries({ queryKey: ["admin", "blog"], exact: false });
      if (!variables.silent) toast.success("Saved.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't save — your text is still here.");
    },
  });
}

export function usePublishPost(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { publishedAt?: string } = {}) =>
      api.post<BlogPost>(`/admin/blog/${id}/publish`, input),
    onSuccess: (post) => {
      queryClient.setQueryData(["admin", "blog", "post", id], post);
      queryClient.invalidateQueries({ queryKey: ["admin", "blog"], exact: false });
      toast.success(
        post.state === "scheduled"
          ? `Scheduled for ${new Date(post.publishedAt!).toLocaleString()}.`
          : "Published. It's live on the blog."
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't publish.");
    },
  });
}

export function useUnpublishPost(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<BlogPost>(`/admin/blog/${id}/unpublish`, {}),
    onSuccess: (post) => {
      queryClient.setQueryData(["admin", "blog", "post", id], post);
      queryClient.invalidateQueries({ queryKey: ["admin", "blog"], exact: false });
      toast.success("Unpublished. It's back to a draft.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't unpublish.");
    },
  });
}

export function useFeaturePost(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (featured: boolean) => api.post<BlogPost>(`/admin/blog/${id}/feature`, { featured }),
    onSuccess: (post) => {
      queryClient.setQueryData(["admin", "blog", "post", id], post);
      queryClient.invalidateQueries({ queryKey: ["admin", "blog"], exact: false });
      toast.success(post.featured ? "Pinned to the top of the blog." : "Unpinned.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't change the pin.");
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: true }>(`/admin/blog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "blog"], exact: false });
      toast.success("Deleted.");
    },
    onError: (err) => {
      // The API refuses to delete a published post and says why — that message is more useful than
      // anything this could invent, so it is shown verbatim.
      toast.error(err instanceof Error ? err.message : "Couldn't delete.");
    },
  });
}
