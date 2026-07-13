import '../src/config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../src/config/firebaseAdmin.js';
import logger from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  const isDryRun = process.argv.includes('--dry-run');
  const isForce = process.argv.includes('--force');

  logger.info(`Starting product seed script. Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'}. Force Overwrite: ${isForce ? 'YES' : 'NO'}`);

  let seedData;
  try {
    const seedPath = path.resolve(__dirname, '../src/data/productsSeed.json');
    const rawData = fs.readFileSync(seedPath, 'utf8');
    seedData = JSON.parse(rawData);
  } catch (err) {
    logger.error('Failed to read productsSeed.json', err);
    process.exit(1);
  }

  const stats = {
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    failed: 0
  };

  for (const product of seedData) {
    try {
      const slug = product.slug.toLowerCase().trim();
      const docRef = db.collection('products').doc(slug);
      const docSnap = await docRef.get();

      // Check format
      if (slug !== product.slug) {
        logger.warn(`Slug in product "${product.name}" is not fully URL-safe or lowercase: "${product.slug}" vs "${slug}"`);
        product.slug = slug;
      }

      if (!docSnap.exists) {
        // Create new product
        if (isDryRun) {
          logger.info(`[Dry Run] Would create product: ${slug}`);
        } else {
          const now = new Date().toISOString();
          const newProduct = {
            ...product,
            createdAt: now,
            updatedAt: now,
            publishedAt: product.status === 'PUBLISHED' ? now : null,
            createdBy: 'system-seed',
            updatedBy: 'system-seed'
          };
          await docRef.set(newProduct);
          logger.info(`Created product: ${slug}`);
        }
        stats.created++;
      } else {
        // Exists, check for modifications
        const existingData = docSnap.data();
        
        // Deep compare only content fields, ignore timestamps and creators
        const hasDiff = checkDifferences(product, existingData);

        if (hasDiff) {
          if (isForce) {
            if (isDryRun) {
              logger.info(`[Dry Run] Would update product: ${slug}`);
            } else {
              const now = new Date().toISOString();
              const updatedProduct = {
                ...existingData, // Preserve createdAt and other existing metadata
                ...product,
                updatedAt: now,
                updatedBy: 'system-seed'
              };
              // If status changed to PUBLISHED and publishedAt is missing
              if (product.status === 'PUBLISHED' && !existingData.publishedAt) {
                updatedProduct.publishedAt = now;
              }
              await docRef.set(updatedProduct);
              logger.info(`Force updated product: ${slug}`);
            }
            stats.updated++;
          } else {
            logger.info(`Skipped (has updates in seed, use --force to overwrite): ${slug}`);
            stats.skipped++;
          }
        } else {
          logger.info(`Unchanged: ${slug}`);
          stats.unchanged++;
        }
      }
    } catch (err) {
      logger.error(`Error processing product ${product.slug}:`, err);
      stats.failed++;
    }
  }

  logger.info('--- Seed Run Summary ---');
  logger.info(`Created:   ${stats.created}`);
  logger.info(`Updated:   ${stats.updated}`);
  logger.info(`Unchanged: ${stats.unchanged}`);
  logger.info(`Skipped:   ${stats.skipped}`);
  logger.info(`Failed:    ${stats.failed}`);
  logger.info('------------------------');

  if (!isDryRun && stats.failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

// Quick clean difference checker for keys in seed
function checkDifferences(seed, existing) {
  const keysToCompare = [
    'name', 'composition', 'strength', 'dosageForm', 'packSize', 
    'shortDescription', 'indications', 'brandOwner', 'marketer', 
    'manufacturer', 'medicalDisclaimer', 'isFeatured', 'featuredRank', 
    'status', 'contentReviewStatus', 'contentVersion'
  ];

  for (const key of keysToCompare) {
    if (JSON.stringify(seed[key]) !== JSON.stringify(existing[key])) {
      return true;
    }
  }

  // Compare nested medicalInfo
  if (JSON.stringify(seed.medicalInfo) !== JSON.stringify(existing.medicalInfo)) {
    return true;
  }

  // Compare nested faqs
  if (JSON.stringify(seed.faqs) !== JSON.stringify(existing.faqs)) {
    return true;
  }

  // Compare nested image
  if (JSON.stringify(seed.image) !== JSON.stringify(existing.image)) {
    return true;
  }

  // Compare marketingHighlights
  if (JSON.stringify(seed.marketingHighlights) !== JSON.stringify(existing.marketingHighlights)) {
    return true;
  }

  return false;
}

runSeed();
