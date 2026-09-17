import { Module } from "@nestjs/common";
import { StudentsService } from "./students.service";
import { StudentsController } from "./students.controller";
import { DatabaseModule } from "../../database/database.module";
import { StorageService } from "../../common/storage/storage.service";

@Module({
  imports: [DatabaseModule],
  controllers: [StudentsController],
  providers: [StudentsService, StorageService],
  exports: [StudentsService],
})
export class StudentsModule {}
