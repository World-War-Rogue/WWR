---
name: blender-skin-craft
description: Autonomous Blender 3D pipeline for converting 2D images, photos, and concept art into rigged, animated, game-ready base skins (GLB/FBX) with an interactive feedback loop.
---

# Blender SkinForge & Motion Synthesizer

Blender SkinForge provides an automated pipeline for transforming 2D images into game-ready 3D assets with skeletal motion, animations, and PBR materials using Blender 5.2 on Windows.

## Interactive Agent Iteration Workflow

1. **Supply Starting 2D Concept / Photo**:
   Drop your 2D photo, texture, or concept into `assets/inputs/` (e.g. `assets/inputs/soldier_concept.png`).

2. **Generate 3D Asset & Motion**:
   ```bash
   agy-node src/tools/blender_runner.mjs create --image assets/inputs/soldier_concept.png --name soldier_alpha --type character
   ```
   This creates:
   - Optimized 3D base mesh with vertex groups for skinning.
   - PBR Material network with base color, roughness, metallic, and normal bump maps.
   - Full humanoid skeletal armature (`Root`, `Hips`, `Spine`, `Chest`, `Arms`, `Legs`).
   - Seamless looping animation actions:
     - `Idle`: Organic breathing and arm sway (60 frames).
     - `Walk`: Locomotion gait with alternating limbs and spine bounce (32 frames).
     - `CombatReady`: Tactical braced two-handed weapon stance (40 frames).
     - `Turntable`: 360-degree inspection spin (72 frames).
   - Multi-angle preview renders in `work/soldier_alpha/previews/`.

3. **Iteratively Refine Design**:
   Request adjustments from the agent or run parameter updates:
   ```bash
   agy-node src/tools/blender_runner.mjs refine --name soldier_alpha --params "{\"shoulder_width\": 1.25, \"metallic\": 0.6, \"roughness\": 0.3}"
   ```
   View the updated preview stills in `work/soldier_alpha/previews/`.

4. **Production Export to Video Game**:
   Once satisfied with the design:
   ```bash
   agy-node src/tools/blender_runner.mjs export --name soldier_alpha
   ```
   Production deliverables in `exports/skins/soldier_alpha/`:
   - `soldier_alpha.glb` (Binary glTF with embedded textures, rig, and animations).
   - `soldier_alpha.fbx` (Autodesk FBX for Unity & Unreal Engine).
   - `skin_manifest.json` (Vertex counts, triangle counts, bone list, and engine integration snippets).

## CLI Quick Reference

```bash
# Create skin from 2D image
agy-node src/tools/blender_runner.mjs create --image <path> --name <name>

# Create with 360 turntable frame sequence
agy-node src/tools/blender_runner.mjs create --image <path> --name <name> --turntable

# Refine active mesh and materials
agy-node src/tools/blender_runner.mjs refine --name <name> --params '{"bulk": 1.1, "metallic": 0.5}'

# Re-render showcase stills
agy-node src/tools/blender_runner.mjs render --name <name>

# Export game-ready production files
agy-node src/tools/blender_runner.mjs export --name <name>

# Run automated validation test suite
agy-node src/tools/blender_runner.mjs test
```
