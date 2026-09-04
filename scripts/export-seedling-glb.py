"""Build a non-destructive, web-ready seedling GLB from PlantPot.blend.

Run inside Blender. The authoring objects remain untouched; all conversion work
is placed in WEB_EXPORT and the result is saved to a separate .blend file.
"""

from __future__ import annotations

import os
from collections import deque

import bpy
from mathutils import Vector


OUTPUT_DIR = r"C:\Users\husse\Desktop\Work\Wheat\exports\seedling"
GLB_PATH = os.path.join(OUTPUT_DIR, "WheatSeedlingGrowth.glb")
BLEND_PATH = os.path.join(OUTPUT_DIR, "WheatSeedlingGrowth-export.blend")
EXPORT_COLLECTION = "WEB_EXPORT"
FRAME_START = 1
FRAME_END = 102
FINAL_FRAME = 95


def action_fcurves(action):
    if action is None:
        return []
    curves = []
    try:
        curves.extend(action.fcurves)
    except Exception:
        pass
    try:
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    curves.extend(bag.fcurves)
    except Exception:
        pass
    return curves


def action_range(id_block, data_path=None, fallback=(1, 102)):
    animation_data = getattr(id_block, "animation_data", None)
    action = animation_data.action if animation_data else None
    points = []
    for curve in action_fcurves(action):
        if data_path is None or curve.data_path == data_path:
            points.extend(float(point.co.x) for point in curve.keyframe_points)
    return (min(points), max(points)) if points else fallback


def set_linear(action):
    for curve in action_fcurves(action):
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"


def make_simple_material(name, base_color, roughness, metallic=0.0):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    material.node_tree.nodes.clear()
    output = material.node_tree.nodes.new("ShaderNodeOutputMaterial")
    output.location = (300, 0)
    shader = material.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
    shader.location = (0, 0)
    shader.inputs["Base Color"].default_value = (*base_color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    material.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


def find_leaf_images():
    material = bpy.data.materials["Wheat_First_Leaf_Material"]
    found = {}
    for node in material.node_tree.nodes:
        if node.type != "TEX_IMAGE" or node.image is None:
            continue
        if "Albedo" in node.name:
            found["albedo"] = node.image
        elif "Roughness" in node.name:
            found["roughness"] = node.image
        elif "Normal" in node.name:
            found["normal"] = node.image
    if set(found) != {"albedo", "roughness", "normal"}:
        raise RuntimeError("Painted leaf image set is incomplete")
    return found


def make_textured_plant_material(name, images, normal_strength):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    material.node_tree.nodes.clear()
    nodes = material.node_tree.nodes
    links = material.node_tree.links

    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (520, 50)
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.location = (250, 50)
    shader.inputs["Metallic"].default_value = 0.0
    shader.inputs["Roughness"].default_value = 0.58
    if shader.inputs.get("IOR"):
        shader.inputs["IOR"].default_value = 1.42
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])

    albedo = nodes.new("ShaderNodeTexImage")
    albedo.name = "Base Color"
    albedo.image = images["albedo"]
    albedo.location = (-350, 250)
    links.new(albedo.outputs["Color"], shader.inputs["Base Color"])

    roughness = nodes.new("ShaderNodeTexImage")
    roughness.name = "Roughness"
    roughness.image = images["roughness"]
    roughness.location = (-350, 20)
    links.new(roughness.outputs["Color"], shader.inputs["Roughness"])

    normal_texture = nodes.new("ShaderNodeTexImage")
    normal_texture.name = "Normal"
    normal_texture.image = images["normal"]
    normal_texture.location = (-350, -220)
    normal = nodes.new("ShaderNodeNormalMap")
    normal.location = (-50, -190)
    normal.inputs["Strength"].default_value = normal_strength
    links.new(normal_texture.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], shader.inputs["Normal"])
    return material


