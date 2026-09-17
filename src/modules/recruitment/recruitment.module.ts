import { Module } from "@nestjs/common";
import { RecruitmentService } from "./recruitment.service";
import { AdminDrivesController } from "./admin-drives.controller";
import { StudentDrivesController } from "./student-drives.controller";
import { AdminCandidatesController } from "./admin-candidates.controller";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [AdminDrivesController, StudentDrivesController, AdminCandidatesController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
