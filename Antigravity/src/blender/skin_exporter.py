"""
skin_exporter.py - Game Asset Production Exporter for Blender SkinForge.
Exports game-ready GLB / glTF and FBX assets with embedded skeletal rigs,
PBR materials, and animation actions, alongside a comprehensive skin_manifest.json.
"""

import json
import os
import bpy


def export_game_assets(output_dir, skin_name="soldier_skin"):
    """
    Exports production-ready .glb and .fbx game assets and writes skin_manifest.json.
    """
    os.makedirs(output_dir, exist_ok=True)

    glb_path = os.path.join(output_dir, f"{skin_name}.glb")
    fbx_path = os.path.join(output_dir, f"{skin_name}.fbx")
    manifest_path = os.path.join(output_dir, "skin_manifest.json")

    # Select relevant objects (Mesh + Armature)
    for obj in bpy.data.objects:
        obj.select_set(False)

    mesh_objs = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    arm_objs = [obj for obj in bpy.data.objects if obj.type == 'ARMATURE']

    for obj in mesh_objs + arm_objs:
        obj.select_set(True)

    if arm_objs:
        bpy.context.view_layer.objects.active = arm_objs[0]
    elif mesh_objs:
        bpy.context.view_layer.objects.active = mesh_objs[0]

    # 1. Export GLB (glTF 2.0 Binary)
    print(f"[*] Exporting glTF/GLB to {glb_path}...")
    try:
        bpy.ops.export_scene.gltf(
            filepath=glb_path,
            export_format='GLB',
            use_selection=False,
            export_apply=False,
            export_texcoords=True,
            export_normals=True,
            export_tangents=False,
            export_materials='EXPORT',
            export_skins=True,
            export_nla_strips=True,
            export_animations=True
        )
        print(f"[✓] Successfully exported GLB: {glb_path}")
    except Exception as e:
        print(f"[!] Warning: glTF export encountered: {e}")

    # 2. Export FBX
    print(f"[*] Exporting FBX to {fbx_path}...")
    try:
        bpy.ops.export_scene.fbx(
            filepath=fbx_path,
            use_selection=False,
            global_scale=1.0,
            bake_space_transform=False,
            object_types={'ARMATURE', 'MESH'},
            use_mesh_modifiers=True,
            add_leaf_bones=False,
            bake_anim=True,
            bake_anim_use_nla_strips=True,
            bake_anim_use_all_actions=True,
            path_mode='COPY',
            embed_textures=True
        )
        print(f"[✓] Successfully exported FBX: {fbx_path}")
    except Exception as e:
        print(f"[!] Warning: FBX export encountered: {e}")

    # 3. Calculate Model Metrics for Manifest
    total_verts = sum(len(m.data.vertices) for m in mesh_objs)
    total_polys = sum(len(m.data.polygons) for m in mesh_objs)
    total_tris = sum(len(m.data.loop_triangles) if hasattr(m.data, "loop_triangles") else len(m.data.polygons) * 2 for m in mesh_objs)

    bones_list = []
    for a in arm_objs:
        bones_list.extend([b.name for b in a.data.bones])

    actions_list = [act.name for act in bpy.data.actions]

    manifest = {
        "skin_name": skin_name,
        "format_version": "1.0.0",
        "engine_compatibility": ["Three.js", "WebGL", "Unity", "Unreal Engine 5", "Godot 4.x"],
        "files": {
            "glb": os.path.basename(glb_path),
            "fbx": os.path.basename(fbx_path),
        },
        "metrics": {
            "vertices": total_verts,
            "polygons": total_polys,
            "triangles": total_tris,
            "bone_count": len(bones_list),
            "bones": bones_list,
        },
        "animations": actions_list,
        "game_integration": {
            "three_js_loader": f"const loader = new GLTFLoader(); loader.load('{os.path.basename(glb_path)}', (gltf) => scene.add(gltf.scene));",
            "unity_guidance": f"Drag {os.path.basename(fbx_path)} or {os.path.basename(glb_path)} directly into your Assets/Skins/ folder. Ensure Rig is set to Humanoid or Generic.",
            "unreal_guidance": f"Import {os.path.basename(fbx_path)} with 'Import Skeletal Mesh' and 'Import Animations' checked."
        }
    }

    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"[✓] Manifest generated: {manifest_path}")
    return manifest
