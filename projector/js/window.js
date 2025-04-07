let waitfinished


if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (event.matches) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
});

// Drag variables for floating panel
let isDragging = false;
let dragStartX, dragStartY, panelStartX, panelStartY;


function init() {
    // Create Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(document.documentElement.classList.contains('dark') ? 0x181818 : 0xffffff);
    
    // Create camera
    const container = document.getElementById('canvas-container');
    const aspectRatio = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Initialize raycaster for object selection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Create OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    
    // Create TransformControls
    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.addEventListener('dragging-changed', function(event) {
        controls.enabled = !event.value;
    });
    transformControls.addEventListener('objectChange', function() {
        if (transformControls.object) {
            // Update the position inputs when dragging objects
            updatePositionInputs(transformControls.object);
            
            // Update physics body to match visual object
            const objId = transformControls.object.userData.id;
            const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === objId);
            if (bodyIndex !== -1) {
                bodies[bodyIndex].position.copy(transformControls.object.position);
                bodies[bodyIndex].quaternion.copy(transformControls.object.quaternion);
            }
            
            // Update connections
            updateConnections();
        }
    });
    scene.add(transformControls);
    
    // Create lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);
    
    // Create cannon.js world
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Earth gravity
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    
    // Initialize FBX loader
    fbxLoader = new THREE.FBXLoader();
    
    // Create ground/plate
    createGround();
    
    // Set up event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onObjectClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    
    // Mobile controls
    setupMobileControls();
    
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentShapeType = btn.dataset.shape;
            createShape(currentShapeType);
        });
    });
    
    // Simulation controls
    document.getElementById('start-btn').addEventListener('click', startSimulation);
    document.getElementById('pause-btn').addEventListener('click', pauseSimulation);
    document.getElementById('reset-btn').addEventListener('click', resetSimulation);
    document.getElementById('reset-pos-btn').addEventListener('click', resetPositions);
    
    // Object manipulation controls
    document.getElementById('apply-rotation').addEventListener('click', applyRotation);
    document.getElementById('apply-dimensions').addEventListener('click', applyDimensions);
    document.getElementById('apply-position').addEventListener('click', applyPosition);
    
    // Connection controls
    document.getElementById('stick-btn').addEventListener('click', startStickMode);
    document.getElementById('motor-btn').addEventListener('click', startMotorMode);
    document.getElementById('rigid-stick-btn').addEventListener('click', startRigidStickMode);
    document.getElementById('rigid-motor-btn').addEventListener('click', startRigidMotorMode);
    document.getElementById('glue-btn').addEventListener('click', startGlueMode);
    document.getElementById('dual-motor-attach-btn').addEventListener('click', startDualMotorAttachMode);
    document.getElementById('delete-connections-btn').addEventListener('click', deleteSelectedConnections);
    
    // Fix/Unfix controls
    document.getElementById('fix-btn').addEventListener('click', fixSelectedObjects);
    document.getElementById('unfix-btn').addEventListener('click', unfixSelectedObjects);
    
    // Connection stiffness control
    document.getElementById('connection-stiffness').addEventListener('input', updateConnectionStiffness);
    
    // Motor speed controls
    document.getElementById('motor-speed-slider').addEventListener('input', updateMotorSpeed);
    document.getElementById('motor-axis-select').addEventListener('change', updateMotorAxis);
    
    // Motor force control
    document.getElementById('motor-force-slider').addEventListener('input', updateMotorForce);
    
    // Motor direction buttons
    document.getElementById('motor-ccw-btn').addEventListener('click', () => setMotorDirection('ccw'));
    document.getElementById('motor-cw-btn').addEventListener('click', () => setMotorDirection('cw'));
    document.getElementById('motor-stop-btn').addEventListener('click', stopMotor);
    
    // Dual Motor controls
    document.getElementById('dual-motor-speed-slider').addEventListener('input', updateDualMotorSpeed);
    document.getElementById('dual-motor-force-slider').addEventListener('input', updateDualMotorForce);
    document.getElementById('dual-motor-ccw-btn').addEventListener('click', () => setDualMotorDirection('ccw'));
    document.getElementById('dual-motor-cw-btn').addEventListener('click', () => setDualMotorDirection('cw'));
    document.getElementById('dual-motor-stop-btn').addEventListener('click', stopDualMotor);
    
    // Handle FBX file input
    document.getElementById('fbx-input').addEventListener('change', handleFBXUpload);
    
    // Export/Import scene
    document.getElementById('export-btn').addEventListener('click', exportScene);
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', importScene);
    
    const gravitySlider = document.getElementById('gravity-slider');
    gravitySlider.addEventListener('input', () => {
        const gravityValue = parseFloat(gravitySlider.value);
        document.getElementById('gravity-value').textContent = `${gravityValue.toFixed(2)} m/s²`;
        world.gravity.set(0, -gravityValue, 0);
    });
    
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            // Remove selected class from all swatches
            document.querySelectorAll('.color-swatch').forEach(s => {
                s.classList.remove('border-white');
                s.classList.add('border-transparent');
            });
            
            // Add selected class to clicked swatch
            swatch.classList.remove('border-transparent');
            swatch.classList.add('border-white');
            
            // Update selected color
            selectedColor = swatch.dataset.color;
            
            // Apply to all selected objects
            applyColorToSelected(selectedColor);
        });
    });
    
    // Set initial selected color
    document.querySelector('.color-swatch').classList.remove('border-transparent');
    document.querySelector('.color-swatch').classList.add('border-white');
    
    // Set up floating motor panel
    setupFloatingMotorPanel();
    
    // Start animation loop
    animate();
}


// Update object list to show fixed status
function updateObjectList() {
    document.querySelectorAll('#object-list div[data-id]').forEach(entry => {
        const objId = parseInt(entry.dataset.id);
        const obj = meshes.find(mesh => mesh.userData.id === objId);
        
        if (obj && obj.userData.isFixed) {
            entry.classList.add('bg-purple-100', 'dark:bg-purple-900');
        } else {
            entry.classList.remove('bg-purple-100', 'dark:bg-purple-900');
        }
    });
}


// Export the scene to a JSON file
// function exportScene() {
//     // Create scene data structure
//     const sceneData = {
//         objects: [],
//         sticks: [],
//         motors: [],
//         glues: [],
//         dualMotors: [],
//         fixedObjects: [],
//         fbxModels: [] // Add fbxModels array to store FBX-specific data
//     };
    
//     // Collect data for each object
//     meshes.forEach(async mesh => {
//         // Check if it's an FBX model
//         if (mesh.userData.type === 'fbx') {
//             console.log(mesh)
//             const fbxData = {
//                 id: mesh.userData.id,
//                 type: 'fbx',
//                 name: mesh.userData.name,
//                 position: {
//                     x: mesh.position.x,
//                     y: mesh.position.y,
//                     z: mesh.position.z
//                 },
//                 rotation: {
//                     x: mesh.quaternion.x,
//                     y: mesh.quaternion.y,
//                     z: mesh.quaternion.z,
//                     w: mesh.quaternion.w
//                 },
//                 scale: {
//                     x: mesh.scale.x,
//                     y: mesh.scale.y,
//                     z: mesh.scale.z
//                 },
//                 mass: mesh.userData.mass,
//                 color: mesh.userData.color,
//                 isFixed: mesh.userData.isFixed || false,
//                 // Include the FBX file path if available
//                 filePath: mesh.userData.filePath || ""
//             };
            
