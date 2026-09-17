import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

export interface UploadFileOptions {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  folder?: string;
}

export interface StoredFileInfo {
  key: string;
  url: string;
  sizeBytes: number;
}

export interface IStorageService {
  uploadFile(options: UploadFileOptions): Promise<StoredFileInfo>;
  getFile(key: string): Promise<{
    buffer: Buffer;
    mimeType: string;
    originalName?: string;
  } | null>;
  getFileUrl(key: string): Promise<string>;
  deleteFile(key: string): Promise<boolean>;
  getMaxFileSizeMb(): number;
}

export const STORAGE_SERVICE_TOKEN = "STORAGE_SERVICE_TOKEN";

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: string;
  private readonly bucket: string;
  private readonly localBaseDir: string;
  private readonly maxFileSizeMb: number;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>("storage.provider", "local");
    this.bucket = this.configService.get<string>(
      "storage.bucket",
      "recruitment-resumes",
    );
    this.maxFileSizeMb = this.configService.get<number>(
      "storage.maxResumeSizeMb",
      5,
    );
    this.localBaseDir = path.resolve(process.cwd(), "uploads", this.bucket);

    if (this.provider === "local") {
      if (!fs.existsSync(this.localBaseDir)) {
        fs.mkdirSync(this.localBaseDir, { recursive: true });
      }
    }

    this.logger.log(
      `Storage service initialized with provider: ${this.provider}, bucket: ${this.bucket}, maxFileSizeMb: ${this.maxFileSizeMb}`,
    );
  }

  getMaxFileSizeMb(): number {
    return this.maxFileSizeMb;
  }

  /**
   * Sanitizes a file name to prevent path traversal and remove dangerous characters.
   */
  sanitizeFileName(fileName: string): string {
    const cleanBase = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    return cleanBase || "file";
  }

  async uploadFile(options: UploadFileOptions): Promise<StoredFileInfo> {
    const sanitized = this.sanitizeFileName(options.fileName);
    const folder = options.folder
      ? `${options.folder.replace(/[^a-zA-Z0-9_-]/g, "")}/`
      : "";
    const safeKey = `${folder}${Date.now()}-${sanitized}`;

    if (this.provider === "local") {
      const targetPath = path.resolve(this.localBaseDir, safeKey);
      const targetDir = path.dirname(targetPath);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      await fs.promises.writeFile(targetPath, options.buffer);
      this.logger.log(
        `[Local Storage] Stored ${options.fileName} (${options.buffer.length} bytes) at ${targetPath}`,
      );

      // Save metadata descriptor alongside the file
      const metaPath = `${targetPath}.meta.json`;
      await fs.promises.writeFile(
        metaPath,
        JSON.stringify({
          originalName: options.fileName,
          mimeType: options.mimeType,
          uploadedAt: new Date().toISOString(),
          sizeBytes: options.buffer.length,
        }),
      );

      return {
        key: safeKey,
        url: `/api/student/profile/resume`,
        sizeBytes: options.buffer.length,
      };
    }

    // Pluggable cloud object storage (S3/GCS) abstraction
    this.logger.log(
      `[S3 Storage Mock] Stored ${options.fileName} to key ${safeKey}`,
    );
    return {
      key: safeKey,
      url: `/api/student/profile/resume`,
      sizeBytes: options.buffer.length,
    };
  }

  async getFile(key: string): Promise<{
    buffer: Buffer;
    mimeType: string;
    originalName?: string;
  } | null> {
    // Prevent path traversal
    const safeKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, "");
    const targetPath = path.resolve(this.localBaseDir, safeKey);

    // Verify target path remains within localBaseDir
    if (!targetPath.startsWith(this.localBaseDir)) {
      this.logger.warn(
        `Potential path traversal attempt detected for key: ${key}`,
      );
      return null;
    }

    if (!fs.existsSync(targetPath)) {
      return null;
    }

    const buffer = await fs.promises.readFile(targetPath);
    let mimeType = "application/octet-stream";
    let originalName: string | undefined = undefined;

    const metaPath = `${targetPath}.meta.json`;
    if (fs.existsSync(metaPath)) {
      try {
        const metaRaw = await fs.promises.readFile(metaPath, "utf-8");
        const meta = JSON.parse(metaRaw);
        mimeType = meta.mimeType || mimeType;
        originalName = meta.originalName;
      } catch {
        // Fallback to basic mime deduction
      }
    }

    if (mimeType === "application/octet-stream") {
      const ext = path.extname(safeKey).toLowerCase();
      if (ext === ".pdf") mimeType = "application/pdf";
      else if (ext === ".doc") mimeType = "application/msword";
      else if (ext === ".docx")
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    return { buffer, mimeType, originalName };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getFileUrl(key: string): Promise<string> {
    return `/api/student/profile/resume`;
  }

  async deleteFile(key: string): Promise<boolean> {
    const safeKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, "");
    const targetPath = path.resolve(this.localBaseDir, safeKey);

    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
      const metaPath = `${targetPath}.meta.json`;
      if (fs.existsSync(metaPath)) {
        await fs.promises.unlink(metaPath);
      }
      this.logger.log(`[Storage] Deleted file key: ${safeKey}`);
      return true;
    }
    return false;
  }
}
