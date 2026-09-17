import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty({ message: "Full name is required." })
  @MinLength(2, { message: "Full name must be at least 2 characters." })
  @MaxLength(100, { message: "Full name must not exceed 100 characters." })
  fullName: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsNotEmpty({ message: "Phone number is required." })
  @Matches(
    /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$|^[0-9]{10,15}$/,
    {
      message: "Please provide a valid 10-15 digit contact phone number.",
    },
  )
  phone: string;

  @IsString()
  @IsOptional()
  collegeName?: string;

  @IsString()
  @IsOptional()
  course?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Graduation year must be an integer." })
  @Min(2018, { message: "Graduation year cannot be earlier than 2018." })
  @Max(2035, { message: "Graduation year cannot exceed 2035." })
  graduationYear?: number;
}

