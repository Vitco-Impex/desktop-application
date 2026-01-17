/**
 * Image Upload Component
 * Handles image uploads with drag & drop, preview, and Cloudinary integration
 */

import React, { useState, useRef, useCallback } from 'react';
import { inventoryService } from '@/services/inventory.service';
import { Button } from './Button';
import { extractErrorMessage } from '@/utils/error';
import { logger } from '@/shared/utils/logger';
import './ImageUpload.css';

export interface ImageData {
  url: string;
  publicId: string;
  isPrimary: boolean;
}

interface ImageUploadProps {
  images: ImageData[];
  onChange: (images: ImageData[]) => void;
  maxImages?: number;
  folder?: string;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images = [],
  onChange,
  maxImages = 10,
  folder = 'inventory',
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setError(null);
    setUploading(true);

    const uploadPromises = filesToUpload.map(async (file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error(`${file.name} is not an image file`);
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`${file.name} exceeds 10MB size limit`);
      }

      try {
        const result = await inventoryService.uploadImage(file, folder);
        return {
          url: result.secureUrl,
          publicId: result.publicId,
          isPrimary: images.length === 0, // First image is primary by default
        };
      } catch (err: any) {
        logger.error('[ImageUpload] Failed to upload image', err);
        throw new Error(`Failed to upload ${file.name}: ${extractErrorMessage(err, 'Upload failed')}`);
      }
    });

    try {
      const uploadedImages = await Promise.all(uploadPromises);
      const newImages = [...images, ...uploadedImages];
      onChange(newImages);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to upload images'));
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [images, maxImages, folder, onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [disabled, handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const handleRemoveImage = useCallback((publicId: string) => {
    const newImages = images.filter(img => img.publicId !== publicId);
    // If primary image was removed, set first image as primary
    const removedImage = images.find(img => img.publicId === publicId);
    if (removedImage?.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    onChange(newImages);
  }, [images, onChange]);

  const handleSetPrimary = useCallback((publicId: string) => {
    const newImages = images.map(img => ({
      ...img,
      isPrimary: img.publicId === publicId,
    }));
    onChange(newImages);
  }, [images, onChange]);

  const remainingSlots = maxImages - images.length;
  const canUpload = !disabled && !uploading && remainingSlots > 0;

  return (
    <div className="image-upload-container">
      <div
        className={`image-upload-dropzone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => canUpload && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          disabled={disabled || uploading}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <div className="upload-progress">
            <div className="spinner"></div>
            <p>Uploading images...</p>
          </div>
        ) : (
          <div className="dropzone-content">
            <div className="dropzone-icon">📷</div>
            <p className="dropzone-text">
              {canUpload ? (
                <>
                  Drag & drop images here or <span className="dropzone-link">click to browse</span>
                  <br />
                  <span className="dropzone-hint">Up to {remainingSlots} more image{remainingSlots !== 1 ? 's' : ''} (max {maxImages} total)</span>
                </>
              ) : (
                remainingSlots === 0 ? 'Maximum images reached' : 'Upload disabled'
              )}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="image-upload-error">
          {error}
        </div>
      )}

      {images.length > 0 && (
        <div className="image-upload-grid">
          {images.map((image, index) => (
            <div key={image.publicId} className="image-upload-item">
              <div className="image-preview-wrapper">
                <img
                  src={image.url}
                  alt={`Upload ${index + 1}`}
                  className="image-preview"
                />
                {image.isPrimary && (
                  <div className="primary-badge">Primary</div>
                )}
                {!disabled && (
                  <div className="image-actions">
                    {!image.isPrimary && (
                      <button
                        className="action-button primary-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(image.publicId);
                        }}
                        title="Set as primary"
                      >
                        ⭐
                      </button>
                    )}
                    <button
                      className="action-button delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(image.publicId);
                      }}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