//             sceneData.fbxModels.push(fbxData);
//             return; // Skip adding to objects array
//         }
        
//         // Regular objects handling (unchanged)
//         let objectData = {
//             id: mesh.userData.id,
//             type: mesh.userData.type,
//             position: {
//                 x: mesh.position.x,
//                 y: mesh.position.y,
//                 z: mesh.position.z
//             },
//             rotation: {
//                 x: mesh.quaternion.x,
//                 y: mesh.quaternion.y,
//                 z: mesh.quaternion.z,
//                 w: mesh.quaternion.w
//             },
//             mass: mesh.userData.mass,
//             color: mesh.userData.color,
//             isFixed: mesh.userData.isFixed || false
//         };
        
//         // Add shape-specific properties
//         if (mesh.userData.type === 'box' || mesh.userData.type === 'car' || mesh.userData.type === 'dual-motor') {
//             objectData.width = mesh.userData.width;
//             objectData.height = mesh.userData.height;
//             objectData.length = mesh.userData.length;
//         } else if (mesh.userData.type === 'sphere' || mesh.userData.type === 'wheel') {
//             objectData.radius = mesh.userData.radius;
//             if (mesh.userData.type === 'wheel') {
//                 objectData.width = mesh.userData.width;
//             }
//         } else if (mesh.userData.type === 'cylinder' || mesh.userData.type === 'cone') {
//             objectData.radius = mesh.userData.radius;
//             objectData.height = mesh.userData.height;
//         } else if (mesh.userData.type === 'torus') {
//             objectData.radius = mesh.userData.radius;
//             objectData.tubeRadius = mesh.userData.tubeRadius;
//         }
        
//         // Add dual motor specific data
//         if (mesh.userData.isDualMotor) {
//             objectData.isDualMotor = true;
//             objectData.speed = mesh.userData.speed || 0;
//             objectData.force = mesh.userData.force || 20;
            
//             // Find the dual motor data
//             const motorData = dualMotors.find(m => m.id === mesh.userData.id);
//             if (motorData && motorData.connections.length > 0) {
//                 objectData.connections = motorData.connections.map(conn => ({
//                     cubeNumber: conn.cubeNumber,
//                     objectId: conn.object.userData.id
//                 }));
//             }
//         }
        
//         sceneData.objects.push(objectData);
//     });
    
//     // Export sticks - Using userData.id instead of uuid
//     sticks.forEach(stick => {
//         // Safety check to ensure objects have userData.id
//         if (!stick.object1.userData || !stick.object1.userData.id || 
//             !stick.object2.userData || !stick.object2.userData.id) {
//             console.warn("Skipping stick due to missing userData.id", stick);
//             return;
//         }
        
//         const stickData = {
//             id: stick.id,
//             object1Id: stick.object1.userData.id, // Use userData.id instead of uuid
//             object2Id: stick.object2.userData.id, // Use userData.id instead of uuid
//             point1: stick.point1 ? { x: stick.point1.x, y: stick.point1.y, z: stick.point1.z } : null,
//             point2: stick.point2 ? { x: stick.point2.x, y: stick.point2.y, z: stick.point2.z } : null,
//             stiffness: stick.stiffness,
//             isRigid: stick.isRigid
//             // Removed line to avoid circular references
//         };
//         sceneData.sticks.push(stickData);
//     });
    
//     // Export motors
//     motors.forEach(motor => {
//         const motorData = {
//             id: motor.id,
//             object1Id: motor.object1.userData.id,
//             object2Id: motor.object2.userData.id,
//             point1: { x: motor.point1.x, y: motor.point1.y, z: motor.point1.z },
//             point2: { x: motor.point2.x, y: motor.point2.y, z: motor.point2.z },
//             axis: motor.axis,
//             speed: motor.speed,
//             force: motor.force || 10, // Default to 10 if not set
//             stiffness: motor.stiffness,
//             isRigid: motor.isRigid
//         };
//         sceneData.motors.push(motorData);
//     });
    
//     // Export glues
//     glues.forEach(glue => {
//         const glueData = {
//             id: glue.id,
//             object1Id: glue.object1.userData.id,
//             object2Id: glue.object2.userData.id,
//             relativePosition: { 
//                 x: glue.relativePosition.x, 
//                 y: glue.relativePosition.y, 
//                 z: glue.relativePosition.z 
//             },
//             relativeQuaternion: { 
//                 x: glue.relativeQuaternion.x, 
//                 y: glue.relativeQuaternion.y, 
//                 z: glue.relativeQuaternion.z, 
//                 w: glue.relativeQuaternion.w 
//             }
//         };
//         sceneData.glues.push(glueData);
//     });
    
//     try {
//         console.log("Preparing export data...");
//         // Create a Blob with the JSON data - using replacer to avoid circular references
//         const jsonString = JSON.stringify(sceneData, function(key, value) {
//             // Skip potential circular reference objects
//             if (key === 'constraint' || key === 'line' || key === 'body' || 
//                 key === 'bodies' || key === 'world') {
//                 return undefined;
//             }
//             return value;
//         }, 2);
        
//         const blob = new Blob([jsonString], { type: 'application/json' });
        
//         // Create a download link
//         const downloadLink = document.createElement('a');
//         downloadLink.href = URL.createObjectURL(blob);
//         downloadLink.download = 'physics_scene.json';
        
//         // Simulate click to trigger download
//         document.body.appendChild(downloadLink);
//         downloadLink.click();
//         document.body.removeChild(downloadLink);
        
//         // Show toast notification
//         showToast("Scene exported successfully");
//     } catch (error) {
//         console.error("Export error:", error);
//         showToast("Error exporting scene: " + error.message, "error");
//     }
// }


// Import scene from a JSON file
// function importScene(event) {
//     const file = event.target.files[0];
//     if (!file) return;
    
//     // Local counter for generating unique IDs during import if global is unavailable
//     let localStickIdCounter = 1000; // Start from a high number to avoid conflicts
    
//     const reader = new FileReader();
//     reader.onload = function(e) {
//         try {
//             // Parse the JSON data
//             const sceneData = JSON.parse(e.target.result);
            
//             // Recreate all objects first
//             const objectMap = new Map(); // Map old IDs to new objects
//             const bodyMap = new Map();   // Map object IDs to physics bodies
            
//             // Process regular objects
//             if (sceneData.objects) {
//                 sceneData.objects.forEach(obj => {
//                     const newObject = createImportedObject(obj);
//                     if (newObject) {
//                         objectMap.set(obj.id, newObject);
                        
//                         // Find the corresponding physics body and store it in the map
//                         const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === newObject.userData.id);
//                         if (bodyIndex !== -1) {
//                             bodyMap.set(obj.id, bodies[bodyIndex]);
                            
