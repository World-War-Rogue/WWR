"""
armature_rig.py - Skeletal Rigging and Procedural Motion Synthesizer for Blender SkinForge.
Builds a game-ready skeletal hierarchy and synthesizes seamless looping animation
actions (Idle, WalkCycle, CombatStance, Turntable) stored as NLA tracks for glTF/FBX export.
"""

import math
import bpy


def build_armature(name="SkinArmature", scale_height=1.0, bulk=1.0, shoulder_w=1.0):
    """
    Creates a standard humanoid skeletal armature with hierarchical bones.
    """
    bpy.ops.object.armature_add(enter_editmode=True, align='WORLD', location=(0, 0, 0))
    arm_obj = bpy.context.active_object
    arm_obj.name = name
    arm_data = arm_obj.data
    arm_data.name = f"{name}_Data"

    # Remove default single bone
    edit_bones = arm_data.edit_bones
    for b in list(edit_bones):
        edit_bones.remove(b)

    def create_bone(bone_name, head_pos, tail_pos, parent_name=None):
        bone = edit_bones.new(bone_name)
        bone.head = head_pos
        bone.tail = tail_pos
        if parent_name and parent_name in edit_bones:
            bone.parent = edit_bones[parent_name]
            bone.use_connect = False
        return bone

    # 1. Root & Hips
    create_bone("Root", (0, 0, 0), (0, 0, 0.1 * scale_height))
    create_bone("Hips", (0, 0, 0.90 * scale_height), (0, 0, 1.05 * scale_height), "Root")

    # 2. Spine & Head chain
    create_bone("Spine", (0, 0, 1.05 * scale_height), (0, 0, 1.25 * scale_height), "Hips")
    create_bone("Chest", (0, 0, 1.25 * scale_height), (0, 0, 1.55 * scale_height), "Spine")
    create_bone("Neck", (0, 0, 1.55 * scale_height), (0, 0, 1.63 * scale_height), "Chest")
    create_bone("Head", (0, 0, 1.63 * scale_height), (0, 0, 1.90 * scale_height), "Neck")

    # 3. Arms (Left & Right)
    for side, sign in [("L", 1.0), ("R", -1.0)]:
        sh_x = sign * 0.20 * bulk * shoulder_w
        arm_x = sign * (0.28 * bulk * shoulder_w + 0.04)

        create_bone(f"Shoulder.{side}", (sign * 0.06, 0, 1.52 * scale_height), (sh_x, 0, 1.52 * scale_height), "Chest")
        create_bone(f"UpperArm.{side}", (sh_x, 0, 1.48 * scale_height), (arm_x, 0, 1.22 * scale_height), f"Shoulder.{side}")
        create_bone(f"Forearm.{side}", (arm_x, 0, 1.22 * scale_height), (arm_x, 0, 0.96 * scale_height), f"UpperArm.{side}")
        create_bone(f"Hand.{side}", (arm_x, 0, 0.96 * scale_height), (arm_x, 0, 0.82 * scale_height), f"Forearm.{side}")

    # 4. Legs (Left & Right)
    for side, sign in [("L", 1.0), ("R", -1.0)]:
        leg_x = sign * 0.11 * bulk
        create_bone(f"Thigh.{side}", (leg_x, 0, 0.88 * scale_height), (leg_x, 0, 0.48 * scale_height), "Hips")
        create_bone(f"Shin.{side}", (leg_x, 0, 0.48 * scale_height), (leg_x, 0, 0.12 * scale_height), f"Thigh.{side}")
        create_bone(f"Foot.{side}", (leg_x, 0, 0.12 * scale_height), (leg_x, 0.16 * bulk, 0.0), f"Shin.{side}")

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj


def attach_mesh_to_armature(mesh_obj, arm_obj):
    """
    Parents mesh to armature using vertex groups and armature modifier.
    """
    mesh_obj.parent = arm_obj
    mod = mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = arm_obj
    mod.use_vertex_groups = True


