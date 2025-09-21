const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root so shared packages are picked up
config.watchFolders = [workspaceRoot];

// Prefer the app's node_modules first, then the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// This helps Metro resolve symlinked packages under PNPM
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
