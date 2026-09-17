import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailService } from "./email.service";
import { EmailController } from "./email.controller";
import { AdminEmailController } from "./admin-email.controller";

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [EmailController, AdminEmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
