import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const generateTextWatermark = async (options) => {
    const { text, fontSize = 48, fontFamily = 'sans-serif', color = 'rgba(128, 128, 128, 0.3)', opacity = 0.3, rotate = -45, position = 'center', } = options;
    const width = 400;
    const height = 300;
    const svg = `
    <svg width="${width}" height="${height}">
      <style>
        .watermark {
          font-size: ${fontSize}px;
          font-family: ${fontFamily};
          fill: ${color};
          opacity: ${opacity};
        }
      </style>
      <text
        x="${position === 'center' ? width / 2 : width - 20}"
        y="${position === 'center' ? height / 2 : 20}"
        text-anchor="${position === 'center' ? 'middle' : 'end'}"
        dominant-baseline="${position === 'center' ? 'middle' : 'hanging'}"
        transform="rotate(${rotate}, ${position === 'center' ? width / 2 : width - 20}, ${position === 'center' ? height / 2 : 20})"
        class="watermark"
      >${text}</text>
    </svg>
  `;
    return Buffer.from(svg);
};
export const applyWatermarkToImage = async (imagePath, watermarkBuffer, outputPath) => {
    const image = sharp(imagePath);
    const watermark = sharp(watermarkBuffer);
    const metadata = await image.metadata();
    const watermarkResized = await watermark.resize(metadata.width, metadata.height);
    await image
        .composite([
        { input: await watermarkResized.toBuffer(), blend: 'over' }
    ])
        .toFile(outputPath);
};