//                             // Store a direct reference to the body in userData for easier access
//                             newObject.userData.physicsBody = bodies[bodyIndex];
//                         } else {
//                             console.warn("No physics body found for object", obj.id);
//                         }
                        
//                         // If the object is fixed, set it now
//                         if (obj.isFixed) {
//                             newObject.userData.isFixed = true;
//                             // Find the body
//                             if (bodyIndex !== -1) {
//                                 // Save original mass
//                                 newObject.userData.originalMass = newObject.userData.mass;
                                
//                                 // Make it static
//                                 bodies[bodyIndex].mass = 0;
//                                 bodies[bodyIndex].updateMassProperties();
//                                 bodies[bodyIndex].type = CANNON.Body.STATIC;
                                
//                                 // Add visual indicator
//                                 const fixedIndicator = createFixedIndicator(newObject);
//                                 newObject.userData.fixedIndicator = fixedIndicator;
                                
//                                 // Add to tracking array
//                                 fixedObjects.push(newObject);
//                             }
//                         }
//                     }
//                 });
//             }
            
//             // Process FBX models if they exist
//             if (sceneData.fbxModels && sceneData.fbxModels.length > 0) {
//                 // Process each FBX model
//                 const fbxLoader = new THREE.FBXLoader();
                
//                 // We need to track how many FBX models we've processed
//                 let processedCount = 0;
//                 const fbxModelsCount = sceneData.fbxModels.length;
                
//                 const continueImport = () => {
//                     // Only continue with the rest of the import when all FBX models are loaded
//                     if (processedCount >= fbxModelsCount) {
//                         continueWithImport();
//                     }
//                 };
                
//                 // Process each FBX model
//                 sceneData.fbxModels.forEach(fbxData => {
//                     // If we have a file path, load from that
//                     if (fbxData.filePath) {
//                         fbxLoader.load(
//                             fbxData.filePath,
//                             function (fbxModel) {
//                                 processFbxModel(fbxModel, fbxData.filePath, objectMap, bodyMap);
//                                 processedCount++;
//                                 continueImport();
//                             }
//                         )
//                             console.error('Error loading FBX model:', error);
//                             processedCount++;
//                             continueImport();
//                     } else {
//                         showToast("Please select the FBX file for model #" + fbxData.name)
//                         // Create a temporary file input
//                         const fileInput = document.createElement('input');
//                         fileInput.type = 'file';
//                         fileInput.accept = '.fbx';
                        
//                         fileInput.onchange = function(fileEvent) {
//                             waitfinished = 1;
//                             if (fileEvent.target.files.length > 0) {
//                                 const fbxFile = fileEvent.target.files[0];
//                                 const objectURL = URL.createObjectURL(fbxFile);
                                
//                                 fbxLoader.load(objectURL, (fbxModel) => {
//                                     processFbxModel(fbxModel, fbxData, objectMap, bodyMap);
//                                     URL.revokeObjectURL(objectURL);
//                                     processedCount++;
//                                     continueImport();
//                                 }, undefined, (error) => {
//                                     console.error('Error loading FBX model:', error);
//                                     URL.revokeObjectURL(objectURL);
//                                     processedCount++;
//                                     continueImport();
//                                 });
//                             } else {
//                                 processedCount++;
//                                 continueImport();
//                             }
//                         };
//                         fileInput.click();
//                     }
//                 });
                
//                 // If there are no FBX models to process, continue with import
//                 if (fbxModelsCount === 0) {
//                     continueWithImport();
//                 }
//             } else {
//                 // No FBX models, continue with regular import
//                 continueWithImport();
//             }
            
//             function processFbxModel(fbxModel, fbxData, objectMap, bodyMap) {
//                 try {
//                     // First, analyze the model's original size
//                     const originalBox = new THREE.Box3().setFromObject(fbxModel);
//                     const originalSize = new THREE.Vector3();
//                     originalBox.getSize(originalSize);
                    
//                     console.log("Original model size:", originalSize);
                    
//                     // Calculate a reasonable scale - use fbxData.scale if present, else default
//                     let modelScale = 0.001;
//                     if (fbxData.scale && typeof fbxData.scale.x === 'number') {
//                         modelScale = fbxData.scale.x;
//                     }
                    
//                     // Apply the calculated scale
//                     fbxModel.scale.set(modelScale, modelScale, modelScale);
                    
//                     // Apply material/color to all meshes in the model
//                     fbxModel.traverse(function(child) {
//                         if (child.isMesh) {
//                             if (child.geometry) {
//                                 child.geometry.computeVertexNormals();
//                             }
                            
//                             // Use MeshLambertMaterial for shadow support
//                             child.material = new THREE.MeshLambertMaterial({
//                                 color: fbxData.color || selectedColor,
//                                 emissive: 0x000000,
//                                 emissiveIntensity: 0,
//                                 side: THREE.DoubleSide
//                             });
                            
//                             child.material.onBeforeCompile = function(shader) {
//                                 shader.fragmentShader = shader.fragmentShader.replace(
//                                     '#include <lights_lambert_fragment>',
//                                     'vec3 totalDiffuse = diffuse;'
//                                 );
//                             };
                            
//                             child.castShadow = true;
//                             child.receiveShadow = true;
//                         }
//                     });
                    
//                     // Set initial position - either from fbxData or a default
//                     let position;
//                     if (fbxData.position && typeof fbxData.position.x === 'number') {
//                         position = new THREE.Vector3(
//                             fbxData.position.x,
//                             fbxData.position.y,
//                             fbxData.position.z
//                         );
//                     } else {
//                         // Default position (similar to importFBXModel)
//                         position = new THREE.Vector3(0, 10, 0);
//                     }
                    
//                     // First add to scene temporarily to calculate center of gravity
//                     fbxModel.position.copy(position);
//                     scene.add(fbxModel);
//                     fbxModel.updateMatrixWorld(true);
                    
//                     // Calculate center of gravity and size
//                     let centerOfGravity, size, meshVolumes;
                    
//                     if (fbxData.centerOfGravity && typeof fbxData.centerOfGravity.x === 'number' && 
//                         fbxData.width && fbxData.height && fbxData.length) {
//                         // If we have the data already, use it
//                         centerOfGravity = new THREE.Vector3(
//                             fbxData.centerOfGravity.x,
//                             fbxData.centerOfGravity.y,
//                             fbxData.centerOfGravity.z
//                         );
//                         size = new THREE.Vector3(
//                             fbxData.width,
//                             fbxData.height,
//                             fbxData.length
//                         );
//                     } else {
//                         // Calculate just like in importFBXModel
//                         const result = calculateCenterOfGravity(fbxModel);
//                         centerOfGravity = result.centerOfGravity;
//                         size = result.size;
//                         meshVolumes = result.meshVolumes;
                        
//                         console.log("Calculated Center of gravity:", centerOfGravity);
//                         console.log("Calculated Model size:", size);
//                     }
                    
//                     // Store original world position
//                     const originalWorldPosition = fbxModel.position.clone();
                    
//                     // Calculate offset from current position to COG
//                     const cogOffset = centerOfGravity.clone().sub(fbxModel.position);
                    
