import { Module } from "@nestjs/common";
import { SsrService } from "./ssr.service.js";

@Module({
  providers: [SsrService],
  exports: [SsrService],
})
export class AppModule {}
