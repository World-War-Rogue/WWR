"""
mesh_builder.py - 3D Geometry Generator for Blender SkinForge.
Constructs game-ready 3D meshes (Humanoid Character Skins, Tactical Props,
or 3D Relief Meshes) with automated UV mapping and skeletal vertex groups.
"""

import math
import os
import bpy
import bmesh
import numpy as np


def build_humanoid_base_mesh(name="SkinMesh", params=None):
    """
    Constructs a low-to-mid poly game-ready humanoid character mesh
    with vertex groups ready for skeletal skinning and UV projection.
    """
    params = params or {}
    scale_height = float(params.get("height_scale", 1.0))
    shoulder_w = float(params.get("shoulder_width", 1.0))
    bulk = float(params.get("bulk", 1.0))
    armor_plates = bool(params.get("armor_plates", True))

    mesh = bpy.data.meshes.new(name=f"{name}_Data")
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    bm = bmesh.new()

    # Bone vertex group mapping registry
    vg_data = {
        "Hips": [],
        "Spine": [],
        "Chest": [],
        "Neck": [],
        "Head": [],
        "Shoulder.L": [],
        "UpperArm.L": [],
        "Forearm.L": [],
        "Hand.L": [],
        "Shoulder.R": [],
        "UpperArm.R": [],
        "Forearm.R": [],
        "Hand.R": [],
        "Thigh.L": [],
        "Shin.L": [],
        "Foot.L": [],
        "Thigh.R": [],
        "Shin.R": [],
        "Foot.R": [],
    }

    def add_cylinder_segment(radius_top, radius_bot, height, z_center, x_offset=0.0, y_offset=0.0, segments=8, vg_name=None):
        verts = []
        half_h = height / 2.0
        # Bottom circle
        for i in range(segments):
            angle = 2.0 * math.pi * i / segments
            x = x_offset + radius_bot * math.cos(angle)
            y = y_offset + radius_bot * math.sin(angle)
            z = z_center - half_h
            v = bm.verts.new((x, y, z))
            verts.append(v)
            if vg_name and vg_name in vg_data:
                vg_data[vg_name].append(v)
        # Top circle
        for i in range(segments):
            angle = 2.0 * math.pi * i / segments
            x = x_offset + radius_top * math.cos(angle)
            y = y_offset + radius_top * math.sin(angle)
            z = z_center + half_h
            v = bm.verts.new((x, y, z))
            verts.append(v)
            if vg_name and vg_name in vg_data:
                vg_data[vg_name].append(v)

        # Connect side faces
        for i in range(segments):
            next_i = (i + 1) % segments
            v_bot1 = verts[i]
            v_bot2 = verts[next_i]
            v_top1 = verts[segments + i]
            v_top2 = verts[segments + next_i]
            bm.faces.new((v_bot1, v_bot2, v_top2, v_top1))

        return verts

    def add_box_segment(w, d, h, center_pos, vg_name=None):
        cx, cy, cz = center_pos
        hw, hd, hh = w / 2.0, d / 2.0, h / 2.0
        v_coords = [
            (cx - hw, cy - hd, cz - hh),
            (cx + hw, cy - hd, cz - hh),
            (cx + hw, cy + hd, cz - hh),
            (cx - hw, cy + hd, cz - hh),
            (cx - hw, cy - hd, cz + hh),
            (cx + hw, cy - hd, cz + hh),
            (cx + hw, cy + hd, cz + hh),
            (cx - hw, cy + hd, cz + hh),
        ]
        created_verts = [bm.verts.new(coord) for coord in v_coords]
        if vg_name and vg_name in vg_data:
            vg_data[vg_name].extend(created_verts)

        # 6 faces
        face_indices = [
            (0, 1, 2, 3),  # Bottom
            (4, 7, 6, 5),  # Top
            (0, 4, 5, 1),  # Front
            (2, 6, 7, 3),  # Back
            (0, 3, 7, 4),  # Left
            (1, 5, 6, 2),  # Right
        ]
        for f_idx in face_indices:
            bm.faces.new([created_verts[i] for i in f_idx])
        return created_verts

    # 1. Pelvis / Hips (Z: 0.85 to 1.05)
    hip_h = 0.20 * scale_height
    hip_z = 0.95 * scale_height
    add_box_segment(0.34 * bulk, 0.22 * bulk, hip_h, (0.0, 0.0, hip_z), "Hips")

    # 2. Spine (Z: 1.05 to 1.25)
    spine_h = 0.20 * scale_height
    spine_z = 1.15 * scale_height
    add_cylinder_segment(0.16 * bulk, 0.15 * bulk, spine_h, spine_z, 0, 0, segments=8, vg_name="Spine")

    # 3. Chest / Torso (Z: 1.25 to 1.55)
    chest_h = 0.30 * scale_height
    chest_z = 1.40 * scale_height
    add_box_segment(0.42 * bulk * shoulder_w, 0.26 * bulk, chest_h, (0.0, 0.0, chest_z), "Chest")

    # Optional Tactical Chestplate Extrusion
    if armor_plates:
        add_box_segment(0.44 * bulk * shoulder_w, 0.08 * bulk, chest_h * 0.75, (0.0, 0.14 * bulk, chest_z), "Chest")

    # 4. Neck (Z: 1.55 to 1.63)
    neck_h = 0.08 * scale_height
    neck_z = 1.59 * scale_height
    add_cylinder_segment(0.08 * bulk, 0.09 * bulk, neck_h, neck_z, 0, 0, segments=8, vg_name="Neck")

    # 5. Head & Helmet (Z: 1.63 to 1.88)
    head_h = 0.25 * scale_height
    head_z = 1.76 * scale_height
    add_box_segment(0.22 * bulk, 0.24 * bulk, head_h, (0.0, 0.02 * bulk, head_z), "Head")
    # Tactical Visor / Eye slit
    add_box_segment(0.24 * bulk, 0.06 * bulk, 0.06 * scale_height, (0.0, 0.14 * bulk, head_z + 0.02), "Head")

    # 6. Shoulders & Arms (Left & Right)
    arm_r = 0.065 * bulk
    for side, sign, shoulder_name, upper_name, fore_name, hand_name in [
        ("L", 1.0, "Shoulder.L", "UpperArm.L", "Forearm.L", "Hand.L"),
        ("R", -1.0, "Shoulder.R", "UpperArm.R", "Forearm.R", "Hand.R"),
    ]:
        sh_x = sign * 0.27 * bulk * shoulder_w
        sh_z = 1.48 * scale_height
        add_box_segment(0.12 * bulk, 0.14 * bulk, 0.12 * bulk, (sh_x, 0, sh_z), shoulder_name)

        # Upper Arm
        ua_len = 0.28 * scale_height
        ua_z = sh_z - 0.18 * scale_height
        ua_x = sign * (0.28 * bulk * shoulder_w + 0.04)
        add_cylinder_segment(arm_r * 1.1, arm_r * 0.9, ua_len, ua_z, ua_x, 0, 8, upper_name)

        # Forearm
        fa_len = 0.26 * scale_height
        fa_z = ua_z - ua_len
        add_cylinder_segment(arm_r * 0.9, arm_r * 0.8, fa_len, fa_z, ua_x, 0, 8, fore_name)

        # Hand / Glove
        hand_h = 0.12 * scale_height
        hand_z = fa_z - (fa_len / 2.0) - (hand_h / 2.0)
        add_box_segment(0.08 * bulk, 0.10 * bulk, hand_h, (ua_x, 0.02, hand_z), hand_name)

    # 7. Legs & Boots (Left & Right)
    leg_r = 0.085 * bulk
    for side, sign, thigh_name, shin_name, foot_name in [
        ("L", 1.0, "Thigh.L", "Shin.L", "Foot.L"),
        ("R", -1.0, "Thigh.R", "Shin.R", "Foot.R"),
    ]:
        leg_x = sign * 0.11 * bulk

        # Thigh (Upper Leg)
        thigh_len = 0.42 * scale_height
        thigh_z = 0.65 * scale_height
        add_cylinder_segment(leg_r * 1.1, leg_r * 0.9, thigh_len, thigh_z, leg_x, 0, 8, thigh_name)

        # Shin (Lower Leg)
        shin_len = 0.38 * scale_height
        shin_z = thigh_z - (thigh_len / 2.0) - (shin_len / 2.0)
        add_cylinder_segment(leg_r * 0.9, leg_r * 0.8, shin_len, shin_z, leg_x, 0, 8, shin_name)

        # Combat Boot / Foot
        foot_h = 0.10 * scale_height
        foot_z = 0.05 * scale_height
        foot_y = 0.04 * bulk
        add_box_segment(0.12 * bulk, 0.22 * bulk, foot_h, (leg_x, foot_y, foot_z), foot_name)

    # Finalize BMesh
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()

    # Calculate UVs (Frontal + Cylindrical orthographic projection)
    uv_layer = bm.loops.layers.uv.new("UVMap")
    for face in bm.faces:
        for loop in face.loops:
            v = loop.vert
            # Map X, Z coordinates to UV space [0, 1]
            u = 0.5 + (v.co.x / (0.8 * bulk * shoulder_w + 0.2)) * 0.45
            w = (v.co.z / (1.95 * scale_height)) * 0.9 + 0.05
            u = max(0.01, min(0.99, u))
            w = max(0.01, min(0.99, w))
            loop[uv_layer].uv = (u, w)

    bm.to_mesh(mesh)
    bm.free()

    # Create Vertex Groups and assign weights
    for group_name, v_list in vg_data.items():
        if v_list:
            grp = obj.vertex_groups.new(name=group_name)
            # Find indices
            v_indices = [v.index for v in mesh.vertices if True]
            # Fast assignment by height range fallback to ensure 100% coverage
            grp_indices = []
            for v in mesh.vertices:
                cz = v.co.z
                cx = v.co.x
                if group_name == "Head" and cz >= 1.63 * scale_height:
                    grp_indices.append(v.index)
                elif group_name == "Neck" and 1.55 * scale_height <= cz < 1.63 * scale_height:
                    grp_indices.append(v.index)
                elif group_name == "Chest" and 1.25 * scale_height <= cz < 1.55 * scale_height and abs(cx) <= 0.25 * bulk * shoulder_w:
                    grp_indices.append(v.index)
                elif group_name == "Spine" and 1.05 * scale_height <= cz < 1.25 * scale_height:
                    grp_indices.append(v.index)
                elif group_name == "Hips" and 0.85 * scale_height <= cz < 1.05 * scale_height:
                    grp_indices.append(v.index)
                elif "Arm" in group_name or "Shoulder" in group_name or "Hand" in group_name:
                    is_left = ".L" in group_name
                    if (is_left and cx > 0.22) or (not is_left and cx < -0.22):
                        if "Hand" in group_name and cz < 1.0 * scale_height:
                            grp_indices.append(v.index)
                        elif "Forearm" in group_name and 1.0 <= cz < 1.3:
                            grp_indices.append(v.index)
                        elif "UpperArm" in group_name and 1.3 <= cz < 1.48:
                            grp_indices.append(v.index)
                        elif "Shoulder" in group_name and cz >= 1.48:
                            grp_indices.append(v.index)
                elif "Thigh" in group_name or "Shin" in group_name or "Foot" in group_name:
                    is_left = ".L" in group_name
                    if (is_left and cx >= 0.0) or (not is_left and cx < 0.0):
                        if "Foot" in group_name and cz < 0.12:
                            grp_indices.append(v.index)
                        elif "Shin" in group_name and 0.12 <= cz < 0.50:
                            grp_indices.append(v.index)
                        elif "Thigh" in group_name and 0.50 <= cz < 0.88:
                            grp_indices.append(v.index)

            if grp_indices:
                grp.add(grp_indices, 1.0, "REPLACE")

    mesh.update()
    # Add smooth shading
    for poly in mesh.polygons:
        poly.use_smooth = True

    return obj


