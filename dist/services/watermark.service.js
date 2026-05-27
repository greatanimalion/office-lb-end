import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { getStoragePath, ensureDirectoryExists } from '../utils/file';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const applyWatermark = async (imagePath, watermark) => {
    const { text, fontSize = 48, color = '#cccccc', opacity = 0.3, rotate = -45 } = watermark;
    const svgText = `
    <svg width="400" height="300">
      <style>
        .watermark {
          font-size: ${fontSize}px;
          font-family: Arial, sans-serif;
          fill: ${color};
          opacity: ${opacity};
        }
      </style>
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(${rotate}, 200, 150)"
        class="watermark"
      >${text}</text>
    </svg>
  `;
    const watermarkBuffer = Buffer.from(svgText);
    const outputFilename = `watermarked_${Date.now()}.png`;
    const outputPath = path.join(getStoragePath(), 'previews', outputFilename);
    ensureDirectoryExists(path.dirname(outputPath));
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    await image
        .composite([
        {
            input: await sharp(watermarkBuffer)
                .resize(metadata.width || 800, metadata.height || 600)
                .toBuffer(),
            blend: 'over'
        }
    ])
        .toFile(outputPath);
    return outputPath;
};
export const generateDocumentPreview = async (documentPath, outputPath) => {
    console.log(`Generating preview for ${documentPath} at ${outputPath}`);
    return outputPath;
};