//                     // Create a parent container at the original position
//                     const container = new THREE.Object3D();
//                     container.position.copy(originalWorldPosition);
                    
//                     // Set rotation if available
//                     if (fbxData.rotation && typeof fbxData.rotation.x === 'number') {
//                         container.quaternion.set(
//                             fbxData.rotation.x,
//                             fbxData.rotation.y,
//                             fbxData.rotation.z,
//                             fbxData.rotation.w
//                         );
//                     }
                    
//                     scene.add(container);
                    
//                     // Remove model from scene and add to container
//                     scene.remove(fbxModel);
//                     container.add(fbxModel);
                    
//                     // Position the model so its center of gravity is at the origin of the container
//                     fbxModel.position.copy(cogOffset.clone().multiplyScalar(-1));
                    
//                     // Determine mass - from fbxData or default
//                     const mass = fbxData.isFixed ? 0 : (typeof fbxData.mass === 'number' ? fbxData.mass : 1);
                    
//                     // Create physics body with improved center of gravity
//                     const halfExtents = size.clone().multiplyScalar(0.5);
//                     const boxShape = new CANNON.Box(new CANNON.Vec3(
//                         halfExtents.x, 
//                         halfExtents.y, 
//                         halfExtents.z
//                     ));
                    
//                     const body = new CANNON.Body({ mass: mass });
                    
//                     // No offset needed since the container position is already at the COG
//                     body.addShape(boxShape);
//                     body.position.copy(container.position);
//                     body.quaternion.copy(container.quaternion);
                    
//                     // Add to world
//                     world.addBody(body);
                    
//                     // Assign ID - use fbxData.id if available, or generate new ID
//                     const objectId = fbxData.id || objectIdCounter++;
                    
//                     // Set user data for container
//                     container.userData = {
//                         id: objectId,
//                         type: 'fbx',
//                         mass: mass,
//                         color: fbxData.color || selectedColor,
//                         isFixed: fbxData.isFixed || false,
//                         name: fbxData.name || "FBX Model",
//                         scale: { 
//                             x: modelScale, 
//                             y: modelScale, 
//                             z: modelScale 
//                         },
//                         width: size.x,
//                         height: size.y,
//                         length: size.z,
//                         centerOfGravity: new THREE.Vector3(0, 0, 0), // Now at the origin
//                         filePath: fbxData.filePath || ""
//                     };
                    
//                     // Set body user data with UUID reference for connections
//                     body.userData = { 
//                         id: objectId, 
//                         type: 'fbx',
//                         uuid: container.uuid
//                     };
                    
//                     // Add debug visualization if this is a fresh import (not loaded from scene)
//                     if (!fbxData.id) {
//                         // Create a visible bounding box and center of gravity indicator
//                         const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
//                         const boxMaterial = new THREE.MeshBasicMaterial({ 
//                             color: 0xff0000,
//                             wireframe: true,
//                             transparent: true,
//                             opacity: 0.3
//                         });
//                         const boxHelper = new THREE.Mesh(boxGeometry, boxMaterial);
//                         boxHelper.position.copy(new THREE.Vector3(0, 0, 0));
//                         container.add(boxHelper);
                        
//                         // Add a sphere to show the center of gravity
//                         const cogSphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
//                         const cogSphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
//                         const cogSphere = new THREE.Mesh(cogSphereGeometry, cogSphereMaterial);
//                         cogSphere.position.copy(new THREE.Vector3(0, 0, 0));
//                         container.add(cogSphere);
                        
//                         // Set timeout to remove visual helpers
//                         setTimeout(() => {
//                             container.remove(boxHelper);
//                             container.remove(cogSphere);
//                         }, 10000);
//                     }
                    
//                     // Add to body mapping
//                     bodyMap.set(objectId, body);
                    
//                     // Store initial position
//                     initialPositions.push({
//                         id: objectId,
//                         position: container.position.clone(),
//                         quaternion: container.quaternion.clone()
//                     });
                    
//                     // Store mesh and body
//                     meshes.push(container);
//                     bodies.push(body);
                    
//                     // Add to object list
//                     addObjectToList(objectId, container.userData.name, fbxData.color || selectedColor);
                    
//                     // Add fixed indicator if needed
//                     if (fbxData.isFixed) {
//                         container.userData.originalMass = container.userData.mass;
//                         const fixedIndicator = createFixedIndicator(container);
//                         container.userData.fixedIndicator = fixedIndicator;
//                         fixedObjects.push(container);
//                     }
                    
//                     // Map the object ID to the container
//                     objectMap.set(objectId, container);
                    
//                     return container;
//                 } catch (err) {
//                     console.error("Error processing FBX model:", err);
//                     console.log("Failed data:", fbxData);
//                     throw err;
//                 }
//             }
            
//             function continueWithImport() {
//                 // Update object list to show fixed status
//                 updateObjectList();
                
//                 // Helper function to find a physics body from the object's ID
//                 function findBodyForObject(objId) {
//                     // Check the bodyMap first
//                     if (bodyMap.has(objId)) {
//                         return bodyMap.get(objId);
//                     }
                    
//                     // Fallback to searching bodies array
//                     const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === objId);
//                     if (bodyIndex !== -1) {
//                         const body = bodies[bodyIndex];
//                         // Cache it for future lookups
//                         bodyMap.set(objId, body);
//                         return body;
//                     }
                    
//                     return null;
//                 }
                
//                 // Safely add to connections list if the function exists
//                 function safeAddToConnectionsList(id, type, obj1Id, obj2Id) {
//                     // Check if the function exists in the global scope
//                     if (typeof addToConnectionsList === 'function') {
//                         try {
//                             addToConnectionsList(id, type, obj1Id, obj2Id);
//                         } catch (error) {
//                             console.warn("Error adding to connections list:", error);
//                         }
//                     } else {
//                         console.log(`Connection created: ${type} ${id} between ${obj1Id} and ${obj2Id}`);
//                     }
//                 }
                
//                 // Define a custom stick creation function for import
//                 function createImportedStick(object1, object2, point1, point2, isRigid) {
//                     console.log("Creating imported stick between:", object1.userData.id, object2.userData.id);
                    
//                     // Find or get physics bodies
//                     const body1 = object1.userData.physicsBody || findBodyForObject(object1.userData.id);
//                     const body2 = object2.userData.physicsBody || findBodyForObject(object2.userData.id);
                    
//                     if (!body1 || !body2) {
//                         console.error("Missing physics bodies for stick creation:", 
//                             object1.userData.id, object2.userData.id);
//                         return null;
//                     }
                    
//                     // Now use your existing createStick function, or duplicate the logic here
//                     try {
//                         // Create constraint between bodies directly
//                         const options = {
//                             pivotA: point1 ? new CANNON.Vec3(point1.x, point1.y, point1.z) : new CANNON.Vec3(),
//                             pivotB: point2 ? new CANNON.Vec3(point2.x, point2.y, point2.z) : new CANNON.Vec3(),
//                             maxForce: 1e6 // Adjustable parameter for constraint strength
//                         };
                        
