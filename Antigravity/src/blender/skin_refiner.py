"""
skin_refiner.py - Iterative Design Refiner for Blender SkinForge.
Applies user feedback adjustments to mesh proportions, armor attachments,
PBR material properties, and animation dynamics on active Blender scenes.
"""

import math
import bpy
from material_pbr import update_material_properties


def apply_refinements(params):
    """
    Applies parametric updates to active objects in the scene.
    Supported params:
      - shoulder_width (float multiplier)
      - height_scale (float multiplier)
      - bulk (float multiplier)
      - metallic (float: 0.0 to 1.0)
      - roughness (float: 0.0 to 1.0)
      - normal_strength (float: 0.0 to 2.0)
      - tint (RGBA tuple/list)
      - anim_speed (float multiplier)
    """
    print(f"[*] Applying refinements with params: {params}")

    # 1. Update Materials
    for mat in bpy.data.materials:
        if "SkinMaterial" in mat.name:
            update_material_properties(mat, params)
            print(f"[✓] Updated material: {mat.name}")

    # 2. Update Mesh Proportions
    mesh_obj = None
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and "SkinMesh" in obj.name:
            mesh_obj = obj
            break

    if mesh_obj:
        # Scale transformations if explicitly specified
        sx = float(params.get("shoulder_width", 1.0)) * float(params.get("bulk", 1.0))
        sy = float(params.get("bulk", 1.0))
        sz = float(params.get("height_scale", 1.0))

        if (sx, sy, sz) != (1.0, 1.0, 1.0):
            mesh_obj.scale = (sx, sy, sz)
            bpy.context.view_layer.objects.active = mesh_obj
            bpy.ops.object.transform_apply(scale=True)
            print(f"[✓] Rescaled mesh proportions: sx={sx:.2f}, sy={sy:.2f}, sz={sz:.2f}")

    # 3. Update Animation Dynamics
    arm_obj = None
    for obj in bpy.data.objects:
        if obj.type == 'ARMATURE':
            arm_obj = obj
            break

    if arm_obj and arm_obj.animation_data and "anim_speed" in params:
        speed_factor = float(params["anim_speed"])
        for track in arm_obj.animation_data.nla_tracks:
            for strip in track.strips:
                strip.scale = 1.0 / max(0.1, speed_factor)
        print(f"[✓] Adjusted animation playback rate factor: {speed_factor}")

    return True
