function importFBXModel(fbxModel,dataUrl) {
    // First, analyze the model's original size
    const originalBox = new THREE.Box3().setFromObject(fbxModel);
    const originalSize = new THREE.Vector3();
    originalBox.getSize(originalSize);
    
    console.log("Original model size:", originalSize);
    
    // Calculate a reasonable scale based on the model's original size
    const maxDimension = Math.max(originalSize.x, originalSize.y, originalSize.z);
    let modelScale = 0.001;
    // Apply the calculated scale
    fbxModel.scale.set(modelScale, modelScale, modelScale);
    
    // Apply standard material with lighting disabled but shadows enabled
    fbxModel.traverse(function(child) {
        if (child.isMesh) {
            if (child.geometry) {
                child.geometry.computeVertexNormals();
            }
            
            // Use MeshLambertMaterial for shadow support, but prevent it from appearing illuminated
            child.material = new THREE.MeshLambertMaterial({
                color: selectedColor,
                emissive: 0x000000,        // No emission
                emissiveIntensity: 0,      // No emissive effect
                side: THREE.DoubleSide
            });
            
            // Override the material's normal render behavior
            // This makes it ignore lighting while still participating in shadow mapping
            child.material.onBeforeCompile = function(shader) {
                // Modify the fragment shader to ignore lighting calculations but keep the material color
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <lights_lambert_fragment>',
                    'vec3 totalDiffuse = diffuse;' // Use the material's diffuse color instead of white
                );
            };
            
            // Ensure shadow properties are set
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    // Get mass from input (in grams, convert to kg)
    const massInGrams = parseFloat(document.getElementById('mass-input').value);
    const mass = massInGrams * 0.001;
    
    // Position in front of the camera
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    cameraDirection.multiplyScalar(10);
    
    const position = camera.position.clone().add(cameraDirection);
    position.y = 10;
    position.x = 0;
    position.z = 0;
    fbxModel.position.copy(position);
    
    // Add the model to the scene
    scene.add(fbxModel);
    
    // Force scene update 
    fbxModel.updateMatrixWorld(true);
    
    // Get the model name
    const modelName = prompt("爲此模型命名（別給我亂取名字，以後要用啊）", "FBX Model");
    
    // Calculate improved center of gravity and bounding box
    const { centerOfGravity, size, meshVolumes } = calculateCenterOfGravity(fbxModel);
    
    console.log("Center of gravity:", centerOfGravity);
    console.log("Model size:", size);
    console.log("Mesh volumes:", meshVolumes);
    
    // *** Important change: Reposition the model so its origin is at the center of gravity ***
    // First, store the original world position
    const originalWorldPosition = fbxModel.position.clone();
    
    // Calculate the offset from the current model position to the COG in local space
    const cogOffset = centerOfGravity.clone().sub(fbxModel.position);
    
    // Create a parent object at the original position
    const container = new THREE.Object3D();
    container.position.copy(originalWorldPosition);
    scene.add(container);
    
    // Remove model from scene and add to container
    scene.remove(fbxModel);
    container.add(fbxModel);
    
    // Position the model so its center of gravity is at the origin of the container
    fbxModel.position.copy(cogOffset.clone().multiplyScalar(-1));
    
    // Now container.position is effectively the center of gravity in world space
    // and all rotations will happen around this point
    
    // Create a visible bounding box and center of gravity indicator
    const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const boxMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const boxHelper = new THREE.Mesh(boxGeometry, boxMaterial);
    boxHelper.position.copy(new THREE.Vector3(0, 0, 0)); // At the center (container origin)
    container.add(boxHelper);
    
    // Add a sphere to show the center of gravity
    const cogSphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const cogSphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cogSphere = new THREE.Mesh(cogSphereGeometry, cogSphereMaterial);
    cogSphere.position.copy(new THREE.Vector3(0, 0, 0)); // At the center (container origin)
    container.add(cogSphere);
    
    // Set timeout to remove visual helpers
    setTimeout(() => {
        container.remove(boxHelper);
        container.remove(cogSphere);
    }, 10000);
    
    // Assign an id to this object
    const objectId = objectIdCounter++;
    
    // Create physics body with improved center of gravity
    const halfExtents = size.clone().multiplyScalar(0.5);
    const boxShape = new CANNON.Box(new CANNON.Vec3(
        halfExtents.x, 
        halfExtents.y, 
        halfExtents.z
    ));
    
    const body = new CANNON.Body({ mass: mass });
    
    // No offset needed since the container position is already at the COG
    body.addShape(boxShape);
    body.position.copy(container.position);
    body.quaternion.copy(container.quaternion);
    
    // Add to world
    world.addBody(body);
    
    // Set user data for container
    container.userData.id = objectId;
    container.userData.type = 'fbx';
    container.userData.mass = mass;
    container.userData.color = selectedColor;
    container.userData.isFixed = false;
    container.userData.name = modelName || "FBX Model";
    container.userData.scale = { 
        x: modelScale, 
        y: modelScale, 
        z: modelScale 
    };
    container.userData.filePath = dataUrl
    // Store dimensions
    container.userData.width = size.x;
    container.userData.height = size.y;
    container.userData.length = size.z;
    
    // Store center of gravity
    container.userData.centerOfGravity = new THREE.Vector3(0, 0, 0); // Now at the origin
    
    // Set body user data
    body.userData = { id: objectId, type: 'fbx' ,uuid: container.uuid};
    
    // Store initial position
    initialPositions.push({
        id: objectId,
        position: container.position.clone(),
        quaternion: container.quaternion.clone()
    });
    
    // Store mesh and body
    meshes.push(container);
    bodies.push(body);
    
    // Add to object list
    addObjectToList(objectId, container.userData.name, selectedColor);
    
    // Update object count
    updateObjectCount();
    
    // Select the new object
    selectObject(container);
    
    // Focus camera on the model
    controls.target.copy(container.position);
    controls.update();
    
    showToast("Model imported with center of gravity at the object's origin (green dot)");
    
    return { mesh: container, body: body };
}

// Function to calculate a more accurate center of gravity for complex models
function calculateCenterOfGravity(object) {
    let totalVolume = 0;
    const weightedCenter = new THREE.Vector3(0, 0, 0);
    const meshVolumes = [];
    
    // Get the overall bounding box for reference
    const overallBox = new THREE.Box3().setFromObject(object);
    const overallSize = new THREE.Vector3();
    overallBox.getSize(overallSize);
    
    // Process each mesh in the model
    object.traverse(function(child) {
        if (child.isMesh && child.geometry) {
            // Calculate volume and center for this mesh
            const { volume, center } = calculateMeshVolumeAndCenter(child);
            
            // Skip negligible or invalid volumes
            if (volume > 0.0001) {
                // Add to weighted sum
                weightedCenter.x += center.x * volume;
                weightedCenter.y += center.y * volume;
                weightedCenter.z += center.z * volume;
                
                totalVolume += volume;
                
                // Save for debugging
                meshVolumes.push({
                    name: child.name || "unnamed mesh",
                    volume: volume,
                    center: center.clone()
                });
            }
        }
    });
    
    // If we couldn't calculate a valid center (no significant volumes found)
    if (totalVolume < 0.0001) {
        console.warn("Could not calculate accurate center of gravity, using bounding box center");
        const center = new THREE.Vector3();
        overallBox.getCenter(center);
        return { 
            centerOfGravity: center, 
            size: overallSize,
            meshVolumes: []
        };
    }
    
    // Divide by total volume to get weighted average
    weightedCenter.divideScalar(totalVolume);
    
    return {
        centerOfGravity: weightedCenter,
        size: overallSize,
        meshVolumes: meshVolumes
    };
}

// Calculate volume and center of a single mesh
function calculateMeshVolumeAndCenter(mesh) {
    // Get mesh in world space
    mesh.updateMatrixWorld(true);
    
    let geometry = mesh.geometry;
    
    // If we need to account for geometry transforms
    if (geometry.index !== null || geometry.attributes.position.count > 0) {
        // Clone the geometry to avoid modifying the original
        geometry = geometry.clone();
        
        // Apply mesh transformations to geometry
        geometry.applyMatrix4(mesh.matrixWorld);
    }
    
    // Initialize variables
    let volume = 0;
    const center = new THREE.Vector3();
    
    // Process geometry based on type
    if (geometry.index !== null) {
        // Indexed geometry
        const position = geometry.attributes.position;
        const index = geometry.index;
        
        // Calculate volume and center from triangles
        for (let i = 0; i < index.count; i += 3) {
            const a = new THREE.Vector3().fromBufferAttribute(position, index.getX(i));
            const b = new THREE.Vector3().fromBufferAttribute(position, index.getX(i + 1));
            const c = new THREE.Vector3().fromBufferAttribute(position, index.getX(i + 2));
            
            // Calculate tetrahedron volume (triangle × height / 3)
            const triangleVolume = calculateTetrahedronVolume(a, b, c);
            volume += triangleVolume;
            
            // Weight center by triangle volume
            const triangleCenter = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
            center.add(triangleCenter.multiplyScalar(triangleVolume));
        }
    } else {
        // Non-indexed geometry
        const position = geometry.attributes.position;
        
        for (let i = 0; i < position.count; i += 3) {
            const a = new THREE.Vector3().fromBufferAttribute(position, i);
            const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
            const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);
            
            const triangleVolume = calculateTetrahedronVolume(a, b, c);
            volume += triangleVolume;
            
            const triangleCenter = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
            center.add(triangleCenter.multiplyScalar(triangleVolume));
        }
    }
    
    // If we have a valid volume, calculate weighted center
    if (volume > 0) {
        center.divideScalar(volume);
    } else {
        // Fallback to bounding box center
        const box = new THREE.Box3().setFromObject(mesh);
        box.getCenter(center);
        
        // Estimate volume from bounding box
        const size = new THREE.Vector3();
        box.getSize(size);
        volume = size.x * size.y * size.z;
    }
    
    return { volume, center };
}

// Calculate tetrahedron volume (for a triangle with origin)
function calculateTetrahedronVolume(a, b, c) {
    // Calculate tetrahedron volume using scalar triple product
    const v321 = c.x * b.y * a.z;
    const v231 = b.x * c.y * a.z;
    const v312 = c.x * a.y * b.z;
    const v132 = a.x * c.y * b.z;
    const v213 = b.x * a.y * c.z;
    const v123 = a.x * b.y * c.z;
    
    // 1/6 of the scalar triple product
    return Math.abs((v321 - v231 - v312 + v132 + v213 - v123) / 6.0);
}

// Create a compound body made of multiple boxes that better approximates the FBX model
function createCompoundPhysicsBody(model, mass) {
    // Create a new body with the specified mass
    const body = new CANNON.Body({ mass: mass });
    
    // Create a unique material for this body
    const fbxMaterial = new CANNON.Material('fbxMaterial');
    
    // First try a detailed compound approach
    const boxes = createCompoundBoxes(model);
    
    // If we have a reasonable number of boxes, use them
    if (boxes.length > 0 && boxes.length < 10) {
        // Add each box as a shape to our body
        boxes.forEach(box => {
            const shape = new CANNON.Box(new CANNON.Vec3(
                box.halfSize.x, 
                box.halfSize.y, 
                box.halfSize.z
            ));
            
            // Assign material to the shape
            shape.material = fbxMaterial;
            
            // Add the shape with its offset
            body.addShape(shape, 
                new CANNON.Vec3(box.center.x, box.center.y, box.center.z),
                new CANNON.Quaternion()
            );
        });
        
        console.log(`Created compound physics body with ${boxes.length} box shapes`);
    } else {
        // Fallback to a single bounding box
        const box = new THREE.Box3().setFromObject(model);
        const halfExtents = new THREE.Vector3();
        box.getSize(halfExtents).multiplyScalar(0.5);
        
        const boxShape = new CANNON.Box(new CANNON.Vec3(
            halfExtents.x, 
            halfExtents.y, 
            halfExtents.z
        ));
        
        // Assign material to the shape
        boxShape.material = fbxMaterial;
        
        body.addShape(boxShape);
        console.log("Created single bounding box physics body");
    }
    
    // Set additional properties to improve collision behavior
    body.linearDamping = 0.2;      // Add some air resistance
    body.angularDamping = 0.2;     // Add some rotational damping
    body.allowSleep = true;        // Allow the body to sleep when at rest
    body.sleepSpeedLimit = 0.1;    // Speed limit below which the body is considered sleeping
    body.sleepTimeLimit = 1;       // Time in seconds that the body must be below sleep speed limit
    
    return body;
}

// Function to create multiple boxes to approximate the model
function createCompoundBoxes(model) {
    const boxes = [];
    
    // First get the overall bounding box
    const overallBox = new THREE.Box3().setFromObject(model);
    const overallSize = new THREE.Vector3();
    overallBox.getSize(overallSize);
    
    // If the model is very small, just use one box
    if (Math.max(overallSize.x, overallSize.y, overallSize.z) < 0.5) {
        const center = new THREE.Vector3();
        overallBox.getCenter(center).sub(model.position); // Make relative to model
        
        const halfSize = new THREE.Vector3();
        overallBox.getSize(halfSize).multiplyScalar(0.5);
        
        boxes.push({ center, halfSize });
        return boxes;
    }
    
    // For larger models, try to create a better approximation
    let significantMeshes = [];
    
    // Find significant parts of the model
    model.traverse((node) => {
        if (node.isMesh && node.geometry) {
            // Get bounding box for this mesh
            const meshBox = new THREE.Box3().setFromObject(node);
            const meshSize = new THREE.Vector3();
            meshBox.getSize(meshSize);
            
            // If this mesh is significant enough in size
            if (meshSize.x > 0.05 || meshSize.y > 0.05 || meshSize.z > 0.05) {
                const center = new THREE.Vector3();
                meshBox.getCenter(center).sub(model.position); // Make relative to model
                
                const halfSize = new THREE.Vector3();
                meshBox.getSize(halfSize).multiplyScalar(0.5);
                
                significantMeshes.push({ center, halfSize, volume: meshSize.x * meshSize.y * meshSize.z });
            }
        }
    });
    
    // Sort by volume (largest first)
    significantMeshes.sort((a, b) => b.volume - a.volume);
    
    // If we found enough significant parts, use them (limit to 8 for performance)
    if (significantMeshes.length > 0) {
        // Take top 8 parts by volume
        significantMeshes = significantMeshes.slice(0, 8);
        boxes.push(...significantMeshes);
    } else {
        // Fallback: divide the model into subboxes
        const divisions = 2; // Create 2x2x2 grid of boxes
        const boxSize = new THREE.Vector3(
            overallSize.x / divisions,
            overallSize.y / divisions,
            overallSize.z / divisions
        );
        
        const halfBoxSize = boxSize.clone().multiplyScalar(0.5);
        const min = new THREE.Vector3();
        overallBox.min.clone().sub(model.position); // Make relative to model
        
        // Create grid of boxes
        for (let x = 0; x < divisions; x++) {
            for (let y = 0; y < divisions; y++) {
                for (let z = 0; z < divisions; z++) {
                    const center = new THREE.Vector3(
                        min.x + boxSize.x * (x + 0.5),
                        min.y + boxSize.y * (y + 0.5),
                        min.z + boxSize.z * (z + 0.5)
                    );
                    
                    boxes.push({ center, halfSize: halfBoxSize });
                }
            }
        }
    }
    
    return boxes;
}