//                         // Choose constraint type based on whether it's rigid
//                         let constraint;
//                         if (isRigid) {
//                             constraint = new CANNON.LockConstraint(body1, body2, options);
//                         } else {
//                             constraint = new CANNON.PointToPointConstraint(body1, options.pivotA, body2, options.pivotB, options.maxForce);
//                         }
                        
//                         // Add constraint to world
//                         world.addConstraint(constraint);
                        
//                         // Create visual representation (line)
//                         const material = new THREE.LineBasicMaterial({ 
//                             color: 0xffffff,
//                             opacity: 0.75,
//                             transparent: true,
//                             linewidth: 2
//                         });
                        
//                         // Initialize points for the line - will be updated in the animation loop
//                         const worldPos1 = new THREE.Vector3();
//                         const worldPos2 = new THREE.Vector3();
                        
//                         // Calculate world positions for the connection points
//                         const localPos1 = new THREE.Vector3(point1.x, point1.y, point1.z);
//                         const localPos2 = new THREE.Vector3(point2.x, point2.y, point2.z);
                        
//                         // Transform local points to world space
//                         object1.localToWorld(localPos1.clone());
//                         object2.localToWorld(localPos2.clone());
                        
//                         const points = [localPos1, localPos2];
                        
//                         const geometry = new THREE.BufferGeometry().setFromPoints(points);
//                         const line = new THREE.Line(geometry, material);
//                         scene.add(line);
                        
//                         // Create a unique ID for the stick
//                         // Try to use global counter if it exists, otherwise use our local counter
//                         let stickId;
//                         if (typeof stickIdCounter !== 'undefined') {
//                             stickId = 'stick_' + stickIdCounter++;
//                         } else {
//                             stickId = 'stick_import_' + localStickIdCounter++;
//                         }
                        
//                         const stick = {
//                             id: stickId,
//                             object1: object1,
//                             object2: object2,
//                             point1: point1 || new THREE.Vector3(),
//                             point2: point2 || new THREE.Vector3(),
//                             constraint: constraint,
//                             line: line,
//                             isRigid: isRigid || false,
//                             stiffness: 1e6, // Default stiffness
                            
//                             // Add an update method to update the line positions
//                             update: function() {
//                                 if (!this.line) return;
                                
//                                 // Convert local points to world coordinates
//                                 const worldPos1 = new THREE.Vector3();
//                                 const worldPos2 = new THREE.Vector3();
                                
//                                 // Create temporary vectors with the local points
//                                 const tempPos1 = new THREE.Vector3(this.point1.x, this.point1.y, this.point1.z);
//                                 const tempPos2 = new THREE.Vector3(this.point2.x, this.point2.y, this.point2.z);
                                
//                                 // Apply object's world transform to get world positions
//                                 this.object1.localToWorld(tempPos1);
//                                 this.object2.localToWorld(tempPos2);
                                
//                                 worldPos1.copy(tempPos1);
//                                 worldPos2.copy(tempPos2);
                                
//                                 // Update the line geometry
//                                 const positions = new Float32Array([
//                                     worldPos1.x, worldPos1.y, worldPos1.z,
//                                     worldPos2.x, worldPos2.y, worldPos2.z
//                                 ]);
                                
//                                 this.line.geometry.setAttribute('position', 
//                                     new THREE.BufferAttribute(positions, 3));
                                
//                                 this.line.geometry.attributes.position.needsUpdate = true;
//                             }
//                         };
                        
//                         // Initialize the line positions
//                         stick.update();
                        
//                         // Store stick
//                         sticks.push(stick);
                        
//                         // Safely add to connections list
//                         safeAddToConnectionsList(stickId, 'stick', object1.userData.id, object2.userData.id);
                        
//                         return stick;
//                     } catch (error) {
//                         console.error("Error creating imported stick:", error);
//                         return null;
//                     }
//                 }
                
//                 // Recreate sticks - Use userData.id instead of uuid
//                 if (sceneData.sticks) {
//                     sceneData.sticks.forEach(stickData => {
//                         // Get objects by their userData.id
//                         const object1 = objectMap.get(stickData.object1Id);
//                         const object2 = objectMap.get(stickData.object2Id);
                        
//                         console.log("Stick connection:", stickData.object1Id, stickData.object2Id);
//                         console.log("Found objects:", object1 ? object1.userData.id : null, object2 ? object2.userData.id : null);
                        
//                         if (object1 && object2) {
//                             const point1 = new THREE.Vector3(stickData.point1.x, stickData.point1.y, stickData.point1.z);
//                             const point2 = new THREE.Vector3(stickData.point2.x, stickData.point2.y, stickData.point2.z);
//                             console.log("Creating stick between objects with points:", point1, point2);
                            
//                             // Use our custom import function instead of createStick
//                             const stick = createImportedStick(object1, object2, point1, point2, stickData.isRigid);
//                             if (stick && stickData.stiffness !== undefined) {
//                                 stick.stiffness = stickData.stiffness;
//                                 if (typeof updateStickProperties === 'function') {
//                                     updateStickProperties(stick);
//                                 }
//                             }
//                         } else {
//                             console.warn("Could not find objects for stick:", stickData);
//                         }
//                     });
//                 }
                
//                 // Make sure the lines are updated in the animation loop
//                 // Try to hook into the existing animation loop if possible
//                 const originalAnimateFunction = animate;
//                 if (typeof animate === 'function') {
//                     // Keep track of whether we've already modified the animate function
//                     if (!window.isAnimateHooked) {
//                         window.isAnimateHooked = true;
                        
//                         animate = function() {
//                             // Call the original function
//                             originalAnimateFunction();
                            
//                             // Update all stick lines
//                             sticks.forEach(stick => {
//                                 if (stick.update && typeof stick.update === 'function') {
//                                     stick.update();
//                                 }
//                             });
//                         };
//                     }
//                 }
                
//                 // Recreate motors - With safe function checks
//                 if (sceneData.motors) {
//                     sceneData.motors.forEach(motorData => {
//                         const object1 = objectMap.get(motorData.object1Id);
//                         const object2 = objectMap.get(motorData.object2Id);
                        
//                         if (object1 && object2) {
//                             const point1 = new THREE.Vector3(motorData.point1.x, motorData.point1.y, motorData.point1.z);
//                             const point2 = new THREE.Vector3(motorData.point2.x, motorData.point2.y, motorData.point2.z);
                            
//                             // Check if the function exists
//                             if (typeof createMotor === 'function') {
//                                 const motor = createMotor(object1, object2, point1, point2, motorData.axis, motorData.isRigid);
//                                 if (motor) {
//                                     if (motorData.speed) {
//                                         motor.speed = motorData.speed;
//                                         motor.constraint.enableMotor();
//                                         motor.constraint.setMotorSpeed(motorData.speed);
//                                         motor.constraint.setMotorMaxForce(motorData.force || 10);
//                                     }
                                    
//                                     if (motorData.force) {
//                                         motor.force = motorData.force;
//                                     }
                                    
