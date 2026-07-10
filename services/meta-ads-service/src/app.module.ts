import { Module } from "@nestjs/common";
import { MetaAdsController } from "./meta-ads.controller";

@Module({ controllers: [MetaAdsController] })
export class AppModule {}
