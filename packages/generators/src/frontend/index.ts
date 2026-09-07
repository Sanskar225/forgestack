import { resolveFrontendDependencies, type ForgeConfig } from '@sanskar225/core';
import type { GeneratedFile } from '../types.js';

export function generateFrontendFiles(config: ForgeConfig, basePath: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const { frontend } = config;

  if (!frontend || frontend.framework === 'none') {
    return files;
  }

  const isNext = frontend.framework === 'nextjs';
  const isVite = frontend.framework === 'react-vite';
  const manifest = resolveFrontendDependencies(config);

  // 1. package.json
  const pkgJson = {
    name: `${config.project.name}-web`,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: manifest.scripts,
    dependencies: manifest.dependencies,
    devDependencies: manifest.devDependencies,
  };

  files.push({
    path: `${basePath}/package.json`,
    content: JSON.stringify(pkgJson, null, 2),
  });

  // 2. tsconfig.json
  const tsconfig = isNext
    ? {
        compilerOptions: {
          target: 'ES2022',
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [{ name: 'next' }],
          paths: { '@/*': ['./*'] },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      }
    : {
        compilerOptions: {
          target: 'ES2022',
          useDefineForClassFields: true,
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
        },
        include: ['src'],
      };

  files.push({
    path: `${basePath}/tsconfig.json`,
    content: JSON.stringify(tsconfig, null, 2),
  });

  // 3. API Client helper
  const apiClientTs = `export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:${config.backend?.port || 4000}';

export async function fetchHealth() {
  const res = await fetch(\`\${API_BASE_URL}/health/ready\`);
  if (!res.ok) {
    throw new Error('Failed to fetch health check from backend');
  }
  return res.json();
}
`;
  files.push({
    path: `${basePath}/src/lib/api.ts`,
    content: apiClientTs,
  });

  // 4. Next.js App Router specific files
  if (isNext) {
    const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`;
    files.push({ path: `${basePath}/next.config.mjs`, content: nextConfig });

    const layoutTsx = `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${config.project.name} | ForgeStack',
  description: 'Generated with ForgeStack Architecture Generator',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
`;
    files.push({ path: `${basePath}/app/layout.tsx`, content: layoutTsx });

    const globalsCss = `@import "tailwindcss";

:root {
  --background: #020617;
  --foreground: #f8fafc;
}
`;
    files.push({ path: `${basePath}/app/globals.css`, content: globalsCss });

    const pageTsx = `'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:${config.backend?.port || 4000}/health/ready')
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setHealth({ status: 'offline', error: err.message });
        setLoading(false);
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <div className="max-w-3xl w-full border border-slate-800 rounded-2xl p-8 bg-slate-900/60 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🚀</span>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              ${config.project.name}
            </h1>
            <p className="text-sm text-slate-400">Scaffolded with ForgeStack Architecture Engine</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Frontend</span>
            <p className="text-lg font-medium text-slate-200">${config.frontend?.framework} + Tailwind</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Backend</span>
            <p className="text-lg font-medium text-slate-200">${config.backend?.framework || 'None'} API (: ${config.backend?.port || 4000})</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Backend Live Status</p>
            <p className="font-mono text-sm mt-1">
              {loading ? 'Checking backend...' : \`Status: \${health?.status || 'Unknown'}\`}
            </p>
          </div>
          <div className={\`w-3 h-3 rounded-full \${health?.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}\`} />
        </div>
      </div>
    </main>
  );
}
`;
    files.push({ path: `${basePath}/app/page.tsx`, content: pageTsx });
  }

  return files;
}