def synthesize_animations(arm_obj):
    """
    Synthesizes game-ready animation actions (Idle, Walk, CombatReady, Turntable)
    and pushes them onto NLA tracks for seamless glTF / FBX export.
    """
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()

    pose_bones = arm_obj.pose.bones
    for pb in pose_bones:
        pb.rotation_mode = 'XYZ'

    # Helper to push action to NLA track
    def push_to_nla(action, track_name):
        track = arm_obj.animation_data.nla_tracks.new()
        track.name = track_name
        strip = track.strips.new(action.name, 1, action)
        strip.action = action

    # -------------------------------------------------------------
    # 1. Action: Idle (Breathing loop, subtle stance shift, 60 frames)
    # -------------------------------------------------------------
    act_idle = bpy.data.actions.new(name="Idle")
    arm_obj.animation_data.action = act_idle

    for frame in [1, 30, 60]:
        t = (frame - 1) / 59.0
        breath = math.sin(t * 2 * math.pi)

        # Chest expansion & slight rise
        if "Chest" in pose_bones:
            pb = pose_bones["Chest"]
            pb.rotation_euler = (math.radians(1.5 * breath), 0, 0)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Head slight horizon drift
        if "Head" in pose_bones:
            pb = pose_bones["Head"]
            pb.rotation_euler = (math.radians(-0.8 * breath), math.radians(1.2 * math.cos(t * 2 * math.pi)), 0)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Subtle arm sway
        for side, sign in [("L", 1.0), ("R", -1.0)]:
            ua = f"UpperArm.{side}"
            if ua in pose_bones:
                pb = pose_bones[ua]
                pb.rotation_euler = (math.radians(2.0 * breath), 0, math.radians(sign * 1.5 * breath))
                pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    push_to_nla(act_idle, "NLA_Idle")

    # -------------------------------------------------------------
    # 2. Action: Walk (Locomotion cycle, 32 frames)
    # -------------------------------------------------------------
    act_walk = bpy.data.actions.new(name="Walk")
    arm_obj.animation_data.action = act_walk

    frames = [1, 9, 17, 25, 33]
    for frame in frames:
        phase = (frame - 1) / 32.0 * 2 * math.pi
        leg_l = math.sin(phase)
        leg_r = -math.sin(phase)

        # Thighs swing opposite
        if "Thigh.L" in pose_bones:
            pb = pose_bones["Thigh.L"]
            pb.rotation_euler = (math.radians(24.0 * leg_l), 0, 0)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)
        if "Thigh.R" in pose_bones:
            pb = pose_bones["Thigh.R"]
            pb.rotation_euler = (math.radians(24.0 * leg_r), 0, 0)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Shins bend backwards on back-swing
        if "Shin.L" in pose_bones:
            pb = pose_bones["Shin.L"]
            bend = max(0.0, -leg_l) * 30.0
            pb.rotation_euler = (math.radians(bend), 0, 0)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)
        if "Shin.R" in pose_bones:
            pb = pose_bones["Shin.R"]
            bend = max(0.0, -leg_r) * 30.0
            pb.rotation_euler = (math.radians(bend), 0, 0)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Arms swing opposite to legs for natural gait balance
        if "UpperArm.L" in pose_bones:
            pb = pose_bones["UpperArm.L"]
            pb.rotation_euler = (math.radians(-18.0 * leg_l), 0, 0)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)
        if "UpperArm.R" in pose_bones:
            pb = pose_bones["UpperArm.R"]
            pb.rotation_euler = (math.radians(-18.0 * leg_r), 0, 0)
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Spine subtle twist
        if "Spine" in pose_bones:
            pb = pose_bones["Spine"]
            pb.rotation_euler = (0, 0, math.radians(-3.0 * leg_l))
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    push_to_nla(act_walk, "NLA_Walk")

    # -------------------------------------------------------------
    # 3. Action: CombatReady (Tactical braced stance, 40 frames)
    # -------------------------------------------------------------
    act_combat = bpy.data.actions.new(name="CombatReady")
    arm_obj.animation_data.action = act_combat

    for frame in [1, 20, 40]:
        t = (frame - 1) / 39.0
        micro_jitter = math.sin(t * 4 * math.pi) * 0.5

        # Lowered hips
        if "Hips" in pose_bones:
            pb = pose_bones["Hips"]
            pb.location = (0, -0.04, -0.05)
            pb.keyframe_insert(data_path="location", frame=frame)

        # Both arms raised into two-handed weapon grip
        if "UpperArm.R" in pose_bones:
            pb = pose_bones["UpperArm.R"]
            pb.rotation_euler = (math.radians(50.0 + micro_jitter), math.radians(-15.0), math.radians(-25.0))
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)
        if "UpperArm.L" in pose_bones:
            pb = pose_bones["UpperArm.L"]
            pb.rotation_euler = (math.radians(45.0 + micro_jitter), math.radians(20.0), math.radians(35.0))
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Torso angled slightly forward
        if "Spine" in pose_bones:
            pb = pose_bones["Spine"]
            pb.rotation_euler = (math.radians(10.0), 0, math.radians(-5.0))
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    push_to_nla(act_combat, "NLA_CombatReady")

    # -------------------------------------------------------------
    # 4. Action: Turntable (360 spin for preview & showcase, 72 frames)
    # -------------------------------------------------------------
    act_turntable = bpy.data.actions.new(name="Turntable")
    arm_obj.animation_data.action = act_turntable

    if "Root" in pose_bones:
        pb = pose_bones["Root"]
        pb.rotation_euler = (0, 0, 0)
        pb.keyframe_insert(data_path="rotation_euler", frame=1)

        pb.rotation_euler = (0, 0, math.radians(180))
        pb.keyframe_insert(data_path="rotation_euler", frame=36)

        pb.rotation_euler = (0, 0, math.radians(360))
        pb.keyframe_insert(data_path="rotation_euler", frame=72)

    push_to_nla(act_turntable, "NLA_Turntable")

    # Set active action to Idle by default
    arm_obj.animation_data.action = act_idle
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 60
