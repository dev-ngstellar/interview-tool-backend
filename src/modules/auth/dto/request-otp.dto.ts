import {
  IsNotEmpty,
  IsEmail,
  IsString,
  IsOptional,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";

export class RequestOtpDto {
  @IsNotEmpty({ message: "Please enter a valid name." })
  @IsString({ message: "Please enter a valid name." })
  @Matches(/^[a-zA-Z\s]{2,}$/, {
    message: "Please enter a valid name.",
  })
  fullName: string;

  @IsNotEmpty({ message: "Please enter your Student ID." })
  @IsString({ message: "Please enter your Student ID." })
  studentId: string;

  @IsNotEmpty({ message: "Please enter a valid email address." })
  @IsEmail({}, { message: "Please enter a valid email address." })
  email: string;

  @IsNotEmpty({ message: "Please enter a valid 10-digit mobile number." })
  @IsString({ message: "Please enter a valid 10-digit mobile number." })
  @Matches(/^[6-9]\d{9}$/, {
    message: "Please enter a valid 10-digit mobile number.",
  })
  phone: string;

  @IsOptional()
  @IsString()
  collegeName?: string;

  @IsOptional()
  @IsString()
  course?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @Type(() => Number)
  graduationYear?: number;
}
