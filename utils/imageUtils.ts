
import { Area } from '../types';

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); 
    image.src = url;
  });

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const safeArea = 2048;
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    resolve(canvas.toDataURL('image/jpeg'));
  });
}


export async function addMarginToImage(imageSrc: string): Promise<string | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const canvasSize = 1024;
    const innerSize = 768; // The size of the photo inside the canvas

    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // Fill the background with white. The AI will be instructed to fill this area.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Calculate the position to draw the user's image in the center
    const dx = (canvasSize - innerSize) / 2;
    const dy = (canvasSize - innerSize) / 2;

    // Draw the user's cropped image, scaling it to fit the inner square
    ctx.drawImage(image, 0, 0, image.width, image.height, dx, dy, innerSize, innerSize);

    return canvas.toDataURL('image/jpeg');
}
