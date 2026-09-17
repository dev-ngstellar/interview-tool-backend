import { IsOptional, IsString, IsInt, Min, Max, IsIn } from "class-validator";
import { Type } from "class-transformer";

export class AdminCandidateQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  round1Status?: string;

  @IsString()
  @IsOptional()
  round2Status?: string;

  @IsString()
  @IsOptional()
  overallStatus?: string;

  @IsString()
  @IsOptional()
  sortBy?: string = "registrationDate";

  @IsIn(["asc", "desc"])
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 10;
}
