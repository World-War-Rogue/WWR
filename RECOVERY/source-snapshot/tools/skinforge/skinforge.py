"""
Skinforge - turns a 2D image into an animated base skin.

Run headless by "Build Skin.bat"; nothing here needs a Blender window open.

    blender -b -P tools/skinforge/skinforge.py -- tools/skinforge/skins/<name>.json

What this exists to solve. The art spec asks for an orthographic camera at a
specific tilt, a specific ortho scale, transparent film, RGBA output, a fixed
frame size and a camera that must not move between frames. Every one of those
is a silent failure - get it wrong and the art still renders, it just arrives
subtly unusable, and you find out on the map. So the settings are not written
down for a person to reproduce: they are set here, and this file is the spec.

The build is config-driven so that producing a skin is editing a JSON file
rather than rebuilding a scene by hand, which is the difference between a skin
taking an afternoon and taking a week.

Two ways to get depth out of flat art, and one thing to get right first.

The thing to get right: whether the art is already drawn in perspective.

  billboard  (default) The image stands facing the camera and is pushed
             toward it along its own brightness. Use this for art that
             already looks three-dimensional - a rendered base seen from
             above at an angle. The picture arrives on screen exactly as
             drawn, and the displacement gives the light something real to
             rake across as the base moves.

  ground     The image lies flat and is displaced upward, then viewed at the
             camera's angle. Correct only for art drawn as a flat plan - a
             top-down blueprint, a painted floor. Feeding a perspective
             render through this squashes it, because it applies the camera
             angle a second time to art that already has it baked in.

Then, for either of those:

  cards      Regions of the image stand up as separate planes at different
             depths. Costs a cut-out per layer and buys real parallax: the
             towers pass in front of each other as the base breathes.

Everything renders through the same camera and the same output settings, so a
skin can start as one and be rebuilt as another without touching anything
else.
"""

import json
import math
import os
import sys

import bpy  # type: ignore  # provided by Blender, not installable by pip

# --------------------------------------------------------------------------
# The parts of the spec that are not negotiable
# --------------------------------------------------------------------------

# Tilt from straight down, in degrees. 0 is a pure top-down view and 90 is
# horizontal, so this is 30 degrees above the horizon - the angle mobile
# strategy maps use, low enough to show the front of a structure and high
# enough that a square plot still reads as a square.
CAMERA_TILT_DEG = 60.0

# The footprint is one Blender unit square at the origin. Everything else is
# expressed against that, so a config never deals in pixels.
FOOTPRINT = 1.0


