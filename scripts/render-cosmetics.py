"""
The site's still pictures of Catalyst's cosmetics and pixel icons, rendered in Blender:

    blender -b --factory-startup --python scripts/render-cosmetics.py -- <job> <out.png> [size]

Jobs:
    sprite:<NAME>          a 16x16 icon from lib/sprites.ts, built from voxels (CROWN, PICKAXE, CHEST...)
    box:<model>[:<pose>]   a box model the client draws (its assets/visuals/cosmetics/<model>.json):
                           a gauntlet (gauntlet, arcane_gauntlet, ember_gauntlet; pose "fist" raises it),
                           a hat (ember_hat, on a plain head) or stoneheart_wings
    glb:<model>            a Blender-made wing model the client ships (<model>.glb), seen from behind

Models are read from the client repository next to this one (../client), sprites from lib/sprites.ts -
nothing is copied by hand. Everything is our own art: no Mojang textures. The picture is transparent
round the object, so the page decides what it stands on.

Coordinates: the client draws box models in Minecraft's model space (blocks, Y down, +Z towards the
back, +X the player's left). Here that space hangs under an empty turned -90 degrees about X, which makes
it Blender's: Z up, the player facing -Y.
"""

import bpy
import bmesh
import json
import math
import os
import re
import sys
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
CLIENT = os.path.join(os.path.dirname(SITE), "client", "src", "main", "resources", "assets", "visuals", "cosmetics")


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgba(hexstr):
    h = hexstr.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)


def argb_rgba(argb):
    return hex_rgba("#%06X" % (argb & 0xFFFFFF))


# --- scene -----------------------------------------------------------------------------------------------


def reset(size):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    try:
        scene.eevee.taa_render_samples = 96
    except AttributeError:
        pass
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.05, 0.07, 0.1, 1)
    bg.inputs[1].default_value = 0.6
    scene.world = world
    return scene


def light(kind, name, location, target, energy, colour, size=1.0):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = colour
    if kind == "AREA":
        data.size = size
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    bpy.context.scene.collection.objects.link(obj)
    direction = Vector(target) - Vector(location)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return obj


def studio(centre, radius, view):
    """
    The launcher's own studio (art/wings/wingkit.py, which renders the store's wing loops): a sun for the
    key from the camera's side and above, a cool fill from the other side and a near-white rim behind -
    neutral, so a black wing stays black and gold stays gold. Area lights scale with the object.
    """
    c = Vector(centre)
    d = Vector(view).normalized()
    up = Vector((0, 0, 1))
    right = d.cross(up).normalized()
    k = (max(radius, 0.05) / 0.7) ** 2

    def aim(obj, target):
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()

    sun = bpy.data.lights.new("Key", "SUN")
    sun.energy = 2.4
    sun.angle = math.radians(8)
    key = bpy.data.objects.new("Key", sun)
    bpy.context.scene.collection.objects.link(key)
    key.location = c + (d + up * 1.1 - right * 0.7).normalized() * 5 * radius
    aim(key, c)
    fill = light("AREA", "Fill", c + (d * 0.6 + right * 1.2 + up * 0.25).normalized() * 5 * radius, c, 120 * k, (0.75, 0.8, 1.0), size=3 * radius)
    rim = light("AREA", "Rim", c + (-d + up * 0.9).normalized() * 4.5 * radius, c, 300 * k, (0.85, 0.9, 1.0), size=3 * radius)
    return key, fill, rim


