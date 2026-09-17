import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { RecruitmentModule } from "./modules/recruitment/recruitment.module";
import { StudentsModule } from "./modules/students/students.module";
import { AssessmentsModule } from "./modules/assessments/assessments.module";
import { QuestionsModule } from "./modules/questions/questions.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { EmailModule } from "./email/email.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AuditModule } from "./modules/audit/audit.module";
import { StorageService } from "./common/storage/storage.service";

import * as path from "path";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), ".env"),
        path.resolve(__dirname, "../.env"),
        path.resolve(process.cwd(), "backend/.env"),
        path.resolve(__dirname, "../../.env"),
        ".env",
        "backend/.env",
      ],
      load: [configuration],
    }),
    DatabaseModule,
    HealthModule,
    NotificationsModule,
    EmailModule,
    AuthModule,
    UsersModule,
    RecruitmentModule,
    StudentsModule,
    AssessmentsModule,
    QuestionsModule,
    ReportsModule,
    AuditModule,
  ],
  providers: [StorageService],
  exports: [StorageService],
})
export class AppModule {}
