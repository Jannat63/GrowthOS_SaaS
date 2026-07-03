import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { detectFatigue, CreativePerformance } from "./creative-fatigue";

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
}