def make_kernel_material():
    source = bpy.data.materials.get("Material.002")
    if source is None:
        return make_simple_material("WEB_Kernel", (0.62, 0.35, 0.12), 0.48)
    material = source.copy()
    material.name = "WEB_Kernel_PBR"
    shader = next((node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    if shader:
        for link in list(material.node_tree.links):
            if link.to_node == shader and link.to_socket.name == "Metallic":
                material.node_tree.links.remove(link)
        shader.inputs["Metallic"].default_value = 0.0
    return material


def evaluated_mesh(source, scene, frame, decimate_ratio=None):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    temporary = None
    target = source
    if decimate_ratio is not None:
        temporary = source.copy()
        temporary.data = source.data.copy()
        temporary.name = f"__TEMP_{source.name}"
        scene.collection.objects.link(temporary)
        modifier = temporary.modifiers.new("Web_Decimate", "DECIMATE")
        modifier.ratio = decimate_ratio
        modifier.use_collapse_triangulate = True
        target = temporary
        bpy.context.view_layer.update()
        depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = target.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph, preserve_all_data_layers=True)
    mesh.name = f"{source.name}_WEB_Mesh"
    if temporary is not None:
        bpy.data.objects.remove(temporary, do_unlink=True)
    return mesh


def connected_components(mesh):
    neighbors = [[] for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        neighbors[a].append(b)
        neighbors[b].append(a)
    unseen = set(range(len(mesh.vertices)))
    components = []
    while unseen:
        start = unseen.pop()
        component = [start]
        queue = deque([start])
        while queue:
            current = queue.popleft()
            for neighbor in neighbors[current]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    component.append(neighbor)
                    queue.append(neighbor)
        components.append(component)
    return components


def spline_starts(curve):
    starts = []
    for spline in curve.data.splines:
        if spline.type == "BEZIER" and spline.bezier_points:
            starts.append(spline.bezier_points[0].co.copy())
        elif spline.points:
            starts.append(Vector(spline.points[0].co[:3]))
    return starts


def collapse_coordinates(mesh, starts):
    coordinates = [vertex.co.copy() for vertex in mesh.vertices]
    if not starts:
        starts = [Vector((0.0, 0.0, 0.0))]
    for component in connected_components(mesh):
        root = min(
            starts,
            key=lambda candidate: min(
                (mesh.vertices[index].co - candidate).length_squared for index in component
            ),
        )
        for index in component:
            coordinates[index] = root.copy()
    return coordinates


def assign_material(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)


def insert_shape_animation(obj, key_name, start, end):
    key = obj.data.shape_keys.key_blocks[key_name]
    key.value = 1.0
    key.keyframe_insert(data_path="value", frame=start)
    key.value = 0.0
    key.keyframe_insert(data_path="value", frame=end)
    action = obj.data.shape_keys.animation_data.action
    action.name = f"Grow_{obj.name}"
    set_linear(action)
    key.value = 0.0


def create_static_mesh(source, collection, scene, material, decimate_ratio=None):
    mesh = evaluated_mesh(source, scene, FINAL_FRAME, decimate_ratio)
    obj = bpy.data.objects.new(source.name, mesh)
    collection.objects.link(obj)
    obj.matrix_basis = source.matrix_basis.copy()
    obj.matrix_parent_inverse = source.matrix_parent_inverse.copy()
    assign_material(obj, material)
    return obj


def create_leaf(source, collection, scene, material):
    full_mesh = evaluated_mesh(source, scene, 95)
    retracted_mesh = evaluated_mesh(source, scene, 50)
    if len(full_mesh.vertices) != len(retracted_mesh.vertices):
        raise RuntimeError("Leaf modifier topology differs between growth states")
    obj = bpy.data.objects.new(source.name, full_mesh)
    collection.objects.link(obj)
    obj.matrix_basis = source.matrix_basis.copy()
    obj.matrix_parent_inverse = source.matrix_parent_inverse.copy()
    assign_material(obj, material)
    obj.shape_key_add(name="Basis")
    target = obj.shape_key_add(name="Leaf_Retracted")
    for destination, source_vertex in zip(target.data, retracted_mesh.vertices):
        destination.co = source_vertex.co
    bpy.data.meshes.remove(retracted_mesh)
    insert_shape_animation(obj, "Leaf_Retracted", 50, 95)
    obj["interaction"] = "pointer_tip_bend"
    obj["bend_axis"] = "uv_v_base_to_tip"
    return obj


def create_curve_morph(source, collection, scene, material):
    scene.frame_set(FINAL_FRAME)
    bpy.context.view_layer.update()
    full_mesh = evaluated_mesh(source, scene, FINAL_FRAME)
    obj = bpy.data.objects.new(source.name, full_mesh)
    collection.objects.link(obj)
    obj.matrix_basis = source.matrix_basis.copy()
    obj.matrix_parent_inverse = source.matrix_parent_inverse.copy()
    assign_material(obj, material)
    obj.shape_key_add(name="Basis")
    hidden = obj.shape_key_add(name="GrowHidden")
    collapsed = collapse_coordinates(full_mesh, spline_starts(source))
    for vertex, coordinate in zip(hidden.data, collapsed):
        vertex.co = coordinate
    start, end = action_range(source.data, "bevel_factor_end", (1, 75))
    insert_shape_animation(obj, "GrowHidden", start, end)
    obj["growth_start_frame"] = float(start)
    obj["growth_end_frame"] = float(end)
    obj["growth_mode"] = "morph_collapsed_to_full"
    return obj


def create_shoot(source, collection, scene, material):
    scene.frame_set(FINAL_FRAME)
    bpy.context.view_layer.update()
    upright_mesh = evaluated_mesh(source, scene, FINAL_FRAME)

    upright_key = source.data.shape_keys.key_blocks.get("Shoot_Upright")
    old_value = upright_key.value if upright_key else None
    if upright_key:
        upright_key.value = 0.0
        source.data.bevel_factor_end = 1.0
        bpy.context.view_layer.update()
    bent_mesh = evaluated_mesh(source, scene, FINAL_FRAME)
    if upright_key:
        upright_key.value = old_value
        source.data.bevel_factor_end = 1.0
        bpy.context.view_layer.update()

    if len(upright_mesh.vertices) != len(bent_mesh.vertices):
        raise RuntimeError("Shoot topology differs between curved and upright states")

    obj = bpy.data.objects.new(source.name, upright_mesh)
    collection.objects.link(obj)
    obj.matrix_basis = source.matrix_basis.copy()
    obj.matrix_parent_inverse = source.matrix_parent_inverse.copy()
    assign_material(obj, material)
    obj.shape_key_add(name="Basis")

    hidden = obj.shape_key_add(name="GrowHidden")
    collapsed = collapse_coordinates(upright_mesh, spline_starts(source))
    for vertex, coordinate in zip(hidden.data, collapsed):
        vertex.co = coordinate

    bent = obj.shape_key_add(name="Shoot_Bent")
    for vertex, source_vertex in zip(bent.data, bent_mesh.vertices):
        vertex.co = source_vertex.co
    bpy.data.meshes.remove(bent_mesh)

    hidden.value = 1.0
    hidden.keyframe_insert(data_path="value", frame=8)
    hidden.value = 0.44
    hidden.keyframe_insert(data_path="value", frame=28)
    hidden.value = 0.0
    hidden.keyframe_insert(data_path="value", frame=45)
    bent.value = 0.0
    bent.keyframe_insert(data_path="value", frame=8)
    bent.value = 0.56
    bent.keyframe_insert(data_path="value", frame=28)
    bent.value = 1.0
    bent.keyframe_insert(data_path="value", frame=45)
    bent.value = 0.0
    bent.keyframe_insert(data_path="value", frame=70)
    action = obj.data.shape_keys.animation_data.action
    action.name = "Grow_Seed_Sprout"
    set_linear(action)
    hidden.value = 0.0
    bent.value = 0.0
    obj["growth_mode"] = "morph_emerge_then_straighten"
    return obj


def sample_object_scale(source, target, scene):
    for frame in range(FRAME_START, FRAME_END + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        target.scale = source.scale.copy()
        target.keyframe_insert(data_path="scale", frame=frame)
    action = target.animation_data.action
    action.name = f"Grow_{target.name}"
    set_linear(action)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    scene = bpy.context.scene
    scene.frame_start = FRAME_START
    scene.frame_end = FRAME_END
    scene.use_preview_range = True
    scene.frame_preview_start = FRAME_START
    scene.frame_preview_end = FRAME_END

    old_collection = bpy.data.collections.get(EXPORT_COLLECTION)
    if old_collection:
        bpy.data.collections.remove(old_collection, do_unlink=True)
    export_collection = bpy.data.collections.new(EXPORT_COLLECTION)
    scene.collection.children.link(export_collection)

    images = find_leaf_images()
    materials = {
        "pot": bpy.data.materials["Material.001"].copy(),
        "soil": make_simple_material("WEB_Soil", (0.075, 0.032, 0.012), 0.88),
        "kernel": make_kernel_material(),
        "leaf": make_textured_plant_material("WEB_Leaf_PBR", images, 0.34),
        "shoot": make_textured_plant_material("WEB_Coleoptile_PBR", images, 0.18),
        "root": make_simple_material("WEB_Living_Root", (0.72, 0.60, 0.39), 0.72),
        "hair": make_simple_material("WEB_Root_Hair", (0.79, 0.70, 0.53), 0.80),
        "cap": make_simple_material("WEB_Root_Cap", (0.78, 0.65, 0.44), 0.68),
        "coleorhiza": make_simple_material("WEB_Coleorhiza", (0.34, 0.43, 0.16), 0.70),
    }
    materials["pot"].name = "WEB_Pot_PBR"

    source_names = ["Pot", "Soil_Fill", "Seed", "Seed_Sprout", "Wheat_First_Leaf"]
    source_names.extend(
        obj.name
        for obj in bpy.data.collections["Wheat_Root_System"].objects
        if not obj.hide_render
    )
    # Stable ordering keeps the parent seed available before its children.
    source_names = list(dict.fromkeys(source_names))

    root = bpy.data.objects.new("WheatSeedling_Export", None)
    export_collection.objects.link(root)
    root["animation_clip"] = "Seedling_Grow"
    root["frame_range"] = "1-102"
    root["website_leaf_interaction"] = "Apply pointer bend after morph targets"

    created = {}
    animated_scale_pairs = []
    curve_count = 0
    for name in source_names:
        source = bpy.data.objects.get(name)
        if source is None:
            continue
        if name == "Pot":
            target = create_static_mesh(source, export_collection, scene, materials["pot"])
        elif name == "Soil_Fill":
            target = create_static_mesh(source, export_collection, scene, materials["soil"], 0.16)
        elif name == "Seed":
            target = create_static_mesh(source, export_collection, scene, materials["kernel"])
        elif name == "Wheat_First_Leaf":
            target = create_leaf(source, export_collection, scene, materials["leaf"])
        elif name == "Seed_Sprout":
            target = create_shoot(source, export_collection, scene, materials["shoot"])
            curve_count += 1
        elif source.type == "CURVE":
            material = materials["hair"] if "Hairs" in name else materials["root"]
            target = create_curve_morph(source, export_collection, scene, material)
            curve_count += 1
        elif name.startswith("Wheat_Root_Cap"):
            target = create_static_mesh(source, export_collection, scene, materials["cap"])
            animated_scale_pairs.append((source, target))
        elif name == "Wheat_Coleorhiza":
            target = create_static_mesh(source, export_collection, scene, materials["coleorhiza"])
            animated_scale_pairs.append((source, target))
        else:
            continue
        created[name] = target

    # Rebuild the meaningful hierarchy and preserve local transforms.
    for source_name, target in created.items():
        source = bpy.data.objects[source_name]
        if source.parent and source.parent.name in created:
            target.parent = created[source.parent.name]
            target.matrix_parent_inverse = source.matrix_parent_inverse.copy()
            target.matrix_basis = source.matrix_basis.copy()
        else:
            world = target.matrix_world.copy()
            target.parent = root
            target.matrix_world = world

    for source, target in animated_scale_pairs:
        sample_object_scale(source, target, scene)

    scene.frame_set(FINAL_FRAME)
    bpy.context.view_layer.update()
    for obj in export_collection.objects:
        obj.select_set(False)

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    export_result = bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        collection=EXPORT_COLLECTION,
        use_selection=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_animations=True,
        export_frame_range=True,
        export_frame_step=1,
        export_force_sampling=True,
        export_animation_mode="SCENE",
        export_anim_scene_split_object=False,
        export_nla_strips_merged_animation_name="Seedling_Grow",
        export_morph=True,
        export_morph_normal=False,
        export_morph_tangent=False,
        export_morph_animation=True,
        export_optimize_animation_size=True,
        export_apply=False,
        export_yup=True,
    )
    if "FINISHED" not in export_result:
        raise RuntimeError(f"glTF export failed: {export_result}")

    mesh_objects = [obj for obj in export_collection.objects if obj.type == "MESH"]
    print(
        "WEB_EXPORT_RESULT",
        {
            "glb": GLB_PATH,
            "blend": BLEND_PATH,
            "objects": len(export_collection.objects),
            "meshes": len(mesh_objects),
            "converted_curves": curve_count,
            "vertices": sum(len(obj.data.vertices) for obj in mesh_objects),
            "polygons": sum(len(obj.data.polygons) for obj in mesh_objects),
            "glb_bytes": os.path.getsize(GLB_PATH),
        },
    )


main()
