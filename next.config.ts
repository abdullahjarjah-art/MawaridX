import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the production Dockerfile — produces .next/standalone
  // with a minimal node_modules tree and a server.js entry point.
  output: "standalone",

  // Disable React Strict Mode double-mounting in dev to prevent
  // Fast Refresh loops caused by async setState before mount
  reactStrictMode: false,

  // instrumentation.ts is supported natively in Next.js 15+; the
  // `experimental.instrumentationHook` flag is removed and breaks the
  // build if set on Next 16. We keep the file at src/instrumentation.ts.

  allowedDevOrigins: [
    "*.serveousercontent.com",
    "*.loca.lt",
    "*.trycloudflare.com",
  ],

  // Webpack: mark Node.js built-ins as external so they don't get bundled
  // isServer:true + nextRuntime:'edge' = Edge runtime (no fs/path); isServer:false = browser
  webpack: (config, { isServer, nextRuntime }) => {
    const needsFallback = !isServer || nextRuntime === "edge";
    if (needsFallback) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        os: false,
      };
    }

    // Prevent webpack file-watcher from triggering HMR reloads when runtime
    // data files change (backups, SQLite DB, uploaded files, etc.).
    // Without this, creating a backup at server startup causes a recompile
    // → HMR full-reload loop in the browser.
    // Next.js's compiled webpack only accepts: string | RegExp | string[]
    // A single RegExp is the cleanest option — covers all the runtime-data dirs.
    config.watchOptions = {
      ...config.watchOptions,
      // تجاهل كل الملفات التي تتغيّر في وقت التشغيل حتى لا يُعيد webpack الـ compile باستمرار:
      // - node_modules / .next / backups : المعتادة
      // - *.db / *.db-wal / *.db-shm    : ملفات SQLite (تتغيّر مع كل عملية)
      // - public/uploads                 : الصور المرفوعة
      ignored: /[\\/](backups|node_modules|\.next)[\\/]|[\\/]public[\\/]uploads[\\/]|\.db(-wal|-shm|-journal)?$|\.tsbuildinfo$|dev-server\.log$/,
    };

    return config;
  },
};

export default nextConfig;
