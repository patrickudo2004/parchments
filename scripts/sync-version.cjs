const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
console.log(`[sync-version] Synchronizing project version to v${version}...`);

// 1. src/lib/version.ts
const versionTsPath = path.join(rootDir, 'src', 'lib', 'version.ts');
if (fs.existsSync(versionTsPath)) {
    let content = fs.readFileSync(versionTsPath, 'utf8');
    content = content.replace(/export const APP_VERSION = ['"][^'"]+['"];/, `export const APP_VERSION = '${version}';`);
    fs.writeFileSync(versionTsPath, content, 'utf8');
    console.log(`  ✓ Updated src/lib/version.ts -> ${version}`);
}

// 2. public/version.json
const versionJsonPath = path.join(rootDir, 'public', 'version.json');
if (fs.existsSync(versionJsonPath)) {
    const vJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    vJson.latest = version;
    fs.writeFileSync(versionJsonPath, JSON.stringify(vJson, null, 2) + '\n', 'utf8');
    console.log(`  ✓ Updated public/version.json -> ${version}`);
}

// 3. src-tauri/tauri.conf.json
const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    tauriConf.version = version;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
    console.log(`  ✓ Updated src-tauri/tauri.conf.json -> ${version}`);
}

// 4. src-tauri/Cargo.toml
const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
    let content = fs.readFileSync(cargoTomlPath, 'utf8');
    content = content.replace(/^version\s*=\s*['"][^'"]+['"]/m, `version = "${version}"`);
    fs.writeFileSync(cargoTomlPath, content, 'utf8');
    console.log(`  ✓ Updated src-tauri/Cargo.toml -> ${version}`);
}

// 5. android/app/build.gradle
const buildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
    let content = fs.readFileSync(buildGradlePath, 'utf8');
    content = content.replace(/versionName\s+['"][^'"]+['"]/, `versionName "${version}"`);
    const semverMatch = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (semverMatch) {
        const code = parseInt(semverMatch[1], 10) * 10000 + parseInt(semverMatch[2], 10) * 100 + parseInt(semverMatch[3], 10);
        content = content.replace(/versionCode\s+\d+/, `versionCode ${code}`);
    }
    fs.writeFileSync(buildGradlePath, content, 'utf8');
    console.log(`  ✓ Updated android/app/build.gradle -> ${version}`);
}

console.log(`[sync-version] All version references synchronized successfully.`);
