import { Module } from "@nestjs/common";
import { AssessmentsController } from "./assessments.controller";
import { AssessmentsService } from "./assessments.service";

/**
 * Assessments Module
 * Manages Round 1 Aptitude assessment engine (15-min server-authoritative timer, 80% passing rule)
 * and Round 2 English Communication assessment engine.
 */
@Module({
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