//                                     if (motorData.stiffness !== undefined && typeof updateMotorProperties === 'function') {
//                                         motor.stiffness = motorData.stiffness;
//                                         updateMotorProperties(motor);
//                                     }
//                                 }
//                             } else {
//                                 console.warn("createMotor function not available - skipping motor creation");
//                             }
//                         }
//                     });
//                 }
                
//                 // Recreate glues - With safe function checks
//                 if (sceneData.glues) {
//                     sceneData.glues.forEach(glueData => {
//                         const object1 = objectMap.get(glueData.object1Id);
//                         const object2 = objectMap.get(glueData.object2Id);
                        
//                         if (object1 && object2) {
//                             const relativePosition = new THREE.Vector3(
//                                 glueData.relativePosition.x,
//                                 glueData.relativePosition.y,
//                                 glueData.relativePosition.z
//                             );
                            
//                             const relativeQuaternion = new THREE.Quaternion(
//                                 glueData.relativeQuaternion.x,
//                                 glueData.relativeQuaternion.y,
//                                 glueData.relativeQuaternion.z,
//                                 glueData.relativeQuaternion.w
//                             );
                            
//                             // Check if the function exists
//                             if (typeof createGlue === 'function') {
//                                 createGlue(object1, object2, relativePosition, relativeQuaternion);
//                             } else {
//                                 console.warn("createGlue function not available - skipping glue creation");
//                             }
//                         }
//                     });
//                 }
                
//                 // Recreate dual motor connections - With safe function checks
//                 if (sceneData.objects) {
//                     sceneData.objects.forEach(objData => {
//                         if (objData.isDualMotor && objData.connections) {
//                             const dualMotorObj = objectMap.get(objData.id);
//                             if (!dualMotorObj) return;
                            
//                             // Find the dual motor in the array
//                             const dualMotor = dualMotors.find(m => m.id === dualMotorObj.userData.id);
                            
//                             if (dualMotor) {
//                                 // Set properties
//                                 dualMotor.speed = objData.speed || 0;
//                                 dualMotor.force = objData.force || 20;
//                                 dualMotorObj.userData.speed = objData.speed || 0;
//                                 dualMotorObj.userData.force = objData.force || 20;
                                
//                                 // Recreate connections
//                                 objData.connections.forEach(conn => {
//                                     const connectedObj = objectMap.get(conn.objectId);
//                                     if (connectedObj) {
//                                         // Get the cube
//                                         const cube = conn.cubeNumber === 1 ? 
//                                             dualMotorObj.userData.cube1 :
//                                             dualMotorObj.userData.cube2;
                                        
//                                         // Create the actual connection - check if function exists
//                                         if (typeof attachDualMotorCube === 'function') {
//                                             attachDualMotorCube(dualMotor, cube, connectedObj);
//                                         } else {
//                                             console.warn("attachDualMotorCube function not available");
//                                         }
//                                     }
//                                 });
//                             }
//                         }
//                     });
//                 }
                
//                 // Update the connection list - check if function exists
//                 if (typeof updateConnectionsList === 'function') {
//                     updateConnectionsList();
//                 }
                
//                 // Update the floating motor panel - check if function exists
//                 if (typeof updateMotorRemotePanel === 'function') {
//                     updateMotorRemotePanel();
//                 }
                
//                 // Update object count - check if function exists
//                 if (typeof updateObjectCount === 'function') {
//                     updateObjectCount();
//                 }
                
//                 // Reset the file input
//                 document.getElementById('import-file').value = '';
                
//                 // Show toast notification
//                 showToast("Scene imported successfully");
//             }
//         } catch (error) {
//             console.error("Error importing scene");
//         }
//     };
//     reader.readAsText(file);
// }


function onWindowResize() {
    const container = document.getElementById('canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Check if camera exists before setting aspect
    if (camera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
    
    // Check if renderer exists before resizing
    if (renderer) {
        renderer.setSize(width, height);
    }
}
function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // If we're in connection mode and have a temp line, update it
    if ((connectionMode && selectedObjects.length === 1 && tempConnectionLine) ||
        (dualMotorAttachState.active && tempConnectionLine)) {
        // Update the raycaster
        raycaster.setFromCamera(mouse, camera);
        
        // Get the intersection point with objects or use a default point
        const intersects = raycaster.intersectObjects(meshes, true);
        let point;
        
        if (intersects.length > 0) {
            point = intersects[0].point;
        } else {
            // If no intersection, project a point in 3D space
            point = new THREE.Vector3(mouse.x, mouse.y, 0).unproject(camera);
        }
        
        // Get the starting point
        let startPoint;
        if (connectionMode) {
            startPoint = selectedObjects[0].position;
        } else if (dualMotorAttachState.active) {
            startPoint = dualMotorAttachState.cube.getWorldPosition(new THREE.Vector3());
        }
        
        // Update the temp line
        tempConnectionLine.geometry.setFromPoints([
            startPoint,
            point
        ]);
    }
}


function setupMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    const mobileRotationControls = document.getElementById('mobile-rotation-controls');
    
    // Function to update controls visibility
    function updateMobileControlsVisibility() {
        if (selectedObjects.length > 0 && !isSimulating) {
            mobileControls.classList.remove('hidden');
            mobileRotationControls.classList.remove('hidden');
        } else {
            mobileControls.classList.add('hidden');
            mobileRotationControls.classList.add('hidden');
        }
    }
    
    // Set up event listeners for mobile buttons
    document.querySelectorAll('.mobile-btn').forEach(btn => {
        ['touchstart', 'mousedown'].forEach(eventType => {
            btn.addEventListener(eventType, (e) => {
                e.preventDefault(); // Prevent default behavior
                
                if (selectedObjects.length === 0 || isSimulating) return;
                
                const moveStep = 0.5;
                const direction = btn.dataset.dir;
                
                switch (direction) {
                    case 'up':
                        moveSelectedObjects(0, 0, -moveStep);
                        break;
                    case 'down':
                        moveSelectedObjects(0, 0, moveStep);
                        break;
                    case 'left':
                        moveSelectedObjects(-moveStep, 0, 0);
                        break;
                    case 'right':
                        moveSelectedObjects(moveStep, 0, 0);
                        break;
                    case 'y-up':
                        moveSelectedObjects(0, moveStep, 0);
                        break;
                    case 'y-down':
                        moveSelectedObjects(0, -moveStep, 0);
                        break;
                }
            });
        });
    });
    
    // Set up rotation controls for mobile
    document.querySelectorAll('.mobile-rotate-btn').forEach(btn => {
        ['touchstart', 'mousedown'].forEach(eventType => {
            btn.addEventListener(eventType, (e) => {
                e.preventDefault();
                
                if (selectedObjects.length === 0 || isSimulating) return;
                
                const rotateStep = 15 * Math.PI / 180; // 15 degrees
                const axis = btn.dataset.axis;
                const direction = parseInt(btn.dataset.dir);
                
                rotateSelectedObjects(axis, rotateStep * direction);
            });
        });
    });
    
    // Override selection functions to update mobile controls visibility
    const originalSelectObject = selectObject;
    selectObject = function(object) {
        originalSelectObject(object);
        updateMobileControlsVisibility();
    };
    
    const originalClearSelection = clearSelection;
    clearSelection = function() {
        originalClearSelection();
        updateMobileControlsVisibility();
    };
    
    const originalSelectAdditionalObject = selectAdditionalObject;
    selectAdditionalObject = function(object) {
        originalSelectAdditionalObject(object);
        updateMobileControlsVisibility();
    };
    
    // Watch for simulation state changes
    const originalStartSimulation = startSimulation;
    startSimulation = function() {
        originalStartSimulation();
        updateMobileControlsVisibility();
    };
    
    const originalPauseSimulation = pauseSimulation;
    pauseSimulation = function() {
        originalPauseSimulation();
        updateMobileControlsVisibility();
    };
}

