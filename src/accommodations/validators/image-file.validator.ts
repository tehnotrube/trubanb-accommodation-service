import { FileValidator } from '@nestjs/common';

export class ImageFileValidator extends FileValidator<{ allowedTypes: string[] }> {
  buildErrorMessage(): string {
    return 'File must be an image (jpeg, png, or webp)';
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) {
      return false;
    }

    const allowedMimeTypes = this.validationOptions.allowedTypes || [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (file.mimetype) {
      return allowedMimeTypes.includes(file.mimetype);
    }

    if (file.originalname) {
      const ext = file.originalname.toLowerCase().split('.').pop();
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      return validExtensions.includes(ext || '');
    }

    return false;
  }
}
