/** @type {import('next').NextConfig} */
// Bake the checked-out source revision into the bundle, never a mutable Worker var.
const revision = process.env.FORGE_BUILD_REVISION;
const nextConfig = {
  env: {FORGE_BUILD_REVISION: /^[a-f0-9]{40}$/.test(revision || '') ? revision : 'unknown'},
};

export default nextConfig;
