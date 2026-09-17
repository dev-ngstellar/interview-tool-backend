import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "A valid email address is required" })
  @IsNotEmpty({ message: "Email cannot be empty" })
  email: string;

  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password cannot be empty" })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @MaxLength(64, { message: "Password cannot exceed 64 characters" })
  password: string;
}
