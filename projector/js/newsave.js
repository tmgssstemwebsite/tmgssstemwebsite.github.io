function exportScene() {
    // Create scene data structure
    const sceneData = {
        objects: [],
        sticks: [],
        motors: [],
        glues: [],
        dualMotors: [],
        fixedObjects: [],
        fbxModels: [],
        version: "1.1" // Add version tracking for future compatibility
    };
    
    // Collect data for each object
    meshes.forEach(mesh => {
        // Check if it's an FBX model
        if (mesh.userData.type === 'fbx') {
            console.log("Exporting FBX model:", mesh.userData.name, mesh.userData.id);
            const fbxData = {
                id: mesh.userData.id,
                type: 'fbx',
                name: mesh.userData.name || "FBX Model", // Ensure name is preserved
                position: {
                    x: mesh.position.x,
                    y: mesh.position.y,
                    z: mesh.position.z
                },
                rotation: {
                    x: mesh.quaternion.x,
                    y: mesh.quaternion.y,
                    z: mesh.quaternion.z,
                    w: mesh.quaternion.w
                },
                scale: {
                    x: mesh.scale.x,
                    y: mesh.scale.y,
                    z: mesh.scale.z
                },
                mass: mesh.userData.mass,
                color: mesh.userData.color,
                isFixed: mesh.userData.isFixed || false,
                // Include the FBX file path if available
                filePath: mesh.userData.filePath || "",
                // Store width, height, length for better body recreation
                width: mesh.userData.width,
                height: mesh.userData.height,
                length: mesh.userData.length,
                // Store center of gravity if available
                centerOfGravity: mesh.userData.centerOfGravity ? {
                    x: mesh.userData.centerOfGravity.x,
                    y: mesh.userData.centerOfGravity.y,
                    z: mesh.userData.centerOfGravity.z
                } : null
            };
            
            sceneData.fbxModels.push(fbxData);
            return; // Skip adding to objects array
        }
        
        // Regular objects handling
        let objectData = {
            id: mesh.userData.id,
            type: mesh.userData.type,
            name: mesh.userData.name || mesh.userData.type, // Ensure name is preserved
            position: {
                x: mesh.position.x,
                y: mesh.position.y,
                z: mesh.position.z
            },
            rotation: {
                x: mesh.quaternion.x,
                y: mesh.quaternion.y,
                z: mesh.quaternion.z,
                w: mesh.quaternion.w
            },
            mass: mesh.userData.mass,
            color: mesh.userData.color,
            isFixed: mesh.userData.isFixed || false
        };
        
        // Add shape-specific properties
        if (mesh.userData.type === 'box' || mesh.userData.type === 'car' || mesh.userData.type === 'dual-motor') {
            objectData.width = mesh.userData.width;
            objectData.height = mesh.userData.height;
            objectData.length = mesh.userData.length;
        } else if (mesh.userData.type === 'sphere' || mesh.userData.type === 'wheel') {
            objectData.radius = mesh.userData.radius;
            if (mesh.userData.type === 'wheel') {
                objectData.width = mesh.userData.width;
            }
        } else if (mesh.userData.type === 'cylinder' || mesh.userData.type === 'cone') {
            objectData.radius = mesh.userData.radius;
            objectData.height = mesh.userData.height;
        } else if (mesh.userData.type === 'torus') {
            objectData.radius = mesh.userData.radius;
            objectData.tubeRadius = mesh.userData.tubeRadius;
        }
        
        // Add dual motor specific data
        if (mesh.userData.isDualMotor) {
            objectData.isDualMotor = true;
            objectData.speed = mesh.userData.speed || 0;
            objectData.force = mesh.userData.force || 20;
            
            // Find the dual motor data
            const motorData = dualMotors.find(m => m.id === mesh.userData.id);
            if (motorData && motorData.connections.length > 0) {
                objectData.connections = motorData.connections.map(conn => ({
                    cubeNumber: conn.cubeNumber,
                    objectId: conn.object.userData.id
                }));
            }
        }
        
        sceneData.objects.push(objectData);
    });
    
    // Export sticks - Using userData.id instead of uuid
    sticks.forEach(stick => {
        // Safety check to ensure objects have userData.id
        if (!stick.object1.userData || !stick.object1.userData.id || 
            !stick.object2.userData || !stick.object2.userData.id) {
            console.warn("Skipping stick due to missing userData.id", stick);
            return;
        }
        
        const stickData = {
            id: stick.id,
            object1Id: stick.object1.userData.id,
            object2Id: stick.object2.userData.id,
            point1: stick.point1 ? { x: stick.point1.x, y: stick.point1.y, z: stick.point1.z } : null,
            point2: stick.point2 ? { x: stick.point2.x, y: stick.point2.y, z: stick.point2.z } : null,
            stiffness: stick.stiffness,
            isRigid: stick.isRigid
        };
        sceneData.sticks.push(stickData);
    });
    
    // Export motors
    motors.forEach(motor => {
        // Skip motors with missing object references
        if (!motor.object1 || !motor.object2 || !motor.object1.userData || !motor.object2.userData) {
            console.warn("Skipping motor due to missing object references", motor);
            return;
        }
        
        const motorData = {
            id: motor.id,
            object1Id: motor.object1.userData.id,
            object2Id: motor.object2.userData.id,
            point1: { x: motor.point1.x, y: motor.point1.y, z: motor.point1.z },
            point2: { x: motor.point2.x, y: motor.point2.y, z: motor.point2.z },
            axis: motor.axis,
            speed: motor.speed,
            force: motor.force || 10, // Default to 10 if not set
            stiffness: motor.stiffness,
            isRigid: motor.isRigid
        };
        sceneData.motors.push(motorData);
    });
    
    // Export glues
    glues.forEach(glue => {
        // Skip glues with missing object references
        if (!glue.object1 || !glue.object2 || !glue.object1.userData || !glue.object2.userData) {
            console.warn("Skipping glue due to missing object references", glue);
            return;
        }
        
        const glueData = {
            id: glue.id,
            object1Id: glue.object1.userData.id,
            object2Id: glue.object2.userData.id,
            relativePosition: { 
                x: glue.relativePosition.x, 
                y: glue.relativePosition.y, 
                z: glue.relativePosition.z 
            },
            relativeQuaternion: { 
                x: glue.relativeQuaternion.x, 
                y: glue.relativeQuaternion.y, 
                z: glue.relativeQuaternion.z, 
                w: glue.relativeQuaternion.w 
            }
        };
        sceneData.glues.push(glueData);
    });
    
    try {
        console.log("Preparing export data...");
        // Use pretty formatting (indentation of 2 spaces)
        const indentSize = 2;
        
        // Create a Blob with the JSON data - using replacer to avoid circular references
        const jsonString = JSON.stringify(sceneData, function(key, value) {
            // Skip potential circular reference objects
            if (key === 'constraint' || key === 'line' || key === 'body' || 
                key === 'bodies' || key === 'world' || key === 'physicsBody' ||
                key === 'fixedIndicator' || key === 'parent' || key === 'children') {
                return undefined;
            }
            return value;
        }, indentSize);
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create a download link with default filename
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = 'physics_scene.json';
        
        // Simulate click to trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        console.log("Export completed successfully");
        // Show toast notification
        showToast("Scene exported successfully");
    } catch (error) {
        console.error("Export error:", error);
        showToast("Error exporting scene: " + error.message, "error");
    }
}

