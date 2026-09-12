#!/usr/bin/env node
/**
 * blender_runner.mjs - Node.js CLI & Orchestrator for Blender SkinForge.
 * Discovers Blender executable, manages working directories, and executes
 * 2D-to-3D mesh generation, skeletal rigging, motion synthesis, and export.
 */

import { spawnSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Discovers Blender executable on Windows or from PATH.
 */
export function findBlenderExecutable() {
  const candidatePaths = [
    'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe',
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Check PATH
  try {
    const res = execSync('where.exe blender', { encoding: 'utf-8' }).trim().split('\n')[0].trim();
    if (res && fs.existsSync(res)) {
      return res;
    }
  } catch {
    // ignore
  }

  throw new Error('Could not locate Blender executable. Please verify Blender 5.x installation.');
}

/**
 * Executes Blender with custom Python script and arguments.
 */
export function runBlender({ blendFile = null, bridgeScript, args = [] }) {
  const blenderExe = findBlenderExecutable();
  const cliArgs = ['-b'];

  if (blendFile && fs.existsSync(blendFile)) {
    cliArgs.push(blendFile);
  }

  cliArgs.push('-P', bridgeScript, '--', ...args);

  console.log(`[🚀] Executing Blender CLI:\n    "${blenderExe}" ${cliArgs.join(' ')}\n`);

  const proc = spawnSync(blenderExe, cliArgs, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    encoding: 'utf-8',
    windowsHide: true,
  });

  if (proc.error) {
    throw proc.error;
  }
  if (proc.status !== 0) {
    throw new Error(`Blender exited with status code ${proc.status}`);
  }

  return true;
}

/**
 * Creates a synthetic 2D texture (military camo pattern) for testing or fallback.
 */
export function createSyntheticTexture(outputPath) {
  const blenderExe = findBlenderExecutable();
  const scriptPath = path.join(PROJECT_ROOT, 'src', 'blender', 'generate_texture.py');
  execSync(`"${blenderExe}" -b -P "${scriptPath}" -- "${outputPath.replace(/\\/g, '/')}"`, {
    stdio: 'inherit',
    windowsHide: true,
  });
  return outputPath;
}

// -------------------------------------------------------------
// CLI Subcommands
// -------------------------------------------------------------
function printHelp() {
  console.log(`
===============================================================
  BLENDER SKINFOFORGE - 2D to 3D Game Skin & Motion Generator
===============================================================
Usage:
  node src/tools/blender_runner.mjs <command> [options]

Commands:
  create   --image <path> --name <skin_name> [--type character|relief] [--turntable]
  refine   --name <skin_name> --params '{"shoulder_width": 1.2, "metallic": 0.5}'
  render   --name <skin_name> [--turntable]
  export   --name <skin_name> [--out-dir <path>]
  test     Runs end-to-end automated test pipeline
`);
}

function parseCli() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === '--help' || cmd === '-h') {
    printHelp();
    process.exit(0);
  }

  const options = {};
  for (let i = 1; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].substring(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      options[key] = val;
    }
  }

  const bridgeScript = path.join(PROJECT_ROOT, 'src', 'blender', 'blender_bridge.py');

  if (cmd === 'create') {
    const skinName = options.name || 'soldier_skin';
    let imagePath = options.image;

    if (!imagePath || !fs.existsSync(imagePath)) {
      console.log(`[!] No image path supplied or file does not exist.`);
      const defaultImg = path.join(PROJECT_ROOT, 'assets', 'inputs', 'sample_camo.png');
      if (!fs.existsSync(defaultImg)) {
        console.log(`[*] Generating sample military camo texture at ${defaultImg}...`);
        fs.mkdirSync(path.dirname(defaultImg), { recursive: true });
        createSyntheticTexture(defaultImg);
      }
      imagePath = defaultImg;
    }

    const workDir = path.join(PROJECT_ROOT, 'work', skinName);
    const blendFile = path.join(workDir, 'project.blend');
    const previewDir = path.join(workDir, 'previews');
    fs.mkdirSync(previewDir, { recursive: true });

    const args = [
      '--action', 'create',
      '--image', imagePath,
      '--name', skinName,
      '--type', options.type || 'character',
      '--out-blend', blendFile,
      '--out-dir', previewDir,
    ];
    if (options.turntable) args.push('--turntable');
    if (options.params) args.push('--params', options.params);

    runBlender({ bridgeScript, args });
    console.log(`\n[🎉] Creation Complete! Previews available in: ${previewDir}\n`);

  } else if (cmd === 'refine') {
    const skinName = options.name || 'soldier_skin';
    const workDir = path.join(PROJECT_ROOT, 'work', skinName);
    const blendFile = path.join(workDir, 'project.blend');
    const previewDir = path.join(workDir, 'previews');

    if (!fs.existsSync(blendFile)) {
      throw new Error(`Project file does not exist: ${blendFile}. Run 'create' first.`);
    }

    const args = [
      '--action', 'refine',
      '--name', skinName,
      '--params', options.params || '{}',
      '--out-blend', blendFile,
      '--out-dir', previewDir,
    ];

    runBlender({ blendFile, bridgeScript, args });
    console.log(`\n[🎉] Refinement Complete! Updated previews in: ${previewDir}\n`);

  } else if (cmd === 'render') {
    const skinName = options.name || 'soldier_skin';
    const workDir = path.join(PROJECT_ROOT, 'work', skinName);
    const blendFile = path.join(workDir, 'project.blend');
    const previewDir = path.join(workDir, 'previews');

    const args = [
      '--action', 'render',
      '--name', skinName,
      '--out-dir', previewDir,
    ];
    if (options.turntable) args.push('--turntable');

    runBlender({ blendFile, bridgeScript, args });
    console.log(`\n[✓] Render Complete! Previews in: ${previewDir}\n`);

  } else if (cmd === 'export') {
    const skinName = options.name || 'soldier_skin';
    const workDir = path.join(PROJECT_ROOT, 'work', skinName);
    const blendFile = path.join(workDir, 'project.blend');
    const exportDir = options['out-dir'] || path.join(PROJECT_ROOT, 'exports', 'skins', skinName);
    fs.mkdirSync(exportDir, { recursive: true });

    const args = [
      '--action', 'export',
      '--name', skinName,
      '--out-dir', exportDir,
    ];

    runBlender({ blendFile, bridgeScript, args });
    console.log(`\n[★] Production Export Complete! Game files in: ${exportDir}\n`);

  } else if (cmd === 'test') {
    runSelfTest();
  } else {
    printHelp();
  }
}