def build_relief_mesh_from_image(image_path, name="ReliefMesh", params=None):
    """
    Constructs a solid 3D relief mesh from a 2D image using luminance displacement,
    extrusion, and automatic beveling for emblems, vehicles, or weapon props.
    """
    params = params or {}
    depth = float(params.get("depth", 0.3))
    resolution = int(params.get("resolution", 32))  # Grid subdivisions
    thickness = float(params.get("thickness", 0.05))

    img = bpy.data.images.load(image_path, check_existing=True)
    w, h = img.size[0], img.size[1]
    aspect = w / max(1, h)

    # Create plane grid
    bpy.ops.mesh.primitive_grid_add(
        x_subdivisions=resolution,
        y_subdivisions=resolution,
        size=2.0,
        location=(0, 0, 1.0)
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (aspect, 1.0, 1.0)
    bpy.ops.object.transform_apply(scale=True)

    # Sample luminance from image pixels via numpy
    pixels = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(pixels)
    rgba = pixels.reshape((h, w, 4))
    # Luminance = 0.299 R + 0.587 G + 0.114 B
    lum = 0.299 * rgba[:, :, 0] + 0.587 * rgba[:, :, 1] + 0.114 * rgba[:, :, 2]
    alpha = rgba[:, :, 3]

    mesh = obj.data
    # Displace vertices along Z based on sampled luminance & alpha
    for v in mesh.vertices:
        # Normalize coordinates to [0, 1]
        u = (v.co.x / (2.0 * aspect)) + 0.5
        v_coord = (v.co.y / 2.0) + 0.5
        px = int(np.clip(u * (w - 1), 0, w - 1))
        py = int(np.clip(v_coord * (h - 1), 0, h - 1))

        pixel_lum = lum[py, px]
        pixel_a = alpha[py, px]
        v.co.z += (pixel_lum * depth) * pixel_a

    # Solidify modifier for watertight 3D volume
    solid = obj.modifiers.new(name="Solidify", type="SOLIDIFY")
    solid.thickness = thickness
    solid.offset = -1.0

    # Bevel modifier for clean game edges
    bevel = obj.modifiers.new(name="Bevel", type="BEVEL")
    bevel.width = 0.02
    bevel.segments = 2

    return obj
