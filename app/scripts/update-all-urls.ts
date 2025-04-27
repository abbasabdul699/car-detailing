import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const S3_BASE_URL = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;

// Map of local paths to S3 categories
const PATH_TO_CATEGORY = {
  'https://reevacar.s3.us-east-2.amazonaws.com/features/detailers': 'detailers',
  'public/images': 'features',
  'public/icons': 'icons',
  'public/videos': 'videos'
};

async function updateImageUrls() {
  try {
    // 1. Update database URLs (detailer images)
    console.log(chalk.blue('Updating database URLs...'));
    const detailers = await prisma.detailer.findMany({
      include: {
        images: true
      }
    });

    for (const detailer of detailers) {
      for (const image of detailer.images) {
        const oldUrl = image.url;
        const fileName = oldUrl.split('/').pop();
        if (!fileName) {
          console.log(chalk.yellow(`Warning: Could not extract filename from ${oldUrl}`));
          continue;
        }
        const newUrl = `${S3_BASE_URL}/detailers/${fileName}`;

        await prisma.image.update({
          where: { id: image.id },
          data: { url: newUrl }
        });

        console.log(chalk.green(`Updated database URL for ${detailer.businessName}:`));
        console.log(`  Old: ${oldUrl}`);
        console.log(`  New: ${newUrl}`);
      }
    }

    // 2. Update code references
    console.log(chalk.blue('\nUpdating code references...'));
    
    // Get all TypeScript and TSX files
    const files = await getAllTypeScriptFiles('app');
    
    for (const file of files) {
      let content = await fs.readFile(file, 'utf-8');
      let modified = false;

      // Update image references
      for (const [localPath, category] of Object.entries(PATH_TO_CATEGORY)) {
        const regex = new RegExp(`['"]${localPath}/[^'"]+['"]`, 'g');
        const matches = content.match(regex);
        
        if (matches) {
          matches.forEach(match => {
            const parts = match.split('/');
            const fileName = parts[parts.length - 1]?.replace(/['"]/g, '');
            if (!fileName) {
              console.log(chalk.yellow(`Warning: Could not extract filename from ${match}`));
              return;
            }
            const newUrl = `${S3_BASE_URL}/${category}/${fileName}`;
            content = content.replace(match, `'${newUrl}'`);
            modified = true;
            
            console.log(chalk.green(`Updated code reference in ${file}:`));
            console.log(`  Old: ${match}`);
            console.log(`  New: '${newUrl}'`);
          });
        }
      }

      if (modified) {
        await fs.writeFile(file, content, 'utf-8');
      }
    }

    console.log(chalk.green('\n✓ Successfully updated all URLs'));
  } catch (error) {
    console.error(chalk.red('Error updating URLs:'), error);
  } finally {
    await prisma.$disconnect();
  }
}

async function getAllTypeScriptFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...await getAllTypeScriptFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

// Run the update
updateImageUrls().catch(console.error); 