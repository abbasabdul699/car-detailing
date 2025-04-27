import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { ImageCategory, uploadImage, uploadVideo } from '../../lib/s3-utils';

interface MediaMapping {
  sourceDir: string;
  category: ImageCategory | 'videos';
  filter?: (filename: string) => boolean;
  isVideo?: boolean;
}

const MEDIA_CATEGORIES: MediaMapping[] = [
  {
    sourceDir: 'https://reevacar.s3.us-east-2.amazonaws.com/features/detailers',
    category: 'detailers'
  },
  {
    sourceDir: 'public/images',
    category: 'features'
  },
  {
    sourceDir: 'public/icons',
    category: 'icons'
  },
  {
    sourceDir: 'public/videos',
    category: 'videos',
    isVideo: true
  }
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function migrateMediaCategory(mapping: MediaMapping): Promise<void> {
  const { sourceDir, category, filter, isVideo } = mapping;
  
  try {
    const exists = await fileExists(sourceDir);
    if (!exists) {
      console.log(chalk.yellow(`Directory ${sourceDir} does not exist, skipping...`));
      return;
    }

    const files = await fs.readdir(sourceDir);
    const mediaFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      if (isVideo) {
        return ['.mp4', '.mov', '.avi', '.webm'].includes(ext);
      } else {
        return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
      }
    }).filter(file => 
      (!filter || filter(file)) &&
      !file.startsWith('.') && // Skip hidden files
      !file.includes('DS_Store') // Skip macOS system files
    );

    console.log(chalk.blue(`Processing ${mediaFiles.length} ${isVideo ? 'videos' : 'images'} in ${sourceDir}...`));

    for (const file of mediaFiles) {
      try {
        const filePath = path.join(sourceDir, file);
        const fileContent = await fs.readFile(filePath);
        
        let url: string;
        if (isVideo) {
          const contentType = getVideoContentType(file);
          url = await uploadVideo(fileContent, category, file, contentType);
        } else {
          url = await uploadImage(fileContent, category as ImageCategory, file);
        }
        
        console.log(chalk.green(`✓ Successfully uploaded ${file} to ${url}`));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red(`✗ Failed to upload ${file}: ${errorMessage}`));
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`Error processing directory ${sourceDir}: ${errorMessage}`));
  }
}

function getVideoContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.avi':
      return 'video/x-msvideo';
    case '.webm':
      return 'video/webm';
    default:
      return 'video/mp4';
  }
}

async function migrateMedia() {
  console.log(chalk.blue('Starting media migration...'));
  
  for (const mapping of MEDIA_CATEGORIES) {
    await migrateMediaCategory(mapping);
  }
  
  console.log(chalk.green('✓ Media migration completed successfully'));
}

migrateMedia().catch(error => {
  console.error(chalk.red('Migration failed:'), error);
  process.exit(1);
});
