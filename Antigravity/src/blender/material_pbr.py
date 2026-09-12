"""
material_pbr.py - PBR Material Generator for Blender SkinForge.
Sets up Principled BSDF materials with image textures, procedural normal maps,
roughness, metallic, and tint controls compatible with glTF and FBX export.
"""

import os
import bpy


def create_pbr_material(name="SkinMaterial", image_path=None, params=None):
    """
    Creates or updates a Principled BSDF material with PBR properties.
    """
    params = params or {}
    metallic_val = float(params.get("metallic", 0.15))
    roughness_val = float(params.get("roughness", 0.65))
    normal_strength = float(params.get("normal_strength", 0.8))
    tint_color = params.get("tint", (1.0, 1.0, 1.0, 1.0))
    specular_val = float(params.get("specular", 0.5))

    # Create new material or reuse existing
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    # Output node
    node_output = nodes.new(type="ShaderNodeOutputMaterial")
    node_output.location = (600, 0)

    # Principled BSDF node
    node_bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    node_bsdf.location = (200, 0)

    # Apply base PBR values (handling Blender 4.x / 5.x input naming)
    if "Metallic" in node_bsdf.inputs:
        node_bsdf.inputs["Metallic"].default_value = metallic_val
    if "Roughness" in node_bsdf.inputs:
        node_bsdf.inputs["Roughness"].default_value = roughness_val
    if "Specular IOR Level" in node_bsdf.inputs:
        node_bsdf.inputs["Specular IOR Level"].default_value = specular_val
    elif "Specular" in node_bsdf.inputs:
        node_bsdf.inputs["Specular"].default_value = specular_val

    links.new(node_bsdf.outputs["BSDF"], node_output.inputs["Surface"])

    # Image Texture node
    if image_path and os.path.exists(image_path):
        try:
            img = bpy.data.images.load(image_path, check_existing=True)
            node_tex = nodes.new(type="ShaderNodeTexImage")
            node_tex.image = img
            node_tex.location = (-300, 100)

            # Color Tint / Mix node if custom tint is supplied
            if tint_color and tuple(tint_color[:3]) != (1.0, 1.0, 1.0):
                node_mix = nodes.new(type="ShaderNodeMix")
                node_mix.data_type = "RGBA"
                node_mix.blend_type = "MULTIPLY"
                node_mix.inputs[0].default_value = 0.5
                node_mix.inputs[7].default_value = tint_color
                node_mix.location = (-50, 100)

                links.new(node_tex.outputs["Color"], node_mix.inputs[6])
                links.new(node_mix.outputs[2], node_bsdf.inputs["Base Color"])
            else:
                links.new(node_tex.outputs["Color"], node_bsdf.inputs["Base Color"])

            # Connect Alpha for transparency if present
            if "Alpha" in node_bsdf.inputs:
                links.new(node_tex.outputs["Alpha"], node_bsdf.inputs["Alpha"])
                mat.blend_method = "CLIP"

            # Procedural Bump / Normal generation from image luminance
            node_bump = nodes.new(type="ShaderNodeBump")
            node_bump.inputs["Strength"].default_value = normal_strength
            node_bump.inputs["Distance"].default_value = 0.1
            node_bump.location = (-50, -200)

            links.new(node_tex.outputs["Color"], node_bump.inputs["Height"])
            links.new(node_bump.outputs["Normal"], node_bsdf.inputs["Normal"])

        except Exception as e:
            print(f"[!] Warning loading image {image_path}: {e}")
            if "Base Color" in node_bsdf.inputs:
                node_bsdf.inputs["Base Color"].default_value = (0.2, 0.4, 0.8, 1.0)
    else:
        # Default military olive drab fallback color
        if "Base Color" in node_bsdf.inputs:
            node_bsdf.inputs["Base Color"].default_value = (0.28, 0.35, 0.22, 1.0)

    return mat


def update_material_properties(mat, params):
    """
    Updates existing material shader properties based on iterative feedback.
    """
    if not mat or not mat.use_nodes:
        return
    bsdf = None
    for node in mat.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            bsdf = node
            break
    if not bsdf:
        return

    if "metallic" in params and "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = float(params["metallic"])
    if "roughness" in params and "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = float(params["roughness"])
    if "normal_strength" in params:
        for node in mat.node_tree.nodes:
            if node.type == "BUMP":
                node.inputs["Strength"].default_value = float(params["normal_strength"])
    if "base_color" in params and "Base Color" in bsdf.inputs:
        bsdf.inputs["Base Color"].default_value = params["base_color"]
