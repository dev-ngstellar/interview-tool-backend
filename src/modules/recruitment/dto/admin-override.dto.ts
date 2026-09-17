import { IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class AdminOverrideDto {
  @IsString()
  @IsNotEmpty({ message: "Approval reason is required for administrative audit." })
  @MinLength(3, { message: "Reason must be at least 3 characters." })
  reason: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class BulkAdminOverrideDto {
  @IsNotEmpty({ message: "At least one candidate application must be selected." })
  applicationIds: string[];

  @IsString()
  @IsNotEmpty({ message: "Approval reason is required for administrative audit." })
  @MinLength(3, { message: "Reason must be at least 3 characters." })
  reason: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
