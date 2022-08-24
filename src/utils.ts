import fs from 'fs';
import path from 'path';

export const traverseDirectoryUp = (dir: string, file: string): string => {
  const files = fs.readdirSync(dir);
  const parentDir = path.join(dir, '..');
  if (files.includes(file)) return dir;
  else if (parentDir !== dir) return traverseDirectoryUp(parentDir, file);
  else return undefined;
}