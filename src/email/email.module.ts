import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailService } from "./email.service";

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
