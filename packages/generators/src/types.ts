export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GeneratorContext {
  targetDir: string;
  isMonorepo: boolean;
  appsDir?: string;
  packagesDir?: string;
}
