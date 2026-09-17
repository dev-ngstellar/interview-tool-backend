import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";
import { DriveStatus } from "@prisma/client";

export class CreateDriveDto {
  @IsString()
  @IsNotEmpty({ message: "Drive name is required." })
  @MinLength(3, { message: "Drive name must be at least 3 characters long." })
  @MaxLength(150, { message: "Drive name must not exceed 150 characters." })
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: "Description must not exceed 2000 characters." })
  description?: string;

  @IsString()
  @IsNotEmpty({ message: "Position is required." })
  @Matches(/marketing executive/i, {
    message:
      'Position for this recruitment project must be "Marketing Executive".',
  })
  position: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, {
    message: "College eligibility criteria must not exceed 1000 characters.",
  })
  collegeEligibility?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: "College info must not exceed 1000 characters." })
  collegeInfo?: string;

  @IsDateString(
    {},
    { message: "Registration start must be a valid ISO date-time string." },
  )
  @IsNotEmpty({ message: "Registration start date is required." })
  registrationStart: string;

  @IsDateString(
    {},
    { message: "Registration end must be a valid ISO date-time string." },
  )
  @IsNotEmpty({ message: "Registration end date is required." })
  registrationEnd: string;

  @IsEnum(DriveStatus, {
    message: "Status must be one of: DRAFT, OPEN, CLOSED, ARCHIVED.",
  })
  @IsOptional()
  status?: DriveStatus;
}
