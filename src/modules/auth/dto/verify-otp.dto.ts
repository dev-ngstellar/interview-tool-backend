import {
  IsNotEmpty,
  IsEmail,
  IsString,
  Length,
  Matches,
} from "class-validator";

export class VerifyOtpDto {
  @IsNotEmpty({ message: "Email address is required." })
  @IsEmail({}, { message: "Please enter a valid email address." })
  email: string;

  @IsNotEmpty({ message: "Verification code is required." })
  @IsString()
  @Length(6, 6, { message: "Verification code must be exactly 6 digits." })
  @Matches(/^\d{6}$/, {
    message: "Verification code must contain only numbers.",
  })
  otp: string;
}