def camera(location, target, lens=50):
    data = bpy.data.cameras.new("Camera")
    data.lens = lens
    obj = bpy.data.objects.new("Camera", data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = obj
    return obj


def frame(objects, direction, lens=50, fill=0.82):
    """A camera looking along -[direction] at the objects' bounds, far enough back that they fill [fill]."""
    bpy.context.view_layer.update()
    points = [o.matrix_world @ Vector(c) for o in objects if o.type == "MESH" for c in o.bound_box]
    lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    centre = (lo + hi) / 2
    radius = (hi - lo).length / 2
    d = Vector(direction).normalized()
    fov = 2 * math.atan(36 / (2 * lens))
    distance = radius / math.sin(fov / 2) / fill
    cam = camera(centre + d * distance, centre, lens)
    return d, centre, radius


# --- materials ---------------------------------------------------------------------------------------------


def vertex_colour_material(name, roughness=0.55, metallic=0.0, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    attr = nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    mat.node_tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission > 0:
        mat.node_tree.links.new(attr.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


def mesh_object(name, faces, colours, material, parent=None, bevel=0.0):
    """[faces]: lists of 4 corner points; [colours]: one RGBA per face."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    layer = bm.loops.layers.float_color.new("Col")
    cache = {}

    def vert(p):
        key = (round(p[0], 5), round(p[1], 5), round(p[2], 5))
        if key not in cache:
            cache[key] = bm.verts.new(key)
        return cache[key]

    for quad, colour in zip(faces, colours):
        try:
            face = bm.faces.new([vert(p) for p in quad])
        except ValueError:
            continue
        for loop in face.loops:
            loop[layer] = colour
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    if bevel > 0:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
        mod.harden_normals = False
    for poly in mesh.polygons:
        poly.use_smooth = False
    return obj


def box_faces(x1, y1, z1, x2, y2, z2):
    """A box's six faces, each wound outwards."""
    return [
        [(x1, y1, z1), (x1, y1, z2), (x1, y2, z2), (x1, y2, z1)],
        [(x2, y1, z1), (x2, y2, z1), (x2, y2, z2), (x2, y1, z2)],
        [(x1, y1, z1), (x2, y1, z1), (x2, y1, z2), (x1, y1, z2)],
        [(x1, y2, z1), (x1, y2, z2), (x2, y2, z2), (x2, y2, z1)],
        [(x1, y1, z1), (x1, y2, z1), (x2, y2, z1), (x2, y1, z1)],
        [(x1, y1, z2), (x2, y1, z2), (x2, y2, z2), (x1, y2, z2)],
    ]


# --- sprites -----------------------------------------------------------------------------------------------


def read_sprites():
    text = open(os.path.join(SITE, "lib", "sprites.ts"), encoding="utf-8").read()
    palette = dict(re.findall(r'"(\w)": "(#[0-9A-Fa-f]{6})"', text.split("export const SPRITES")[0]))
    sprites = {}
    for name, body in re.findall(r"  (\w+): \[\n(.*?)\n  \],", text, re.S):
        sprites[name] = re.findall(r'"([^"]+)"', body)
    return palette, sprites


def build_sprite(name, depth=1.0):
    """The icon as voxels, one per pixel, a pixel deep: only the faces that show are built."""
    palette, sprites = read_sprites()
    rows = sprites[name]
    filled = {(x, y) for y, row in enumerate(rows) for x, ch in enumerate(row) if ch != "."}
    faces, colours = [], []
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == ".":
                continue
            colour = hex_rgba(palette[ch])
            X, Z = x, 15 - y  # up is +Z
            sides = box_faces(X, 0, Z, X + 1, depth, Z + 1)
            show = [
                (x - 1, y) not in filled,  # -X
                (x + 1, y) not in filled,  # +X
                True,  # front (-Y)
                True,  # back (+Y)
                (x, y + 1) not in filled,  # bottom (-Z)
                (x, y - 1) not in filled,  # top (+Z)
            ]
            for quad, visible in zip(sides, show):
                if visible:
                    faces.append(quad)
                    # The back and the bevelled sides a touch darker, as an extruded sprite is.
                    k = 1.0 if quad is sides[2] else 0.86
                    colours.append((colour[0] * k, colour[1] * k, colour[2] * k, 1.0))
    mat = vertex_colour_material("Sprite", roughness=0.42)
    obj = mesh_object(name, faces, colours, mat, bevel=0.06)
    obj.location = (-8, -depth / 2, -8)
    pivot = bpy.data.objects.new("Pivot", None)
    bpy.context.scene.collection.objects.link(pivot)
    obj.parent = pivot
    return pivot, [obj]


# --- box models (the client's gauntlets and Stoneheart Wings) ------------------------------------------------


def part_colour(spec, stone):
    if spec == "GEM":
        return stone
    if spec == "GEM+":
        return tuple(min(1.0, c + (1 - c) * 0.45) for c in stone[:3]) + (1.0,)
    return hex_rgba(spec)


def parts_of(list_, stone=None, mirror=False):
    out = []
    for p in list_:
        (a, b, c), (d, e, f) = p["from"], p["to"]
        x1, x2 = min(a, d), max(a, d)
        if mirror:
            x1, x2 = -x2, -x1
        out.append(((x1, min(b, e), min(c, f), x2, max(b, e), max(c, f)), p["color"], p.get("glow", False)))
    return out


def add_boxes(name, parts, matrix, parent, stone=(1, 1, 1, 1), metallic=0.3, roughness=0.38):
    """Boxes in model pixels, placed by [matrix] (model space, blocks), split into lit and glowing."""
    solid, glow = ([], []), ([], [])
    for (x1, y1, z1, x2, y2, z2), spec, glows in parts:
        colour = part_colour(spec, stone)
        target = glow if glows else solid
        for quad in box_faces(x1 / 16, y1 / 16, z1 / 16, x2 / 16, y2 / 16, z2 / 16):
            target[0].append([tuple(matrix @ Vector(p)) for p in quad])
            target[1].append(colour)
    made = []
    if solid[0]:
        made.append(mesh_object(name, solid[0], solid[1], vertex_colour_material("Solid", roughness=roughness, metallic=metallic), parent))
    if glow[0]:
        made.append(mesh_object(name + "Glow", glow[0], glow[1], vertex_colour_material("Glow", roughness=0.25, emission=2.2), parent))
    return made


def model_space():
    """An empty that turns the client's model space (Y down, +Z behind) into Blender's (Z up, front -Y)."""
    empty = bpy.data.objects.new("ModelSpace", None)
    bpy.context.scene.collection.objects.link(empty)
    empty.rotation_euler = (-math.pi / 2, 0, 0)
    return empty


# The "normal" skin's colours (components/three/textures.ts, makeSkinTexture("classic")): a teal T-shirt.
CLASSIC_SKIN = "#C99670"
CLASSIC_SHIRT = "#2E9FC0"


def build_gauntlet(model, fist=False):
    """The gauntlet on the arm it is made for - a player's right arm, x -3..1, y -2..10, z -2..2 pixels."""
    data = json.load(open(os.path.join(CLIENT, model + ".json"), encoding="utf-8"))
    space = model_space()
    if fist:
        # A raised fist: the arm turned over, hand up, its stones (on the back of the hand) to the camera.
        space.rotation_euler = (math.pi / 2, 0, math.radians(20))
    objects = add_boxes(model, parts_of(data["parts"]), Matrix.Identity(4), space)
    arm = [((-3, -2, -2, 1, 2, 2), CLASSIC_SHIRT, False), ((-3, 2, -2, 1, 10, 2), CLASSIC_SKIN, False)]
    faces, colours = [], []
    for (x1, y1, z1, x2, y2, z2), spec, _ in arm:
        for quad in box_faces(x1 / 16, y1 / 16, z1 / 16, x2 / 16, y2 / 16, z2 / 16):
            faces.append(quad)
            colours.append(hex_rgba(spec))
    objects.append(mesh_object("Arm", faces, colours, vertex_colour_material("Skin", roughness=0.8), space))
    return space, objects


def build_hat(model):
    """A hat (Hat.java) on a plain head - our classic skin's colours - in the head's model space."""
    data = json.load(open(os.path.join(CLIENT, model + ".json"), encoding="utf-8"))
    space = model_space()
    # Leather, not metal: matte.
    objects = add_boxes(model, parts_of(data["parts"]), Matrix.Identity(4), space, metallic=0.0, roughness=0.85)
    head = [
        ((-4, -8, -4, 4, 0, 4), CLASSIC_SKIN),
        ((-4.05, -8.05, -4.05, 4.05, -6.6, 4.05), "#4A3222"),   # hair
        ((-4.05, -6.6, 2.0, 4.05, -3.2, 4.05), "#4A3222"),      # hair at the back
        ((-3.0, -4.6, -4.06, -1.0, -3.6, -4.0), "#F4F7FB"),     # eyes
        ((1.0, -4.6, -4.06, 3.0, -3.6, -4.0), "#F4F7FB"),
        ((-2.0, -4.6, -4.08, -1.0, -3.6, -4.06), "#4B6FB0"),
        ((1.0, -4.6, -4.08, 2.0, -3.6, -4.06), "#4B6FB0"),
    ]
    faces, colours = [], []
    for (x1, y1, z1, x2, y2, z2), spec in head:
        for quad in box_faces(x1 / 16, y1 / 16, z1 / 16, x2 / 16, y2 / 16, z2 / 16):
            faces.append(quad)
            colours.append(hex_rgba(spec))
    objects.append(mesh_object("Head", faces, colours, vertex_colour_material("Skin", roughness=0.8), space))
    return space, objects


def build_stone_wings(model="stoneheart_wings"):
    """StoneWings.java at rest, standing still: each side swung back by its idle, blades at their angles."""
    data = json.load(open(os.path.join(CLIENT, model + ".json"), encoding="utf-8"))
    space = model_space()
    base = Matrix.Translation((0, 0.2, 0.16)) @ Matrix.Scale(1.3, 4)
    objects = add_boxes("Spine", parts_of(data["spine"]), base, space)
    sweep = math.radians(12)  # WingPose standing: open 12, beat 0 at this instant
    stones = data.get("plateStones", ["#FFFFFF", "#FFFFFF"])
    for side in (1, -1):
        turn = base @ Matrix.Rotation(-side * sweep, 4, "Y")
        plate_stone = hex_rgba(stones[0 if side == 1 else 1])
        objects += add_boxes("Plate", parts_of(data.get("plate", []), mirror=side == -1), turn, space, plate_stone)
        for i, blade in enumerate(data["blades"]):
            tilt = blade["angle"]
            m = turn @ Matrix.Translation((side * blade["rootX"] / 16, blade.get("rootY", 0) / 16, 0)) @ Matrix.Rotation(
                math.radians(-side * tilt), 4, "Z"
            )
            stone = hex_rgba(blade["stones"][0 if side == 1 else 1])
            objects += add_boxes("Blade%d" % i, parts_of(blade["parts"], mirror=side == -1), m, space, stone)
    return space, objects


def build_glb(model):
    bpy.ops.import_scene.gltf(filepath=os.path.join(CLIENT, model + ".glb"))
    objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in objects:
        # The colours are the mesh's vertex colours (glTF COLOR_0): wire them into the base colour.
        colour_layer = o.data.color_attributes[0].name if o.data.color_attributes else None
        for slot in o.material_slots:
            if not (slot.material and slot.material.node_tree and colour_layer):
                continue
            tree = slot.material.node_tree
            bsdf = next((n for n in tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if bsdf:
                attr = tree.nodes.new("ShaderNodeVertexColor")
                attr.layer_name = colour_layer
                tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
                bsdf.inputs["Roughness"].default_value = 0.6
                # Dark feathers under coloured rims read as the rims' colour if they shine; they hardly do.
                for socket in ("Specular IOR Level", "Specular"):
                    if socket in bsdf.inputs:
                        bsdf.inputs[socket].default_value = 0.15
    # The wings sway back a little at rest, as in game (ModelWingsFeatureRenderer's resting rake).
    for o in bpy.context.scene.objects:
        if o.name.startswith("Wing.L"):
            o.rotation_euler.z += 0.3
        elif o.name.startswith("Wing.R"):
            o.rotation_euler.z -= 0.3
    return None, objects


# --- jobs --------------------------------------------------------------------------------------------------


def main():
    args = sys.argv[sys.argv.index("--") + 1 :]
    job, out = args[0], os.path.abspath(args[1])
    size = int(args[2]) if len(args) > 2 else 1024
    reset(size)
    kind, _, rest = job.partition(":")
    name, _, pose = rest.partition(":")

    if kind == "sprite":
        pivot, objects = build_sprite(name)
        # Held the way Minecraft shows an item: tipped corner to corner, turned towards the light.
        pivot.rotation_euler = (math.radians(12), math.radians(-28), math.radians(-35))
        view, centre, radius = frame(objects, (0.35, -1.0, 0.25), lens=70, fill=0.92)
    elif kind == "box" and name.endswith("hat"):
        _, objects = build_hat(name)
        # From the front and a little to the side and above, so the band's stone and the plume both show.
        view, centre, radius = frame(objects, (0.55, -1.0, 0.45), lens=60, fill=0.9)
    elif kind == "box" and name.endswith("wings"):
        _, objects = build_stone_wings(name)
        view, centre, radius = frame(objects, (0.55, 1.0, 0.25), lens=60, fill=0.9)
    elif kind == "box":
        _, objects = build_gauntlet(name, fist=pose == "fist")
        view, centre, radius = frame(objects, (-0.7, -1.0, 0.35) if pose == "fist" else (-0.9, -1.0, 0.3), lens=60, fill=0.88)
    elif kind == "glb":
        _, objects = build_glb(name)
        view, centre, radius = frame(objects, (0.5, 1.0, 0.22), lens=60, fill=0.92)
    else:
        raise SystemExit("unknown job " + job)

    studio(centre, radius, view)
    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("WROTE", out)


main()
