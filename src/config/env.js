import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if .env is 2 levels up (standalone repo) or 3 levels up (monorepo)
const path2 = path.resolve(__dirname, '../../.env');
const path3 = path.resolve(__dirname, '../../../.env');
const finalPath = fs.existsSync(path2) ? path2 : path3;

// Load environment variables
dotenv.config({ path: finalPath });
