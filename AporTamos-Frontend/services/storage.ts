import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const JPEG_QUALITY = 0.8;

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  /** Estimated size in bytes after compression */
  estimatedBytes: number;
}

/**
 * Compress image to JPEG at 80% quality.
 * If estimated size exceeds 5MB, reduces quality further until it fits.
 */
export async function compressImage(uri: string): Promise<CompressedImage> {
  let quality = JPEG_QUALITY;
  let result: ImageManipulator.ImageResult;

  do {
    result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    // Estimate size from base64 length if available, otherwise assume acceptable
    quality -= 0.1;
  } while (quality > 0.3 && (await estimateFileSize(result.uri)) > MAX_SIZE_BYTES);

  const estimatedBytes = await estimateFileSize(result.uri);

  if (estimatedBytes > MAX_SIZE_BYTES) {
    throw new Error('La foto supera el límite de 5MB incluso después de compresión.');
  }

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    estimatedBytes,
  };
}

async function estimateFileSize(uri: string): Promise<number> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch {
    return 0;
  }
}

export interface UploadTaskPhotoResult {
  photoUrl: string;
  assignmentId: string;
}

/**
 * Upload a compressed photo to the backend as multipart form data.
 * Returns the signed URL from the server.
 */
export async function uploadTaskPhoto(
  assignmentId: string,
  imageUri: string
): Promise<UploadTaskPhotoResult> {
  const token = await AsyncStorage.getItem('auth_token');
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

  const formData = new FormData();
  formData.append('photo', {
    uri: imageUri,
    name: `${assignmentId}.jpg`,
    type: 'image/jpeg',
  } as any);

  const response = await fetch(`${apiUrl}/tasks/${assignmentId}/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.detail || `Error ${response.status} al subir la foto`);
  }

  const data = await response.json();
  return { photoUrl: data.photo_url, assignmentId };
}
