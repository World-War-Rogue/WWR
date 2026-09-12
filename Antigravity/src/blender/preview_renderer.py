"""
preview_renderer.py - Studio Camera & Showcase Renderer for Blender SkinForge.
Sets up 3-point studio lighting and renders multi-angle perspective previews
and animated turnaround clips for iterative user review.
"""

import math
import os
import bpy


def setup_studio_environment(scene_center=(0, 0, 1.0)):
    """
    Sets up a neutral studio backdrop, 3-point lighting rig, and camera.
    """
    # Remove existing cameras and lights
    for obj in list(bpy.data.objects):
        if obj.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(obj, do_unlink=True)

    # 1. Key Light (Sun / Spot, warm 45-degree angle)
    key_light_data = bpy.data.lights.new(name="KeyLight", type='POINT')
    key_light_data.energy = 800.0
    key_light_data.color = (1.0, 0.96, 0.90)
    key_light = bpy.data.objects.new("KeyLight", key_light_data)
    key_light.location = (2.2, -2.5, 2.8)
    bpy.context.collection.objects.link(key_light)

    # 2. Fill Light (Soft cool light)
    fill_light_data = bpy.data.lights.new(name="FillLight", type='POINT')
    fill_light_data.energy = 350.0
    fill_light_data.color = (0.85, 0.92, 1.0)
    fill_light = bpy.data.objects.new("FillLight", fill_light_data)
    fill_light.location = (-2.5, -2.0, 1.8)
    bpy.context.collection.objects.link(fill_light)

    # 3. Rim Light (Backlight for rim highlights on silhouette)
    rim_light_data = bpy.data.lights.new(name="RimLight", type='POINT')
    rim_light_data.energy = 600.0
    rim_light_data.color = (0.9, 0.95, 1.0)
    rim_light = bpy.data.objects.new("RimLight", rim_light_data)
    rim_light.location = (0.5, 2.6, 2.6)
    bpy.context.collection.objects.link(rim_light)

    # 4. Camera
    cam_data = bpy.data.cameras.new("ShowcaseCamera")
    cam_data.lens = 65.0  # 65mm focal length for natural character proportions
    cam_obj = bpy.data.objects.new("ShowcaseCamera", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    # Studio background color (dark slate military gray)
    bpy.context.scene.render.film_transparent = True

    return cam_obj


def position_camera(cam_obj, angle_type="perspective", target_z=1.0, distance=3.2):
    """
    Positions camera around target subject based on showcase view angle.
    """
    if angle_type == "front":
        cam_obj.location = (0, -distance, target_z)
        cam_obj.rotation_euler = (math.radians(90), 0, 0)
    elif angle_type == "side":
        cam_obj.location = (-distance, 0, target_z)
        cam_obj.rotation_euler = (math.radians(90), 0, math.radians(-90))
    elif angle_type == "back":
        cam_obj.location = (0, distance, target_z)
        cam_obj.rotation_euler = (math.radians(90), 0, math.radians(180))
    else:  # perspective 3/4
        px = distance * 0.65
        py = -distance * 0.75
        pz = target_z + 0.35
        cam_obj.location = (px, py, pz)
        # Point toward (0, 0, target_z)
        dx = -px
        dy = -py
        dz = target_z - pz
        dist_xy = math.sqrt(dx * dx + dy * dy)
        pitch = math.atan2(dist_xy, -dz)
        yaw = math.atan2(dx, -dy)
        cam_obj.rotation_euler = (pitch, 0, yaw)


def render_preview_stills(output_dir, base_name="skin", resolution=(768, 768)):
    """
    Renders 4 preview angles (Front, Perspective 3/4, Side, Back) as PNGs.
    """
    os.makedirs(output_dir, exist_ok=True)
    scene = bpy.context.scene
    scene.render.resolution_x = resolution[0]
    scene.render.resolution_y = resolution[1]
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

    cam_obj = setup_studio_environment()

    views = [
        ("perspective", f"{base_name}_preview_perspective.png"),
        ("front", f"{base_name}_preview_front.png"),
        ("side", f"{base_name}_preview_side.png"),
        ("back", f"{base_name}_preview_back.png"),
    ]

    rendered_files = []
    for angle_name, filename in views:
        position_camera(cam_obj, angle_type=angle_name)
        file_path = os.path.join(output_dir, filename)
        scene.render.filepath = file_path
        bpy.ops.render.render(write_still=True)
        rendered_files.append(file_path)
        print(f"[✓] Rendered: {file_path}")

    return rendered_files


def render_turntable_frames(output_dir, base_name="skin", num_frames=16, resolution=(512, 512)):
    """
    Renders an orbit sequence around the asset for turnaround motion inspection.
    """
    turntable_dir = os.path.join(output_dir, f"{base_name}_turntable")
    os.makedirs(turntable_dir, exist_ok=True)

    scene = bpy.context.scene
    scene.render.resolution_x = resolution[0]
    scene.render.resolution_y = resolution[1]
    scene.render.image_settings.file_format = 'PNG'

    cam_obj = setup_studio_environment()
    distance = 3.2
    target_z = 1.0

    frame_paths = []
    for i in range(num_frames):
        theta = (2.0 * math.pi * i) / num_frames
        px = distance * math.sin(theta)
        py = -distance * math.cos(theta)
        pz = target_z + 0.3
        cam_obj.location = (px, py, pz)

        # Look at target
        dx = -px
        dy = -py
        dz = target_z - pz
        dist_xy = math.sqrt(dx * dx + dy * dy)
        pitch = math.atan2(dist_xy, -dz)
        yaw = math.atan2(dx, -dy)
        cam_obj.rotation_euler = (pitch, 0, yaw)

        frame_path = os.path.join(turntable_dir, f"frame_{i:03d}.png")
        scene.render.filepath = frame_path
        bpy.ops.render.render(write_still=True)
        frame_paths.append(frame_path)

    print(f"[✓] Rendered {num_frames} turntable motion frames into {turntable_dir}")
    return frame_paths