// Improved import function
function importScene(event) {
    // Support both direct file input and event from file input
    let file;
    if (event.target && event.target.files) {
        file = event.target.files[0];
    } else if (event instanceof File) {
        file = event;
    }
    
    if (!file) {
        console.warn("No file selected for import");
        return;
    }
    
    console.log("Importing file:", file.name);
    
    // Reset object ID counter for clean import
    // Save original counter in case we need to restore it
    const originalObjectIdCounter = objectIdCounter;
    objectIdCounter = 1; // Completely reset to 1 for imported objects
    
    // Create a set to track used IDs to avoid conflicts
    const usedObjectIds = new Set();
    let localStickIdCounter = 1; // Start from 1 for imported sticks
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Parse the JSON data
            const sceneData = JSON.parse(e.target.result);
            
            // Pre-scan all object IDs from the imported data to collect them
            if (sceneData.objects) {
                sceneData.objects.forEach(obj => {
                    if (obj.id !== undefined) {
                        usedObjectIds.add(obj.id);
                    }
                });
            }
            
            if (sceneData.fbxModels) {
                sceneData.fbxModels.forEach(model => {
                    if (model.id !== undefined) {
                        usedObjectIds.add(model.id);
                    }
                });
            }
            
            console.log(`Found ${usedObjectIds.size} object IDs in imported data`);
            
            // Find highest ID to set our counter
            if (usedObjectIds.size > 0) {
                const maxId = Math.max(...usedObjectIds);
                objectIdCounter = maxId + 1;
                console.log(`Setting objectIdCounter to ${objectIdCounter} based on imported data`);
            }
            
            // Recreate all objects first
            const objectMap = new Map(); // Map old IDs to new objects
            const bodyMap = new Map();   // Map object IDs to physics bodies
            
            // Process regular objects
            if (sceneData.objects) {
                sceneData.objects.forEach(obj => {
                    try {
                        const newObject = createImportedObject(obj);
                        if (newObject) {
                            // Ensure name is preserved
                            if (obj.name) {
                                newObject.userData.name = obj.name;
                            }
                            
                            objectMap.set(obj.id, newObject);
                            
                            // Find the corresponding physics body and store it in the map
                            const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === newObject.userData.id);
                            if (bodyIndex !== -1) {
                                bodyMap.set(obj.id, bodies[bodyIndex]);
                                
                                // Store a direct reference to the body in userData for easier access
                                newObject.userData.physicsBody = bodies[bodyIndex];
                            } else {
                                console.warn("No physics body found for object", obj.id);
                            }
                            
                            // If the object is fixed, set it now
                            if (obj.isFixed) {
                                newObject.userData.isFixed = true;
                                // Find the body
                                if (bodyIndex !== -1) {
                                    // Save original mass
                                    newObject.userData.originalMass = newObject.userData.mass;
                                    
                                    // Make it static
                                    bodies[bodyIndex].mass = 0;
                                    bodies[bodyIndex].updateMassProperties();
                                    bodies[bodyIndex].type = CANNON.Body.STATIC;
                                    
                                    // Add visual indicator if function exists
                                    if (typeof createFixedIndicator === 'function') {
                                        const fixedIndicator = createFixedIndicator(newObject);
                                        newObject.userData.fixedIndicator = fixedIndicator;
                                    }
                                    
                                    // Add to tracking array
                                    if (Array.isArray(fixedObjects)) {
                                        fixedObjects.push(newObject);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Error creating object:", error, obj);
                    }
                });
            }
            
            // Process FBX models if they exist
            if (sceneData.fbxModels && sceneData.fbxModels.length > 0) {
                // Process each FBX model
                const fbxLoader = new THREE.FBXLoader();
                
                // We need to track how many FBX models we've processed
                let processedCount = 0;
                const fbxModelsCount = sceneData.fbxModels.length;
                
                const continueImport = () => {
                    // Only continue with the rest of the import when all FBX models are loaded
                    if (processedCount >= fbxModelsCount) {
                        continueWithImport();
                    }
                };
                
                // Process each FBX model
                sceneData.fbxModels.forEach(fbxData => {
                    try {
                        // If we have a file path, load from that
                        if (fbxData.filePath) {
                            fbxLoader.load(
                                fbxData.filePath,
                                function (fbxModel) {
                                    try {
                                        const newObject = processFbxModel(fbxModel, fbxData, objectMap, bodyMap);
                                        console.log(`Loaded FBX model: ${fbxData.name || "Unnamed"}`);
                                        processedCount++;
                                        continueImport();
                                    } catch (error) {
                                        console.error('Error processing FBX model:', error);
                                        processedCount++;
                                        continueImport();
                                    }
                                },
                                undefined,  // onProgress
                                function (error) {
                                    console.error('Error loading FBX model:', error);
                                    processedCount++;
                                    continueImport();
                                }
                            );
                        } else {
                            showToast("Please select the FBX file for model " + (fbxData.name || ""));
                            
                            // Create a temporary file input
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = '.fbx';
                            
                            fileInput.onchange = function(fileEvent) {
                                if (fileEvent.target.files.length > 0) {
                                    const fbxFile = fileEvent.target.files[0];
                                    console.log(`Selected file: ${fbxFile.name}`);
                                    const objectURL = URL.createObjectURL(fbxFile);
                                    
                                    fbxLoader.load(objectURL, (fbxModel) => {
                                        try {
                                            const newObject = processFbxModel(fbxModel, fbxData, objectMap, bodyMap);
                                            console.log(`Loaded FBX model: ${fbxData.name || "Unnamed"}`);
                                            URL.revokeObjectURL(objectURL);
                                            processedCount++;
                                            continueImport();
                                        } catch (error) {
                                            console.error('Error processing FBX model:', error);
                                            URL.revokeObjectURL(objectURL);
                                            processedCount++;
                                            continueImport();
                                        }
                                    }, undefined, (error) => {
                                        console.error('Error loading FBX model:', error);
                                        URL.revokeObjectURL(objectURL);
                                        processedCount++;
                                        continueImport();
                                    });
                                } else {
                                    console.log("No FBX file selected, skipping");
                                    processedCount++;
                                    continueImport();
                                }
                            };
                            fileInput.click();
                        }
                    } catch (error) {
                        console.error("Error setting up FBX loading:", error, fbxData);
                        processedCount++;
                        continueImport();
                    }
                });
                
                // If there are no FBX models to process, continue with import
                if (fbxModelsCount === 0) {
                    continueWithImport();
                }
            } else {
                // No FBX models, continue with regular import
                continueWithImport();
            }
            
            function processFbxModel(fbxModel, fbxData, objectMap, bodyMap) {
                try {
                    console.log("Processing FBX model:", fbxData.name || "Unnamed");
                    
                    // Create a group container for the FBX model instead of a mesh
                    // This is important to avoid stretching since groups don't have geometry to distort
                    const container = new THREE.Group();
                    
                    // Set position from imported data or use default position
                    if (fbxData.position && typeof fbxData.position.x === 'number') {
                        container.position.set(
                            fbxData.position.x,
                            fbxData.position.y,
                            fbxData.position.z
                        );
                    } else {
                        // Default to an easily visible position
                        container.position.set(0, 5, 0);
                    }
                    
                    // Set rotation if available
                    if (fbxData.rotation && typeof fbxData.rotation.x === 'number') {
                        container.quaternion.set(
                            fbxData.rotation.x,
                            fbxData.rotation.y,
                            fbxData.rotation.z,
                            fbxData.rotation.w
                        );
                    }
                    
                    // Add to scene
                    scene.add(container);
                    
                    // Calculate original model dimensions
                    const originalBBox = new THREE.Box3().setFromObject(fbxModel);
                    const originalSize = new THREE.Vector3();
                    originalBBox.getSize(originalSize);
                    console.log("Original model size:", originalSize);
                    
                    // Calculate original aspect ratio
                    const originalAspect = {
                        xy: originalSize.x / originalSize.y,
                        xz: originalSize.x / originalSize.z,
                        yz: originalSize.y / originalSize.z
                    };
                    console.log("Original aspect ratios:", originalAspect);
                    
                    // Get scale from fbxData if available, otherwise use 1.0
                    let modelScale = 0.001;
                    
                    // Apply UNIFORM scaling to preserve proportions
                    fbxModel.scale.set(modelScale, modelScale, modelScale);
                    
                    // Get center of model to position it at origin
                    const center = new THREE.Vector3();
                    originalBBox.getCenter(center);
                    center.multiplyScalar(modelScale); // Scale the center offset
                    
                    // Add model to container with corrected centering
                    container.add(fbxModel);
                    fbxModel.position.set(-center.x, -center.y, -center.z);
                    
                    // Update and log scaled dimensions
                    const scaledBBox = new THREE.Box3().setFromObject(container);
                    const scaledSize = new THREE.Vector3();
                    scaledBBox.getSize(scaledSize);
                    console.log("Scaled model size:", scaledSize);
                    
                    // Apply materials with proper visibility settings
                    let meshCount = 0;
                    fbxModel.traverse(function(child) {
                        if (child.isMesh) {
                            meshCount++;
                            
                            // Compute vertex normals if needed
                            if (child.geometry) {
                                child.geometry.computeVertexNormals();
                            }
                            
                            // Create a new material with good visibility properties
                            child.material = new THREE.MeshPhongMaterial({
                                color: fbxData.color || 0xff0000,
                                specular: 0x111111,
                                shininess: 30,
                                side: THREE.DoubleSide
                            });
                            
                            // Ensure visibility
                            child.visible = true;
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            console.log(`Applied material to mesh #${meshCount}: ${child.name}`);
                        }
                    });
                    
                    console.log(`FBX model contains ${meshCount} meshes`);
                    
                    // Create physics body with dimensions matching the model
                    const halfExtents = scaledSize.clone().multiplyScalar(0.5);
                    const boxShape = new CANNON.Box(new CANNON.Vec3(
                        halfExtents.x, 
                        halfExtents.y, 
                        halfExtents.z
                    ));
                    
                    const mass = fbxData.isFixed ? 0 : (typeof fbxData.mass === 'number' ? fbxData.mass : 1);
                    const body = new CANNON.Body({ mass: mass });
                    body.addShape(boxShape);
                    body.position.copy(container.position);
                    body.quaternion.copy(container.quaternion);
                    
                    // Add physics body to world
                    world.addBody(body);
                    
                    // Use the original ID from the import data, not generating a new one
                    const objectId = fbxData.id;
                    
                    // Set user data for container
                    container.userData = {
                        id: objectId,
                        type: 'fbx',
                        mass: mass,
                        color: fbxData.color || 0xff0000,
                        isFixed: fbxData.isFixed || false,
                        name: fbxData.name || "FBX Model", // Preserve name!
                        scale: { 
                            x: modelScale, 
                            y: modelScale, 
                            z: modelScale 
                        },
                        width: scaledSize.x,
                        height: scaledSize.y,
                        length: scaledSize.z,
                        filePath: fbxData.filePath || ""
                    };
                    
                    console.log("Set FBX model name:", container.userData.name);
                    
                    // Set body user data with ID reference
                    body.userData = { 
                        id: objectId, 
                        type: 'fbx',
                        uuid: container.uuid
                    };
                    
                    // Add visual debug helpers
                    
                    // 1. Box helper to show model bounds
                    const boxHelper = new THREE.BoxHelper(container, 0x00ff00);
                    scene.add(boxHelper);
                    
                    // 2. Axes helper for orientation
                    const axisSize = Math.max(scaledSize.x, scaledSize.y, scaledSize.z) * 1.2;
                    const axesHelper = new THREE.AxesHelper(axisSize);
                    container.add(axesHelper);
                    
                    // 3. Physics body wireframe visualization
                    const bodyGeometry = new THREE.BoxGeometry(
                        scaledSize.x, 
                        scaledSize.y, 
                        scaledSize.z
                    );
                    const bodyMaterial = new THREE.MeshBasicMaterial({
                        color: 0x0088ff,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.3
                    });
                    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
                    container.add(bodyMesh);
                    
                    // Store mappings and references
                    objectMap.set(objectId, container);
                    bodyMap.set(objectId, body);
                    
                    // Store initial position if the array exists
                    if (Array.isArray(initialPositions)) {
                        initialPositions.push({
                            id: objectId,
                            position: container.position.clone(),
                            quaternion: container.quaternion.clone()
                        });
                    }
                    
                    // Store mesh and body
                    meshes.push(container);
                    bodies.push(body);
                    
                    // Add to object list if function exists
                    if (typeof addObjectToList === 'function') {
                        addObjectToList(objectId, container.userData.name, fbxData.color || 0xff0000);
                    }
                    
                    // Add fixed indicator if needed
                    if (fbxData.isFixed) {
                        container.userData.originalMass = container.userData.mass;
                        if (typeof createFixedIndicator === 'function') {
                            const fixedIndicator = createFixedIndicator(container);
                            container.userData.fixedIndicator = fixedIndicator;
                        }
                        
                        if (Array.isArray(fixedObjects)) {
                            fixedObjects.push(container);
                        }
                    }
                    
                    // Remove debug visualizations after 8 seconds
                    setTimeout(() => {
                        try {
                            scene.remove(boxHelper);
                            container.remove(axesHelper);
                            container.remove(bodyMesh);
                        } catch (error) {
                            console.warn("Error removing debug helpers:", error);
                        }
                    }, 8000);
                    
                    console.log("FBX model processing complete:", container);
                    return container;
                    
                } catch (err) {
                    console.error("Error processing FBX model:", err);
                    console.log("Failed data:", fbxData);
                    throw err;
                }
            }
            
            function continueWithImport() {
                // Update object list to show fixed status
                if (typeof updateObjectList === 'function') {
                    updateObjectList();
                }
                
                // Helper function to find a physics body from the object's ID
                function findBodyForObject(objId) {
                    // Check the bodyMap first
                    if (bodyMap.has(objId)) {
                        return bodyMap.get(objId);
                    }
                    
                    // Fallback to searching bodies array
                    const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === objId);
                    if (bodyIndex !== -1) {
                        const body = bodies[bodyIndex];
                        // Cache it for future lookups
                        bodyMap.set(objId, body);
                        return body;
                    }
                    
                    return null;
                }
                
                // Safely add to connections list if the function exists
                function safeAddToConnectionsList(id, type, obj1Id, obj2Id) {
                    // Check if the function exists in the global scope
                    if (typeof addToConnectionsList === 'function') {
                        try {
                            addToConnectionsList(id, type, obj1Id, obj2Id);
                        } catch (error) {
                            console.warn("Error adding to connections list:", error);
                        }
                    } else {
                        console.log(`Connection created: ${type} ${id} between ${obj1Id} and ${obj2Id}`);
                    }
                }
                
                // Reset stick ID counter for import
                if (typeof stickIdCounter !== 'undefined') {
                    // Save original value
                    const originalStickIdCounter = stickIdCounter;
                    stickIdCounter = 1;
                    
                    // Find max stick ID from imported data
                    let maxStickId = 0;
                    if (sceneData.sticks) {
                        sceneData.sticks.forEach(stick => {
                            if (stick.id) {
                                // Extract numeric part if it's in form 'stick_123'
                                const matches = stick.id.match(/\d+$/);
                                if (matches) {
                                    const numericId = parseInt(matches[0]);
                                    maxStickId = Math.max(maxStickId, numericId);
                                }
                            }
                        });
                    }
                    
                    // Set counter to max + 1
                    if (maxStickId > 0) {
                        stickIdCounter = maxStickId + 1;
                    }
                }
                
                // Define a custom stick creation function for import with better robustness
                function createImportedStick(object1, object2, point1, point2, isRigid, stiffness) {
                    console.log("Creating imported stick between:", object1.userData.id, object2.userData.id);
                    
                    try {
                        // Find or get physics bodies
                        const body1 = object1.userData.physicsBody || findBodyForObject(object1.userData.id);
                        const body2 = object2.userData.physicsBody || findBodyForObject(object2.userData.id);
                        
                        if (!body1 || !body2) {
                            console.error("Missing physics bodies for stick creation:", 
                                object1.userData.id, object2.userData.id);
                            return null;
                        }
                        
                        // Create constraint between bodies directly
                        const options = {
                            pivotA: point1 ? new CANNON.Vec3(point1.x, point1.y, point1.z) : new CANNON.Vec3(),
                            pivotB: point2 ? new CANNON.Vec3(point2.x, point2.y, point2.z) : new CANNON.Vec3(),
                             // Use provided stiffness or default
                        };
                        
                        // Choose constraint type based on whether it's rigid
                        let constraint;
                        constraint = new CANNON.PointToPointConstraint(body1, options.pivotA, body2, options.pivotB, 1000);
                        
                        // Add constraint to world
                        world.addConstraint(constraint);
                        
                        // Create visual representation (line)
                        const material = new THREE.LineBasicMaterial({ 
                            color: 0xffffff,
                            opacity: 0.75,
                            transparent: true,
                            linewidth: 2
                        });
                        
                        // Initialize points for the line - will be updated in the animation loop
                        const worldPos1 = new THREE.Vector3();
                        const worldPos2 = new THREE.Vector3();
                        
                        // Calculate world positions for the connection points
                        const localPos1 = new THREE.Vector3(point1.x, point1.y, point1.z);
                        const localPos2 = new THREE.Vector3(point2.x, point2.y, point2.z);
                        
                        // Transform local points to world space
                        object1.localToWorld(localPos1.clone());
                        object2.localToWorld(localPos2.clone());
                        
                        const points = [localPos1, localPos2];
                        
                        const geometry = new THREE.BufferGeometry().setFromPoints(points);
                        const line = new THREE.Line(geometry, material);
                        scene.add(line);
                        
                        // Create a unique ID for the stick
                        // Use global counter if available and already reset
                        let stickId;
                        if (typeof stickIdCounter !== 'undefined') {
                            stickId = 'stick_' + stickIdCounter++;
                        } else {
                            stickId = 'stick_' + localStickIdCounter++;
                        }
                        
                        const stick = {
                            id: stickId,
                            object1: object1,
                            object2: object2,
                            point1: point1 || new THREE.Vector3(),
                            point2: point2 || new THREE.Vector3(),
                            constraint: constraint,
                            line: line,
                            isRigid: isRigid || false,
                            stiffness: stiffness || 1e6, // Use provided stiffness or default
                            
                            // Add an update method to update the line positions
                            update: function() {
                                if (!this.line) return;
                                
                                try {
                                    // Convert local points to world coordinates
                                    const worldPos1 = new THREE.Vector3();
                                    const worldPos2 = new THREE.Vector3();
                                    
                                    // Create temporary vectors with the local points
                                    const tempPos1 = new THREE.Vector3(this.point1.x, this.point1.y, this.point1.z);
                                    const tempPos2 = new THREE.Vector3(this.point2.x, this.point2.y, this.point2.z);
                                    
                                    // Apply object's world transform to get world positions
                                    this.object1.localToWorld(tempPos1);
                                    this.object2.localToWorld(tempPos2);
                                    
                                    worldPos1.copy(tempPos1);
                                    worldPos2.copy(tempPos2);
                                    
                                    // Update the line geometry
                                    const positions = new Float32Array([
                                        worldPos1.x, worldPos1.y, worldPos1.z,
                                        worldPos2.x, worldPos2.y, worldPos2.z
                                    ]);
                                    
                                    this.line.geometry.setAttribute('position', 
                                        new THREE.BufferAttribute(positions, 3));
                                    
                                    this.line.geometry.attributes.position.needsUpdate = true;
                                } catch (error) {
                                    console.warn("Error updating stick line:", error);
                                }
                            }
                        };
                        
                        // Initialize the line positions
                        stick.update();
                        
                        // Store stick
                        sticks.push(stick);
                        
                        // Safely add to connections list
                        safeAddToConnectionsList(stickId, 'stick', object1.userData.id, object2.userData.id);
                        
                        return stick;
                    } catch (error) {
                        console.error("Error creating imported stick:", error);
                        return null;
                    }
                }
                
                // Recreate sticks
                if (sceneData.sticks) {
                    console.log(`Creating ${sceneData.sticks.length} sticks...`);
                    sceneData.sticks.forEach(stickData => {
                        try {
                            // Get objects by their userData.id
                            const object1 = objectMap.get(stickData.object1Id);
                            const object2 = objectMap.get(stickData.object2Id);
                            
                            if (object1 && object2) {
                                const point1 = stickData.point1 ? 
                                    new THREE.Vector3(stickData.point1.x, stickData.point1.y, stickData.point1.z) : 
                                    new THREE.Vector3();
                                const point2 = stickData.point2 ? 
                                    new THREE.Vector3(stickData.point2.x, stickData.point2.y, stickData.point2.z) : 
                                    new THREE.Vector3();
                                
                                // Use our custom import function
                                const stick = createImportedStick(
                                    object1, 
                                    object2, 
                                    point1, 
                                    point2, 
                                    stickData.isRigid,
                                    stickData.stiffness
                                );
                                
                                // If the updateStickProperties function exists, call it
                                if (stick && stickData.stiffness !== undefined && typeof updateStickProperties === 'function') {
                                    updateStickProperties(stick);
                                }
                            } else {
                                console.warn("Could not find objects for stick:", stickData);
                            }
                        } catch (error) {
                            console.error("Error creating stick:", error, stickData);
                        }
                    });
                }
                
                // Ensure stick lines are updated in the animation loop
                // Try to hook into the existing animation loop if possible
                if (typeof animate === 'function' && !window.isAnimateHooked) {
                    const originalAnimateFunction = animate;
                    window.isAnimateHooked = true;
                    
                    animate = function() {
                        // Call the original function
                        originalAnimateFunction();
                        
                        // Update all stick lines
                        if (Array.isArray(sticks)) {
                            sticks.forEach(stick => {
                                if (stick && stick.update && typeof stick.update === 'function') {
                                    try {
                                        stick.update();
                                    } catch (error) {
                                        // Quietly handle errors to not break animation
                                    }
                                }
                            });
                        }
                    };
                    
                    console.log("Animation loop hooked for connection updates");
                }
                
                // Recreate motors
                if (sceneData.motors) {
                    console.log(`Creating ${sceneData.motors.length} motors...`);
                    sceneData.motors.forEach(motorData => {
                        try {
                            const object1 = objectMap.get(motorData.object1Id);
                            const object2 = objectMap.get(motorData.object2Id);
                            
                            if (object1 && object2) {
                                const point1 = new THREE.Vector3(motorData.point1.x, motorData.point1.y, motorData.point1.z);
                                const point2 = new THREE.Vector3(motorData.point2.x, motorData.point2.y, motorData.point2.z);
                                
                                // Check if the function exists
                                if (typeof createMotor === 'function') {
                                    const motor = createMotor(
                                        object1, 
                                        object2, 
                                        point1, 
                                        point2, 
                                        motorData.axis, 
                                        motorData.isRigid
                                    );
                                    
                                    if (motor) {
                                        // Set motor properties
                                        if (motorData.speed !== undefined) {
                                            motor.speed = motorData.speed;
                                            motor.constraint.enableMotor();
                                            motor.constraint.setMotorSpeed(motorData.speed);
                                            motor.constraint.setMotorMaxForce(motorData.force || 10);
                                        }
                                        
                                        if (motorData.force !== undefined) {
                                            motor.force = motorData.force;
                                        }
                                        
                                        if (motorData.stiffness !== undefined && typeof updateMotorProperties === 'function') {
                                            motor.stiffness = motorData.stiffness;
                                            updateMotorProperties(motor);
                                        }
                                    }
                                } else {
                                    console.warn("createMotor function not available - skipping motor creation");
                                }
                            } else {
                                console.warn("Could not find objects for motor:", motorData);
                            }
                        } catch (error) {
                            console.error("Error creating motor:", error, motorData);
                        }
                    });
                }
                
                // Recreate glues
                if (sceneData.glues) {
                    console.log(`Creating ${sceneData.glues.length} glues...`);
                    sceneData.glues.forEach(glueData => {
                        try {
                            const object1 = objectMap.get(glueData.object1Id);
                            const object2 = objectMap.get(glueData.object2Id);
                            
                            if (object1 && object2) {
                                const relativePosition = new THREE.Vector3(
                                    glueData.relativePosition.x,
                                    glueData.relativePosition.y,
                                    glueData.relativePosition.z
                                );
                                
                                const relativeQuaternion = new THREE.Quaternion(
                                    glueData.relativeQuaternion.x,
                                    glueData.relativeQuaternion.y,
                                    glueData.relativeQuaternion.z,
                                    glueData.relativeQuaternion.w
                                );
                                
                                // Check if the function exists
                                if (typeof createGlue === 'function') {
                                    createGlue(object1, object2, relativePosition, relativeQuaternion);
                                } else {
                                    console.warn("createGlue function not available - skipping glue creation");
                                }
                            } else {
                                console.warn("Could not find objects for glue:", glueData);
                            }
                        } catch (error) {
                            console.error("Error creating glue:", error, glueData);
                        }
                    });
                }
                
                // Recreate dual motor connections
                if (sceneData.objects) {
                    const dualMotorObjects = sceneData.objects.filter(obj => obj.isDualMotor && obj.connections);
                    if (dualMotorObjects.length > 0) {
                        console.log(`Setting up ${dualMotorObjects.length} dual motors...`);
                    }
                    
                    dualMotorObjects.forEach(objData => {
                        try {
                            const dualMotorObj = objectMap.get(objData.id);
                            if (!dualMotorObj) return;
                            
                            // Find the dual motor in the array
                            const dualMotor = dualMotors.find(m => m.id === dualMotorObj.userData.id);
                            
                            if (dualMotor) {
                                // Set properties
                                dualMotor.speed = objData.speed || 0;
                                dualMotor.force = objData.force || 20;
                                dualMotorObj.userData.speed = objData.speed || 0;
                                dualMotorObj.userData.force = objData.force || 20;
                                
                                // Recreate connections
                                objData.connections.forEach(conn => {
                                    const connectedObj = objectMap.get(conn.objectId);
                                    if (connectedObj) {
                                        // Get the cube
                                        const cube = conn.cubeNumber === 1 ? 
                                            dualMotorObj.userData.cube1 :
                                            dualMotorObj.userData.cube2;
                                        
                                        // Create the actual connection - check if function exists
                                        if (typeof attachDualMotorCube === 'function') {
                                            attachDualMotorCube(dualMotor, cube, connectedObj);
                                        } else {
                                            console.warn("attachDualMotorCube function not available");
                                        }
                                    }
                                });
                            }
                        } catch (error) {
                            console.error("Error setting up dual motor:", error, objData);
                        }
                    });
                }
                
                // Update UI components if functions exist
                if (typeof updateConnectionsList === 'function') {
                    updateConnectionsList();
                }
                
                if (typeof updateMotorRemotePanel === 'function') {
                    updateMotorRemotePanel();
                }
                
                if (typeof updateObjectCount === 'function') {
                    updateObjectCount();
                }
                
                // Reset the file input
                if (document.getElementById('import-file')) {
                    document.getElementById('import-file').value = '';
                }
                
                console.log("Scene import completed successfully");
                
                // Show toast notification
                showToast("Scene imported successfully");
            }
        } catch (error) {
            console.error("Error importing scene:", error);
            showToast("Error importing scene: " + error.message, "error");
            
            // Restore original object ID counter on error
            objectIdCounter = originalObjectIdCounter;
        }
    };
    reader.readAsText(file);
}