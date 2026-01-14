import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { StorageService } from './storage.service';
import { v4 as uuidv4 } from 'uuid';
import { PassThrough } from 'stream';

jest.mock('minio');
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;
  let mockMinioClient: jest.Mocked<Minio.Client>;

  const mockConfigGet = jest.fn((key: string, defaultValue?: unknown) => {
    const values: Record<string, unknown> = {
      MINIO_ENDPOINT: 'minio.local',
      MINIO_PORT: 9000,
      MINIO_USE_SSL: 'false',
      MINIO_ACCESS_KEY: 'testaccess',
      MINIO_SECRET_KEY: 'testsecret',
      MINIO_BUCKET: 'test-bucket',
      STORAGE_PUBLIC_URL: 'https://cdn.example.com/test-bucket',
    };
    return values[key] ?? defaultValue;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    (Minio.Client as jest.Mock).mockReset();

    mockMinioClient = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      setBucketPolicy: jest.fn(),
      putObject: jest.fn(),
      removeObject: jest.fn(),
    } as unknown as jest.Mocked<Minio.Client>;

    (Minio.Client as jest.Mock).mockImplementation(() => mockMinioClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: mockConfigGet,
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    const mockFile: Express.Multer.File = {
      originalname: 'photo.jpg',
      buffer: Buffer.from('fake-image'),
      size: 1024,
      mimetype: 'image/jpeg',
      fieldname: 'photos',
      encoding: '7bit',
      stream: {} as PassThrough,
      destination: '',
      filename: '',
      path: '',
    };

    it('uploads file and returns correct key', async () => {
      const accommodationId = 'acc-123';
      const fixedUuid = '550e8400-e29b-41d4-a716-446655440000';

      (uuidv4 as jest.Mock).mockReturnValue(fixedUuid);

      const result = await service.uploadFile(mockFile, accommodationId);

      const expectedKey = `${accommodationId}/${fixedUuid}.jpg`;

      expect(result).toBe(expectedKey);
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        expectedKey,
        mockFile.buffer,
        mockFile.size,
        { 'Content-Type': 'image/jpeg' },
      );
    });
  });

  describe('uploadFiles', () => {
    it('uploads multiple files', async () => {
      const mockFiles: Express.Multer.File[] = [
        {
          originalname: 'a.jpg',
          mimetype: 'image/jpeg',
        } as Express.Multer.File,
        { originalname: 'b.png', mimetype: 'image/png' } as Express.Multer.File,
      ];

      jest
        .spyOn(service, 'uploadFile')
        .mockResolvedValueOnce('acc-123/uuid1.jpg')
        .mockResolvedValueOnce('acc-123/uuid2.jpg');

      const result = await service.uploadFiles(mockFiles, 'acc-123');

      expect(result).toEqual(['acc-123/uuid1.jpg', 'acc-123/uuid2.jpg']);
    });
  });

  describe('deleteFiles', () => {
    it('deletes multiple files', async () => {
      const keys = ['file1.jpg', 'file2.jpg'] as const;
      await service.deleteFiles([...keys]);
      expect(mockMinioClient.removeObject).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPublicUrls', () => {
    it('generates correct URLs', () => {
      const keys = ['a.jpg', 'b.png'] as const;
      const urls = service.getPublicUrls([...keys]);

      expect(urls).toEqual([
        'https://cdn.example.com/test-bucket/a.jpg',
        'https://cdn.example.com/test-bucket/b.png',
      ]);
    });
  });
});