//
// Floating Motor Panel
//

function setupFloatingMotorPanel() {
    const panel = document.getElementById('motor-remote-panel');
    const panelHeader = document.getElementById('motor-panel-header');
    
    // Set up close button
    document.getElementById('close-motor-panel').addEventListener('click', () => {
        panel.classList.add('hidden');
    });
    
    // Set up show all motors button
    document.getElementById('show-all-motors-btn').addEventListener('click', () => {
        updateMotorRemotePanel(true); // Show all motors
    });
    
    // Make panel draggable
    panelHeader.addEventListener('mousedown', startDragging);
    panelHeader.addEventListener('touchstart', startDragging);
    
    // Prevent accidental selection of panel text
    panelHeader.addEventListener('selectstart', (e) => e.preventDefault());
    
    function startDragging(e) {
        e.preventDefault();
        isDragging = true;
        
        // Get initial positions
        if (e.type === 'touchstart') {
            dragStartX = e.touches[0].clientX;
            dragStartY = e.touches[0].clientY;
        } else {
            dragStartX = e.clientX;
            dragStartY = e.clientY;
        }
        
        // Get current panel position
        const rect = panel.getBoundingClientRect();
        panelStartX = rect.left;
        panelStartY = rect.top;
        
        // Add move and end event listeners
        document.addEventListener('mousemove', movePanel);
        document.addEventListener('touchmove', movePanel);
        document.addEventListener('mouseup', stopDragging);
        document.addEventListener('touchend', stopDragging);
    }
    
    function movePanel(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        let currentX, currentY;
        if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        } else {
            currentX = e.clientX;
            currentY = e.clientY;
        }
        
        // Calculate new position
        const deltaX = currentX - dragStartX;
        const deltaY = currentY - dragStartY;
        
        // Apply new position
        panel.style.left = (panelStartX + deltaX) + 'px';
        panel.style.top = (panelStartY + deltaY) + 'px';
    }
    
    function stopDragging() {
        isDragging = false;
        document.removeEventListener('mousemove', movePanel);
        document.removeEventListener('touchmove', movePanel);
        document.removeEventListener('mouseup', stopDragging);
        document.removeEventListener('touchend', stopDragging);
    }
}

// Update the floating motor remote panel
function updateMotorRemotePanel(showAllMotors = false) {
    const motorControls = document.getElementById('motor-remote-controls');
    
    // Clear current content
    motorControls.innerHTML = '';
    
    // Count all motors (regular + dual)
    const totalMotorCount = motors.length + dualMotors.filter(m => m.connections.length >= 2).length;
    
    if (totalMotorCount === 0) {
        motorControls.innerHTML = '<div class="text-center text-gray-500 dark:text-gray-400 py-2">No motors available</div>';
        document.getElementById('motor-remote-panel').classList.add('hidden');
        return;
    }
    
    // Determine which motors to show
    let motorsToShow = motors;
    let dualMotorsToShow = dualMotors.filter(m => m.connections.length >= 2); // Only show dual motors with both connections
    
    // Filter only selected motors unless showAllMotors is true
    if (!showAllMotors && selectedObjects.length > 0) {
        motorsToShow = motors.filter(motor => {
            return selectedObjects.includes(motor.object1) || selectedObjects.includes(motor.object2);
        });
        
        dualMotorsToShow = dualMotors.filter(motor => {
            return selectedObjects.includes(motor.motor);
        });
    }
    
    // If no motors filtered, show all or a message
    if (motorsToShow.length === 0 && dualMotorsToShow.length === 0) {
        if (showAllMotors) {
            motorsToShow = motors;
            dualMotorsToShow = dualMotors.filter(m => m.connections.length >= 2);
        } else {
            motorControls.innerHTML = '<div class="text-center text-gray-500 dark:text-gray-400 py-2">No motors for selected objects</div>';
            return;
        }
    }
    
    // Add regular motors
    motorsToShow.forEach((motor, index) => {
        const motorControl = document.createElement('div');
        motorControl.className = 'mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded';
        motorControl.dataset.motorId = motor.id;
        
        // Get object names/identifiers
        const obj1Name = getObjectDisplayName(motor.object1);
        const obj2Name = getObjectDisplayName(motor.object2);
        
        // Show more detailed motor info including force and axis
        motorControl.innerHTML = `
            <div class="text-sm font-medium mb-1">Motor ${index + 1}: ${obj1Name} → ${obj2Name}</div>
            <div class="text-xs mb-1">Axis: ${motor.axis.toUpperCase()}, Force: ${(motor.force || 10).toFixed(1)} N·m</div>
            <div class="flex justify-between items-center">
                <button class="motor-remote-ccw px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-opacity-90">⟲ CCW</button>
                <div class="text-xs">Speed: <span class="motor-speed-value">${motor.speed.toFixed(1)}</span></div>
                <button class="motor-remote-cw px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-opacity-90">⟳ CW</button>
            </div>
            <div class="mt-1">
                <input type="range" class="motor-remote-slider w-full" min="-10" max="10" step="0.1" value="${motor.speed}">
            </div>
            <div class="flex justify-center mt-1">
                <button class="motor-remote-stop px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-opacity-90">■ Stop</button>
            </div>
        `;
        
        motorControls.appendChild(motorControl);
        
        // Add event listeners to the controls in this motor
        const slider = motorControl.querySelector('.motor-remote-slider');
        const speedValue = motorControl.querySelector('.motor-speed-value');
        
        // Slider for speed control
        slider.addEventListener('input', () => {
            const speed = parseFloat(slider.value);
            speedValue.textContent = speed.toFixed(1);
            setMotorSpeedById(motor.id, speed);
        });
        
        // Direction buttons
        motorControl.querySelector('.motor-remote-ccw').addEventListener('click', () => {
            const currentSpeed = Math.abs(motor.speed);
            setMotorSpeedById(motor.id, -currentSpeed || -2); // Use -2 as default if speed is 0
            updateControlValues(motorControl, motor);
        });
        
        motorControl.querySelector('.motor-remote-cw').addEventListener('click', () => {
            const currentSpeed = Math.abs(motor.speed);
            setMotorSpeedById(motor.id, currentSpeed || 2); // Use 2 as default if speed is 0
            updateControlValues(motorControl, motor);
        });
        
        motorControl.querySelector('.motor-remote-stop').addEventListener('click', () => {
            setMotorSpeedById(motor.id, 0);
            updateControlValues(motorControl, motor);
        });
    });
    
    // Add dual motors
    dualMotorsToShow.forEach((dualMotor, index) => {
        const motorControl = document.createElement('div');
        motorControl.className = 'mb-3 p-2 bg-pink-50 dark:bg-pink-900 rounded';
        motorControl.dataset.dualMotorId = dualMotor.id;
        
        // Get connection info
        const connectionCount = dualMotor.connections.length;
        
        // Show dual motor info
        motorControl.innerHTML = `
            <div class="text-sm font-medium mb-1">Dual Motor ${dualMotor.id}</div>
            <div class="text-xs mb-1">Force: ${(dualMotor.force || 20).toFixed(1)} N·m, Connections: ${connectionCount}</div>
            <div class="flex justify-between items-center">
                <button class="dual-motor-remote-ccw px-2 py-1 bg-pink-600 text-white text-xs rounded hover:bg-opacity-90">⟲ CCW</button>
                <div class="text-xs">Speed: <span class="dual-motor-speed-value">${dualMotor.speed.toFixed(1)}</span></div>
                <button class="dual-motor-remote-cw px-2 py-1 bg-pink-600 text-white text-xs rounded hover:bg-opacity-90">⟳ CW</button>
            </div>
            <div class="mt-1">
                <input type="range" class="dual-motor-remote-slider w-full" min="-10" max="10" step="0.1" value="${dualMotor.speed}">
            </div>
            <div class="flex justify-center mt-1">
                <button class="dual-motor-remote-stop px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-opacity-90">■ Stop</button>
            </div>
        `;
        
        motorControls.appendChild(motorControl);
        
        // Add event listeners to the controls in this dual motor
        const slider = motorControl.querySelector('.dual-motor-remote-slider');
        const speedValue = motorControl.querySelector('.dual-motor-speed-value');
        
        // Slider for speed control
        slider.addEventListener('input', () => {
            const speed = parseFloat(slider.value);
            speedValue.textContent = speed.toFixed(1);
            setDualMotorSpeedById(dualMotor.id, speed);
        });
        
        // Direction buttons
        motorControl.querySelector('.dual-motor-remote-ccw').addEventListener('click', () => {
            const currentSpeed = Math.abs(dualMotor.speed);
            setDualMotorSpeedById(dualMotor.id, -currentSpeed || -3); // Use -3 as default if speed is 0
            updateDualMotorControlValues(motorControl, dualMotor);
        });
        
        motorControl.querySelector('.dual-motor-remote-cw').addEventListener('click', () => {
            const currentSpeed = Math.abs(dualMotor.speed);
            setDualMotorSpeedById(dualMotor.id, currentSpeed || 3); // Use 3 as default if speed is 0
            updateDualMotorControlValues(motorControl, dualMotor);
        });
        
        motorControl.querySelector('.dual-motor-remote-stop').addEventListener('click', () => {
            setDualMotorSpeedById(dualMotor.id, 0);
            updateDualMotorControlValues(motorControl, dualMotor);
        });
    });
    
    // Make panel visible
    document.getElementById('motor-remote-panel').classList.remove('hidden');
    
    // Helper function to update control values
    function updateControlValues(controlElement, motor) {
        const slider = controlElement.querySelector('.motor-remote-slider');
        const speedValue = controlElement.querySelector('.motor-speed-value');
        
        slider.value = motor.speed;
        speedValue.textContent = motor.speed.toFixed(1);
    }
    
    // Helper function to update dual motor control values
    function updateDualMotorControlValues(controlElement, dualMotor) {
        const slider = controlElement.querySelector('.dual-motor-remote-slider');
        const speedValue = controlElement.querySelector('.dual-motor-speed-value');
        
        slider.value = dualMotor.speed;
        speedValue.textContent = dualMotor.speed.toFixed(1);
    }
    
    // Helper function to get a display name for an object
    function getObjectDisplayName(obj) {
        if (!obj) return 'Unknown';
        
        let typeName = obj.userData.type;
        if (typeName === 'box') typeName = 'Cube';
        else if (typeName === 'fbx') typeName = 'Model';
        
        return `${typeName.charAt(0).toUpperCase() + typeName.slice(1)} ${obj.userData.id}`;
    }
}

