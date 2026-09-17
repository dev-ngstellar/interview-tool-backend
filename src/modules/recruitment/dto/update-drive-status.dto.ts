import { IsEnum, IsNotEmpty } from "class-validator";
import { DriveStatus } from "@prisma/client";

export class UpdateDriveStatusDto {
  @IsEnum(DriveStatus, {
    message: "Status must be one of: DRAFT, OPEN, CLOSED, ARCHIVED.",
  })
  @IsNotEmpty({ message: "Drive status is required." })
  status: DriveStatus;
}