def clear_scene() -> None:
    """Starts from nothing, so a rebuild cannot inherit last run's leftovers."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def build_camera(scene, cfg) -> None:
    """
    The camera, placed once and never animated.

    A camera that drifts between frames shifts the footprint, and the base
    visibly jitters on its plot. Animating the model instead is not a style
    preference - it is the only way the frames stay registered.
    """
    data = bpy.data.cameras.new('SkinCamera')
    data.type = 'ORTHO'

    width = cfg['frame']['w']
    height = cfg['frame']['h']
    aspect = height / width

    # Blender's ortho_scale spans the LARGER frame dimension. The frames are
    # taller than they are wide, so scaling to make the footprint fill the
    # width means scaling by the aspect ratio.
    data.ortho_scale = FOOTPRINT * aspect

    camera = bpy.data.objects.new('SkinCamera', data)
    scene.collection.objects.link(camera)

    tilt = math.radians(CAMERA_TILT_DEG)
    distance = 10.0
    camera.location = (0.0, -distance * math.sin(tilt), distance * math.cos(tilt))
    camera.rotation_euler = (tilt, 0.0, 0.0)

    lift = cfg.get('framing', {}).get('lift', 0.0)
    if mode_of(cfg) == 'billboard':
        # The billboard already fills the frame, headroom included, because the
        # source image was authored with the footprint on its bottom edge.
        # Shifting here would move art that is already framed.
        data.shift_y = -lift
    else:
        # Slide the camera along its own up axis so the footprint sits on the
        # bottom edge of the frame and the headroom is all above it, which is
        # what the game's `overhang` expects.
        data.shift_y = -(aspect - 1.0) / 2.0 / aspect - lift

    scene.camera = camera


def mode_of(cfg) -> str:
    """Billboard unless told otherwise - most source art is already in perspective."""
    return cfg.get('mode', 'billboard')


def build_lighting(scene, cfg) -> None:
    """
    A key sun, a fill, and a dim world.

    Deliberately plain. The look of a skin should come from its art, and a
    lighting rig that flatters one image tends to ruin the next.
    """
    light = cfg.get('light', {})

    sun_data = bpy.data.lights.new('Key', type='SUN')
    sun_data.energy = light.get('key_energy', 4.0)
    sun_data.angle = math.radians(light.get('key_softness', 12.0))
    sun = bpy.data.objects.new('Key', sun_data)
    sun.rotation_euler = (
        math.radians(light.get('key_tilt', 48.0)),
        0.0,
        math.radians(light.get('key_turn', -38.0)),
    )
    scene.collection.objects.link(sun)

    fill_data = bpy.data.lights.new('Fill', type='SUN')
    fill_data.energy = light.get('fill_energy', 1.2)
    fill = bpy.data.objects.new('Fill', fill_data)
    fill.rotation_euler = (math.radians(70.0), 0.0, math.radians(150.0))
    scene.collection.objects.link(fill)

    world = bpy.data.worlds.new('World')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.30, 0.34, 0.42, 1.0)
    bg.inputs[1].default_value = light.get('ambient', 0.35)
    scene.world = world


def load_image(path: str):
    if not os.path.exists(path):
        raise SystemExit(
            f"Source image not found: {path}\n"
            "Put a cut-out PNG of the base - transparent background, no card, "
            "no text - in tools/skinforge/art/ and name it in the config."
        )
    return bpy.data.images.load(path)


def image_material(name: str, image, emissive_from_brightness: float):
    """
    An image on a surface, lit normally, with its bright areas glowing.

    Driving emission from the image's own brightness is what makes lanterns,
    windows and rim light in a flat render behave like light sources once it is
    on a moving surface. It is the cheapest trick here and the most convincing.
    """
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.blend_method = 'BLEND'
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.interpolation = 'Cubic'

    links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    bsdf.inputs['Roughness'].default_value = 0.55

    if emissive_from_brightness > 0.0:
        # Only the top of the value range emits, so a light-coloured wall does
        # not glow but a lantern does.
        ramp = nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position = 0.62
        ramp.color_ramp.elements[1].position = 0.95
        links.new(tex.outputs['Color'], ramp.inputs['Fac'])

        mix = nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.inputs['A'].default_value = (0, 0, 0, 1)
        links.new(ramp.outputs['Color'], mix.inputs['Factor'])
        links.new(tex.outputs['Color'], mix.inputs['B'])
        links.new(mix.outputs['Result'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = emissive_from_brightness

    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


def build_relief(scene, cfg, image):
    """
    The image as a displaced surface.

    In billboard mode the surface faces the camera and is pushed toward it, so
    the render arrives looking exactly like the source and the displacement
    only gives the light something real to move across. In ground mode it lies
    flat and is pushed upward, which is right for a plan drawing and wrong for
    anything already drawn in perspective.

    Subdivision is what the relief is made of, so it is generous - at 512px
    output the mesh is far cheaper than the render.
    """
    relief = cfg.get('relief', {})
    aspect = cfg['frame']['h'] / cfg['frame']['w']

    bpy.ops.mesh.primitive_plane_add(size=FOOTPRINT, location=(0, 0, 0))
    plane = bpy.context.active_object
    plane.name = 'Base'

    if mode_of(cfg) == 'billboard':
        # Turned to face the camera, and stretched to the frame's proportions
        # so the source image maps to the output one pixel for one pixel.
        plane.rotation_euler = (math.radians(CAMERA_TILT_DEG), 0.0, 0.0)
        plane.scale = (1.0, aspect, 1.0)

    modifier = plane.modifiers.new('Subdivide', 'SUBSURF')
    modifier.subdivision_type = 'SIMPLE'
    modifier.levels = relief.get('subdivisions', 6)
    modifier.render_levels = relief.get('subdivisions', 6)

    texture = bpy.data.textures.new('Height', type='IMAGE')
    texture.image = image
    displace = plane.modifiers.new('Relief', 'DISPLACE')
    displace.texture = texture
    displace.texture_coords = 'UV'
    displace.strength = relief.get('height', 0.32)
    displace.mid_level = relief.get('mid_level', 0.15)

    plane.data.materials.append(
        image_material('BaseArt', image, cfg.get('emission', 2.4)),
    )
    return plane


def build_cards(scene, cfg):
    """
    Layers standing at different depths.

    Each layer is its own cut-out PNG. The z offset is what buys parallax; the
    lean puts a layer between fully upright and flat on the ground, so a wall
    can stand while its shadow stays down.
    """
    parent = bpy.data.objects.new('Base', None)
    scene.collection.objects.link(parent)

    for index, layer in enumerate(cfg['cards']):
        path = os.path.join(os.path.dirname(cfg['__path__']), layer['image'])
        image = load_image(path)

        bpy.ops.mesh.primitive_plane_add(size=FOOTPRINT, location=(0, 0, 0))
        card = bpy.context.active_object
        card.name = layer.get('name', f'Layer{index}')
        card.rotation_euler = (math.radians(90.0 - layer.get('lean', 0.0)), 0.0, 0.0)
        card.location = (
            layer.get('x', 0.0),
            layer.get('y', 0.0) - index * 0.001,  # break coplanar z-fighting
            layer.get('z', 0.0),
        )
        card.scale = (layer.get('scale', 1.0),) * 3
        card.data.materials.append(
            image_material(
                f'Card{index}',
                image,
                layer.get('emission', cfg.get('emission', 2.4)),
            ),
        )
        card.parent = parent

    return parent


def configure_output(scene, cfg, out_dir: str) -> None:
    """
    The output settings the game requires, set rather than documented.

    Film transparency and RGBA are the two that fail silently: without them the
    render is technically fine and arrives with an opaque sky behind every
    base, which is only obvious once it is sitting on the map next to a
    neighbour.
    """
    frame = cfg['frame']
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.render.resolution_x = frame['w']
    scene.render.resolution_y = frame['h']
    scene.render.resolution_percentage = 100
    scene.render.fps = frame.get('fps', 12)
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.render.filepath = os.path.join(out_dir, f"{cfg['id']}_")

    if hasattr(scene.eevee, 'taa_render_samples'):
        scene.eevee.taa_render_samples = cfg.get('samples', 64)


def pose(subject, cfg, frame_index: int, frame_count: int) -> None:
    """
    Where the subject is on this frame.

    Poses are evaluated per frame rather than keyframed because the loop has to
    close exactly: frame_count maps to a full turn of the sine, so the last
    frame flows into the first with no visible cut. A keyframed curve with an
    eased end would stutter once a second, forever.
    """
    motion = cfg.get('motion', {})
    turn = (frame_index / frame_count) * math.tau

    bob = motion.get('bob', 0.0)
    sway = motion.get('sway', 0.0)
    spin = motion.get('spin', 0.0)

    subject.location.z = math.sin(turn) * bob
    subject.rotation_euler.y = math.sin(turn) * math.radians(sway)
    subject.rotation_euler.z = turn * spin


def main() -> None:
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if not args:
        raise SystemExit('Usage: blender -b -P skinforge.py -- <config.json>')

    config_path = os.path.abspath(args[0])
    with open(config_path, encoding='utf-8') as handle:
        cfg = json.load(handle)
    cfg['__path__'] = config_path

    here = os.path.dirname(config_path)
    out_dir = os.path.abspath(
        os.path.join(here, '..', 'out', cfg['id'], 'frames'),
    )
    os.makedirs(out_dir, exist_ok=True)

    clear_scene()
    scene = bpy.context.scene

    build_camera(scene, cfg)
    build_lighting(scene, cfg)
    configure_output(scene, cfg, out_dir)

    if cfg.get('cards'):
        subject = build_cards(scene, cfg)
    else:
        source = os.path.join(here, cfg['source'])
        subject = build_relief(scene, cfg, load_image(source))

    frame_count = cfg['frame'].get('frames', 24)
    for index in range(frame_count):
        pose(subject, cfg, index, frame_count)
        scene.frame_set(index + 1)
        scene.render.filepath = os.path.join(out_dir, f"{cfg['id']}_{index + 1:04d}")
        bpy.ops.render.render(write_still=True)

    # The exact block to paste into src/live/skins.ts, so the number that has
    # to match the frame proportions is computed rather than remembered.
    frame = cfg['frame']
    cols = cfg.get('cols', 6)
    manifest = {
        'src': f"/skins/{cfg['id']}.webp",
        'frames': frame_count,
        'cols': cols,
        'frameW': frame['w'],
        'frameH': frame['h'],
        'fps': frame.get('fps', 12),
        'overhang': round(frame['h'] / frame['w'] - 1.0, 4),
    }
    with open(
        os.path.join(out_dir, '..', 'art-block.json'), 'w', encoding='utf-8',
    ) as handle:
        json.dump(manifest, handle, indent=2)

    print(f'\nSkinforge: wrote {frame_count} frames to {out_dir}')
    print('Skinforge: art-block.json holds the entry for src/live/skins.ts')


main()