// Set motor speed by ID
function setMotorSpeedById(motorId, speed) {
    const motor = motors.find(m => m.id === motorId);
    if (!motor) return;
    
    motor.speed = speed;
    
    if (isSimulating) {
        if (speed === 0) {
            motor.constraint.disableMotor();
        } else {
            motor.constraint.enableMotor();
            motor.constraint.setMotorSpeed(speed);
            motor.constraint.setMotorMaxForce(motor.force || 10);
        }
    }
    
    // Update the connections list
    updateConnectionsList();
}

// Set dual motor speed by ID
function setDualMotorSpeedById(dualMotorId, speed) {
    const dualMotor = dualMotors.find(m => m.id === dualMotorId);
    if (!dualMotor) return;
    
    dualMotor.speed = speed;
    dualMotor.motor.userData.speed = speed;
    
    if (isSimulating && dualMotor.motorConstraint) {
        if (speed === 0) {
            dualMotor.motorConstraint.disableMotor();
        } else {
            dualMotor.motorConstraint.enableMotor();
            dualMotor.motorConstraint.setMotorSpeed(speed);
            dualMotor.motorConstraint.setMotorMaxForce(dualMotor.force || 20);
        }
    }
    
    // Update dual motor controls if this motor is selected
    if (selectedObjects.some(obj => obj.userData.id === dualMotorId)) {
        document.getElementById('dual-motor-speed-slider').value = speed;
        document.getElementById('dual-motor-speed-value').textContent = `${speed.toFixed(1)} rad/s`;
    }
}

// Update motor force from slider
function updateMotorForce() {
    const force = parseFloat(document.getElementById('motor-force-slider').value);
    document.getElementById('motor-force-value').textContent = `${force.toFixed(1)} N·m`;
    
    // Find motors that have any of the selected objects
    const updatedMotors = [];
    
    for (const motor of motors) {
        if (selectedObjects.includes(motor.object1) || selectedObjects.includes(motor.object2)) {
            motor.force = force;
            
            if (isSimulating && motor.speed !== 0) {
                // Apply the force to the constraint
                motor.constraint.setMotorMaxForce(force);
            }
            
            updatedMotors.push(motor);
        }
    }
    
    // Update floating motor panel
    updateMotorRemotePanel();
    
    if (updatedMotors.length > 0) {
        showToast(`Updated force for ${updatedMotors.length} motor${updatedMotors.length > 1 ? 's' : ''}`);
    }
}


// Show a toast notification
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    // Set message
    toastMessage.textContent = message;
    
    // Set color based on error status
    if (isError) {
        toast.classList.remove('bg-green-500');
        toast.classList.add('bg-red-500');
    } else {
        toast.classList.remove('bg-red-500');
        toast.classList.add('bg-green-500');
    }
    
    // Show toast
    toast.classList.remove('hidden');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}


// Initialize everything when the page is loaded
window.addEventListener('DOMContentLoaded', init);
