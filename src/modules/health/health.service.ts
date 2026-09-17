import { Injectable } from "@nestjs/common";

export interface HealthCheckResponse {
  status: string;
}

@Injectable()
export class HealthService {
  check(): HealthCheckResponse {
    return {
      status: "ok",
    };
  }
}
