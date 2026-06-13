import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const pathsDir = path.join(root, 'openapi', 'paths');
const schemasDir = path.join(root, 'openapi', 'schemas');
const headersPath = path.join(root, 'openapi', 'headers.yaml');

// Read base root.yaml
const rootContent = yaml.load(fs.readFileSync(path.join(root, 'openapi', 'root.yaml'), 'utf-8'));

// Merge all path files
const pathFiles = fs.readdirSync(pathsDir).filter(f => f.endsWith('.yaml')).sort();
const mergedPaths = {};
for (const file of pathFiles) {
  const content = yaml.load(fs.readFileSync(path.join(pathsDir, file), 'utf-8'));
  Object.assign(mergedPaths, content);
}

// Merge all schema files
const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.yaml')).sort();
const mergedSchemas = {};
for (const file of schemaFiles) {
  const content = yaml.load(fs.readFileSync(path.join(schemasDir, file), 'utf-8'));
  Object.assign(mergedSchemas, content);
}

rootContent.paths = mergedPaths;
if (!rootContent.components) rootContent.components = {};
rootContent.components.schemas = mergedSchemas;
if (fs.existsSync(headersPath)) {
  rootContent.components.headers = yaml.load(fs.readFileSync(headersPath, 'utf-8'));
}

// Recursively convert all $ref from file-based to internal #/components/schemas/ references
function rewriteRefs(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(rewriteRefs);
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref' && typeof value === 'string') {
      // Convert '../schemas/xxx.yaml#/SchemaName' or './schemas/xxx.yaml#/SchemaName'
      // to '#/components/schemas/SchemaName'
      const match = value.match(/^(?:\.\.\/|\.{0,2}\/)?schemas\/[^/]+\.yaml#\/(.+)$/);
      if (match) {
        result[key] = `#/components/schemas/${match[1]}`;
      }
      // Convert '../headers.yaml#/HeaderName' to '#/components/headers/HeaderName'
      else if (value.match(/^(?:\.\.\/|\.{0,2}\/)?headers\.yaml#\/(.+)$/)) {
        const headerMatch = value.match(/#\/(.+)$/);
        if (headerMatch) {
          result[key] = `#/components/headers/${headerMatch[1]}`;
        }
      }
      // Convert './common.yaml#/EnumName' within schemas dir
      else if (value.match(/^\.{0,2}\/(?:common|envelope|user|provider|model|upstream-key|plan|redeem|ratrule|requestlog|usage|sysconfig|providererror)\.yaml#\/(.+)$/)) {
        const schemaMatch = value.match(/#\/(.+)$/);
        if (schemaMatch) {
          result[key] = `#/components/schemas/${schemaMatch[1]}`;
        }
      }
      // Convert local document refs like '#/SchemaName' to '#/components/schemas/SchemaName'
      else if (value.startsWith('#/') && !value.startsWith('#/components/')) {
        const schemaName = value.slice(2); // strip '#/'
        result[key] = `#/components/schemas/${schemaName}`;
      }
      else { result[key] = value; }
    } else if (typeof value === 'object') {
      result[key] = rewriteRefs(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Rewrite all $ref references
rootContent.paths = rewriteRefs(rootContent.paths);
rootContent.components.schemas = rewriteRefs(rootContent.components.schemas);
if (rootContent.components.headers) {
  rootContent.components.headers = rewriteRefs(rootContent.components.headers);
}

// Write the final bundled.yaml directly
const output = yaml.dump(rootContent, {
  lineWidth: -1,
  noRefs: true,
  sortKeys: false,
  quotingType: '"',
  forceQuotes: false,
});

const bundledPath = path.join(root, 'bundled.yaml');
fs.writeFileSync(bundledPath, output, 'utf-8');

const pathCount = Object.keys(rootContent.paths || {}).length;
const schemaCount = Object.keys(rootContent.components?.schemas || {}).length;
console.log(`✅ Bundled ${pathCount} paths and ${schemaCount} schemas`);
