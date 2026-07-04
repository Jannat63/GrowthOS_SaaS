import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { detectFatigue, CreativePerformance } from "./creative-fatigue";
import { buildFullFunnelPlan, generateAdCopyVariants, generateUGCScript } from "./features";

@Controller("meta-ads")
export class MetaAdsController {
  @Post("creative-fatigue")
  checkFatigue(@Body() creatives: CreativePerformance[]) {
    // Real detection logic. In production, `creatives` is pulled every 4 hours from
    // the Meta Marketing API (Section 7.4.2) instead of posted directly.
    // Requires META_APP_ID / META_APP_SECRET once app review is approved.
    return creatives.map(detectFatigue).sort((a, b) => {
      const order = { fatigued: 0, "at-risk": 1, healthy: 2 };
      return order[a.status] - order[b.status];
    });
  }

  @Get("campaigns")
  listCampaigns(@Query("workspaceId") workspaceId: string) {
    return { workspaceId, note: "Not yet connected to live Meta Marketing API — requires app review approval." };
  }

  @Post("funnel/build")
  buildFunnel(@Body() body: { totalBudget: number; productName: string }) {
    return { plan: buildFullFunnelPlan(body.totalBudget, body.productName) };
  }

  @Post("creatives/ad-copy")
  adCopy(@Body() body: { product: string; benefit: string; painPoint: string; count?: number }) {
    return { variants: generateAdCopyVariants(body.product, body.benefit, body.painPoint, body.count ?? 5) };
  }

  @Post("creatives/ugc-script")
  ugcScript(@Body() body: { product: string; duration?: 15 | 30 | 60 }) {
    return generateUGCScript(body.product, body.duration ?? 30);
  }
}