/**
 * End-to-end automated validation suite.
 */
function runSelfTest() {
  console.log(`\n[⚡] Starting Blender SkinForge Automated Verification Test Suite...\n`);

  const testSkin = 'unit_test_soldier';
  const testInput = path.join(PROJECT_ROOT, 'assets', 'inputs', 'test_pattern.png');
  const workDir = path.join(PROJECT_ROOT, 'work', testSkin);
  const blendFile = path.join(workDir, 'project.blend');
  const previewDir = path.join(workDir, 'previews');
  const exportDir = path.join(PROJECT_ROOT, 'exports', 'skins', testSkin);

  // 1. Synthetic image generation
  console.log(`[1/4] Generating synthetic texture...`);
  fs.mkdirSync(path.dirname(testInput), { recursive: true });
  createSyntheticTexture(testInput);

  const bridgeScript = path.join(PROJECT_ROOT, 'src', 'blender', 'blender_bridge.py');

  // 2. Create character skin with motion
  console.log(`[2/4] Testing 'create' action (geometry, armature, NLA animations, previews)...`);
  fs.mkdirSync(previewDir, { recursive: true });
  runBlender({
    bridgeScript,
    args: [
      '--action', 'create',
      '--image', testInput,
      '--name', testSkin,
      '--type', 'character',
      '--out-blend', blendFile,
      '--out-dir', previewDir,
    ]
  });

  if (!fs.existsSync(blendFile)) {
    throw new Error(`Test failed: ${blendFile} was not created.`);
  }
  const perspectiveImg = path.join(previewDir, `${testSkin}_preview_perspective.png`);
  if (!fs.existsSync(perspectiveImg)) {
    throw new Error(`Test failed: Preview image was not rendered.`);
  }

  // 3. Test iterative refinement
  console.log(`[3/4] Testing 'refine' action (material PBR updates & proportion modifications)...`);
  runBlender({
    blendFile,
    bridgeScript,
    args: [
      '--action', 'refine',
      '--name', testSkin,
      '--params', JSON.stringify({ shoulder_width: 1.15, metallic: 0.6, roughness: 0.35 }),
      '--out-blend', blendFile,
      '--out-dir', previewDir,
    ]
  });

  // 4. Test production game export
  console.log(`[4/4] Testing 'export' action (GLB, FBX, skin_manifest.json)...`);
  fs.mkdirSync(exportDir, { recursive: true });
  runBlender({
    blendFile,
    bridgeScript,
    args: [
      '--action', 'export',
      '--name', testSkin,
      '--out-dir', exportDir,
    ]
  });

  const glbFile = path.join(exportDir, `${testSkin}.glb`);
  const fbxFile = path.join(exportDir, `${testSkin}.fbx`);
  const manifestFile = path.join(exportDir, 'skin_manifest.json');

  if (!fs.existsSync(glbFile) || fs.statSync(glbFile).size === 0) {
    throw new Error(`Test failed: ${glbFile} was not exported properly.`);
  }
  if (!fs.existsSync(fbxFile) || fs.statSync(fbxFile).size === 0) {
    throw new Error(`Test failed: ${fbxFile} was not exported properly.`);
  }
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`Test failed: ${manifestFile} is missing.`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
  console.log(`\n=======================================================`);
  console.log(`[✓] ALL TESTS PASSED SUCCESSFULLY!`);
  console.log(`    Asset: ${manifest.skin_name}`);
  console.log(`    Vertices: ${manifest.metrics.vertices}, Triangles: ${manifest.metrics.triangles}`);
  console.log(`    Bones: ${manifest.metrics.bone_count}`);
  console.log(`    Animations: ${manifest.animations.join(', ')}`);
  console.log(`    GLB Size: ${(fs.statSync(glbFile).size / 1024).toFixed(1)} KB`);
  console.log(`    FBX Size: ${(fs.statSync(fbxFile).size / 1024).toFixed(1)} KB`);
  console.log(`=======================================================\n`);
}

// Run if called directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  parseCli();
}
