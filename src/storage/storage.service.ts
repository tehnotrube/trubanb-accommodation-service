import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false');
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: useSSL === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });

    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET',
      'accommodations',
    );

    this.publicUrl = this.configService.get<string>(
      'STORAGE_PUBLIC_URL',
      'http://localhost:9000/accommodations',
    );
  }

  async onModuleInit() {
    await this.ensureBucketExists();
    await this.setBucketPublicPolicy();
  }

  private async ensureBucketExists(): Promise<void> {
    const exists = await this.minioClient.bucketExists(this.bucketName);
    if (!exists) {
      await this.minioClient.makeBucket(this.bucketName);
    }
  }

  private async setBucketPublicPolicy(): Promise<void> {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        },
      ],
    };

    await this.minioClient.setBucketPolicy(
      this.bucketName,
      JSON.stringify(policy),
    );
  }

  async uploadFile(
    file: Express.Multer.File,
    accommodationId: string,
  ): Promise<string> {
    const extension = file.originalname.split('.').pop();
    const objectKey = `${accommodationId}/${uuidv4()}.${extension}`;

    await this.minioClient.putObject(
      this.bucketName,
      objectKey,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
    );

    return objectKey;
  }

  async uploadFiles(
    files: Express.Multer.File[],
    accommodationId: string,
  ): Promise<string[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file, accommodationId),
    );
    return Promise.all(uploadPromises);
  }

  async deleteFile(objectKey: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, objectKey);
  }

  async deleteFiles(objectKeys: string[]): Promise<void> {
    await Promise.all(objectKeys.map((key) => this.deleteFile(key)));
  }

  getPublicUrl(objectKey: string): string {
    return `${this.publicUrl}/${objectKey}`;
  }

  getPublicUrls(objectKeys: string[]): string[] {
    return objectKeys.map((key) => this.getPublicUrl(key));
  }
}
