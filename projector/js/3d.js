
// Initialize the 3D scene
let scene, camera, renderer, controls, transformControls, world, raycaster, mouse;
let meshes = [], bodies = [];
let isSimulating = false;
let timeStep = 1/60;
let lastCallTime;
let selectedColor = "#5D5CDE";
let objectIdCounter = 0;
let selectedObjects = [];
let outlines = [];
let currentShapeType = "box"; // Default shape type


function createGround() {
    // Three.js ground
    const groundGeometry = new THREE.BoxGeometry(30, 1, 30);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: document.documentElement.classList.contains('dark') ? 0x333333 : 0xcccccc 
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.receiveShadow = true;
    groundMesh.position.y = -0.5;
    scene.add(groundMesh);
    
    // Create a grid helper
    const grid = new THREE.GridHelper(30, 30, 0x000000, 0x888888);
    grid.position.y = 0.01; // Just above the ground
    scene.add(grid);
    
    // Cannon.js ground
    const groundShape = new CANNON.Box(new CANNON.Vec3(15, 0.5, 15));
    const groundBody = new CANNON.Body({ mass: 0 }); // mass 0 makes it static
    groundBody.addShape(groundShape);
    groundBody.position.set(0, -0.5, 0);
    world.addBody(groundBody);
    createShape("box");
    deleteObject(0);
}


function startSimulation() {

    recordPositions();

    isSimulating = true;
    lastCallTime = performance.now();
    
    // Remove transform controls
    transformControls.detach();
    
    // Remove selection outlines
    clearSelectionOutlines();
    
    // Enable physics for all bodies
    bodies.forEach(body => {
        // Don't wake up fixed objects
        if (body.type !== CANNON.Body.STATIC) {
            body.wakeUp();
        }
    });
    
    // Display the floating motor panel if there are motors
    if (motors.length > 0) {
        document.getElementById('motor-remote-panel').classList.remove('hidden');
        updateMotorRemotePanel();
    }
}

function pauseSimulation() {
    isSimulating = false;
    
    // Put all bodies to sleep
    bodies.forEach(body => {
        body.sleep();
    });
}

function resetSimulation() {
    // Clear selection
    clearSelection();
    
    // Remove selection outlines
    clearSelectionOutlines();
    
    // Remove all constraints
    motors.forEach(motor => {
        if (motor.constraint) {
            world.removeConstraint(motor.constraint);
        }
    });
    
    sticks.forEach(stick => {
        if (stick.constraint) {
            world.removeConstraint(stick.constraint);
        }
    });
    
    glues.forEach(glue => {
        if (glue.constraint) {
            world.removeConstraint(glue.constraint);
        }
    });
    
    // Remove dual motor constraints
    dualMotors.forEach(motor => {
        if (motor.connections) {
            motor.connections.forEach(conn => {
                if (conn.constraint) {
                    world.removeConstraint(conn.constraint);
                }
            });
        }
    });
    
    // Remove all shapes
    for (let i = meshes.length - 1; i >= 0; i--) {
        scene.remove(meshes[i]);
        if (i < bodies.length) {
            world.removeBody(bodies[i]);
        }
    }
    
    // Remove all stick visualizations
    sticks.forEach(stick => {
        if (stick.line) {
            scene.remove(stick.line);
        }
    });
    
    // Remove all motor visualizations
    motors.forEach(motor => {
        if (motor.line) {
            scene.remove(motor.line);
        }
        if (motor.axisVisualization) {
            scene.remove(motor.axisVisualization);
        }
    });
    
    // Remove all glue visualizations
    glues.forEach(glue => {
        if (glue.line) {
            scene.remove(glue.line);
        }
    });
    
    // Remove all fixed indicators
    fixedObjects.forEach(obj => {
        if (obj.userData.fixedIndicator) {
            scene.remove(obj.userData.fixedIndicator);
        }
    });
    
    meshes = [];
    bodies = [];
    selectedObjects = [];
    initialPositions = [];
    sticks = [];
    motors = [];
    glues = [];
    dualMotors = [];
    fixedObjects = [];
    
    // Clear object list
    document.getElementById('object-list').innerHTML = '<div class="text-center text-gray-500 dark:text-gray-400 text-sm">No objects yet</div>';
    
    // Clear connections list
    document.getElementById('connection-list').innerHTML = '<div class="text-center text-gray-500 dark:text-gray-400 text-sm">No connections</div>';
    
    // Reset object count
    updateObjectCount();
    
    // Clear transform controls
    transformControls.detach();
    
    // Stop simulation
    isSimulating = false;
    
    // Hide motor controls
    document.getElementById('motor-speed-controls').classList.add('hidden');
    
    // Hide dual motor controls
    document.getElementById('dual-motor-controls').classList.add('hidden');
    
    // Hide floating motor panel
    document.getElementById('motor-remote-panel').classList.add('hidden');
    // Clear motor remote panel
    document.getElementById('motor-remote-controls').innerHTML = '<div class="text-center text-gray-500 dark:text-gray-400 py-2">No motors available</div>';
    
    // Reset dual motor attach state
    dualMotorAttachState = {
        active: false,
        motor: null,
        cube: null
    };
}



function onObjectClick(event) {
    if (isSimulating){ return }; // Don't allow selection during simulation
    
    if (transformControls && transformControls.dragging){ return}; // Don't allow selection during transform
    
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Calculate objects intersecting the picking ray
    let intersects = raycaster.intersectObjects(meshes, true);
    
    // Improve object selection by trying with larger thresholds if nothing was clicked
    if (intersects.length === 0) {
        // Try with a larger precision for lines and points
        raycaster.params.Line.threshold = 0.5;
        raycaster.params.Points.threshold = 2;
        intersects = raycaster.intersectObjects(meshes, true);
        
        // Reset thresholds after attempt
        raycaster.params.Line.threshold = 0.1;
        raycaster.params.Points.threshold = 1;
    }
    
    // Handle dual motor attachment
    if (dualMotorAttachState.active) {
        handleDualMotorAttachClick(intersects);
        return;
    }
    
    // Handle connection modes
    if (connectionMode) {
        handleConnectionClick(intersects);
        return;
    }
    
    // Check if holding shift for multi-select
    if (!event.shiftKey) {
        clearSelection();
    }
    if (intersects.length > 0) {
        
        // Find the root object (for FBX models or compound objects)
        let object = intersects[0].object;
        
        // Check for dual motor cube click - select the parent motor
        if (object.userData && object.userData.isDualMotorCube) {
            // Find the parent dual motor
            const parentMotor = meshes.find(mesh => 
                mesh.userData.isDualMotor && 
                (mesh.userData.cube1 === object || mesh.userData.cube2 === object)
            );
            
            if (parentMotor) {
                object = parentMotor;
            }
        }
        
        // Traverse up to find the root object that has our userData
        while (object && (!object.userData || !object.userData.id) && object.parent) {
            object = object.parent;
        }
        if (object && object.userData && object.userData.id !== undefined) {
            // Find the top-level mesh
            const topLevelObject = meshes.find(mesh => mesh.userData.id === object.userData.id);
            
            if (topLevelObject) {
                // Check if already selected (for multi-select)
                const index = selectedObjects.indexOf(topLevelObject);
                
                if (index === -1) {
                    // Add to selection
                    selectAdditionalObject(topLevelObject);
                } else if (event.shiftKey) {
                    // Remove from selection if shift-clicking again
                    deselectObject(topLevelObject);
                }
            }
        }
    }
    
    // Update position and dimension inputs based on selection
    if (selectedObjects.length === 1) {
        updatePositionInputs(selectedObjects[0]);
        updateDimensionInputs(selectedObjects[0]);
    }
    
    // Update dual motor controls visibility
    updateDualMotorControlsVisibility();
}

// Select an object (adding to existing selection)
function selectAdditionalObject(object) {
    if (!object) return;
    
    // Add to selection array
    selectedObjects.push(object);
    
    // Create selection outline
    createSelectionOutline(object);
    
    // Highlight in object list
    const listItem = document.querySelector(`#object-list div[data-id="${object.userData.id}"]`);
    if (listItem) {
        listItem.classList.add('bg-blue-100', 'dark:bg-blue-900');
    }
    
    // If this is the first selected object, attach transform controls
    if (selectedObjects.length === 1) {
        transformControls.attach(object);
        
        // Update position inputs
        updatePositionInputs(object);
        
        // Check if it's part of a motor to show motor controls
        updateMotorControlsVisibility();
        
        // Check if it's a dual motor to show dual motor controls
        updateDualMotorControlsVisibility();
    }
}

// Select a single object (clearing any existing selection)
async function selectObject(object) {
    if (!object) return;
    
    // Clear existing selection
    clearSelection();
    
    // Set as selected
    selectedObjects = [object];
    
    // Create selection outline
    createSelectionOutline(object);
    
    // Highlight in object list
    const listItem = document.querySelector(`#object-list div[data-id="${object.userData.id}"]`);
    if (listItem) {
        listItem.classList.add('bg-blue-100', 'dark:bg-blue-900');
    }
    
    // Attach transform controls
    transformControls.attach(object);
    
    // Update position inputs
    updatePositionInputs(object);
    
    // Update dimension inputs
    updateDimensionInputs(object);
    
    // Check if it's part of a motor to show motor controls
    updateMotorControlsVisibility();
    
    // Check if it's a dual motor to show dual motor controls
    updateDualMotorControlsVisibility();
}

// Check if any selected object is part of a motor and show/hide motor controls
function updateMotorControlsVisibility() {
    const motorControlsDiv = document.getElementById('motor-speed-controls');
    
    // Check if any selected object is part of a motor
    let foundMotor = null;
    
    for (const motor of motors) {
        if (selectedObjects.includes(motor.object1) || selectedObjects.includes(motor.object2)) {
            foundMotor = motor;
            break;
        }
    }
    
    if (foundMotor) {
        motorControlsDiv.classList.remove('hidden');
        
        // Update slider and axis selector
        document.getElementById('motor-speed-slider').value = foundMotor.speed;
        document.getElementById('motor-speed-value').textContent = `${foundMotor.speed.toFixed(2)} rad/s`;
        document.getElementById('motor-axis-select').value = foundMotor.axis;
        
        // Update force slider
        document.getElementById('motor-force-slider').value = foundMotor.force || 10;
        document.getElementById('motor-force-value').textContent = `${(foundMotor.force || 10).toFixed(1)} N·m`;
    } else {
        motorControlsDiv.classList.add('hidden');
    }
}

// Deselect a specific object
function deselectObject(object) {
    if (!object) return;
    
    const index = selectedObjects.indexOf(object);
    if (index === -1) return;
    
    // Remove from array
    selectedObjects.splice(index, 1);
    
    // Remove its outline
    const outlineIndex = outlines.findIndex(o => o.userData.targetId === object.userData.id);
    if (outlineIndex !== -1) {
        scene.remove(outlines[outlineIndex]);
        outlines.splice(outlineIndex, 1);
    }
    
    // Remove highlight from object list
    const listItem = document.querySelector(`#object-list div[data-id="${object.userData.id}"]`);
    if (listItem) {
        listItem.classList.remove('bg-blue-100', 'dark:bg-blue-900');
    }
    
    // Update transform controls
    if (selectedObjects.length > 0) {
        transformControls.attach(selectedObjects[0]);
    } else {
        transformControls.detach();
    }
    
    // Update motor controls visibility
    updateMotorControlsVisibility();
    
    // Update dual motor controls visibility
    updateDualMotorControlsVisibility();
}

// Clear all selections
function clearSelection() {
    // Remove highlights from object list
    selectedObjects.forEach(obj => {
        const listItem = document.querySelector(`#object-list div[data-id="${obj.userData.id}"]`);
        if (listItem) {
            listItem.classList.remove('bg-blue-100', 'dark:bg-blue-900');
        }
    });
    
    // Clear selection array
    selectedObjects = [];
    
    // Remove selection outlines
    clearSelectionOutlines();
    
    // Detach transform controls
    transformControls.detach();
    
    // Hide motor controls
    document.getElementById('motor-speed-controls').classList.add('hidden');
    
    // Hide dual motor controls
    document.getElementById('dual-motor-controls').classList.add('hidden');
}

// Create selection outline for an object
function createSelectionOutline(object) {
    if (!object) return;
    
    // Create outline mesh
    let geometry;
    
    if (object.geometry) {
        // For simple shapes, clone the geometry
        geometry = object.geometry.clone();
    } else if (object.userData.isCompound) {
        // For compound objects like car or wheel
        const boundingBox = new THREE.Box3().setFromObject(object);
        const size = boundingBox.getSize(new THREE.Vector3());
        geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        
        // Adjust position to center of bounding box
        const center = boundingBox.getCenter(new THREE.Vector3());
        const offset = center.clone().sub(object.position);
        geometry.translate(offset.x, offset.y, offset.z);
    } else {
        // For complex objects (e.g. FBX models) use a bounding box
        const boundingBox = new THREE.Box3().setFromObject(object);
        const size = boundingBox.getSize(new THREE.Vector3());
        geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        
        // Adjust position to center of bounding box
        const center = boundingBox.getCenter(new THREE.Vector3());
        const offset = center.clone().sub(object.position);
        geometry.translate(offset.x, offset.y, offset.z);
    }
    
    const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        depthTest: false
    });
    
    const outline = new THREE.Mesh(geometry, material);
    outline.position.copy(object.position);
    outline.quaternion.copy(object.quaternion);
    outline.scale.copy(object.scale);
    outline.userData = { 
        isOutline: true,
        targetId: object.userData.id
    };
    
    scene.add(outline);
    outlines.push(outline);
}

// Clear all selection outlines
function clearSelectionOutlines() {
    outlines.forEach(outline => {
        scene.remove(outline);
    });
    outlines = [];
}

// Update selection outlines for all selected objects
function updateSelectionOutlines() {
    clearSelectionOutlines();
    selectedObjects.forEach(obj => {
        createSelectionOutline(obj);
    });
}

function onKeyDown(event) {
    // Don't process key events when an input field is focused
    if (document.activeElement.tagName === 'INPUT') return;
    
    if (isSimulating) return;
    
    const moveStep = 0.5;
    const rotateStep = 15 * Math.PI / 180; // 15 degrees in radians
    
    // Movement controls (arrow keys and W/S)
    switch (event.key) {
        // Position controls
        case 'ArrowUp':
            moveSelectedObjects(0, 0, -moveStep);
            event.preventDefault()
            break;
        case 'ArrowDown':
            moveSelectedObjects(0, 0, moveStep);
            event.preventDefault()
            break;
        case 'ArrowLeft':
            moveSelectedObjects(-moveStep, 0, 0);
            break;
        case 'ArrowRight':
            moveSelectedObjects(moveStep, 0, 0);
            break;
        case 'w': // Up
            moveSelectedObjects(0, moveStep, 0);
            break;
        case 's': // Down
            moveSelectedObjects(0, -moveStep, 0);
            break;
        
        // Rotation controls (Q/E, A/D, Z/C)
        case 'q': // X-axis negative
            rotateSelectedObjects('x', -rotateStep);
            break;
        case 'e': // X-axis positive
            rotateSelectedObjects('x', rotateStep);
            break;
        case 'a': // Y-axis negative
            rotateSelectedObjects('y', -rotateStep);
            break;
        case 'd': // Y-axis positive
            rotateSelectedObjects('y', rotateStep);
            break;
        case 'z': // Z-axis negative
            rotateSelectedObjects('z', -rotateStep);
            break;
        case 'c': // Z-axis positive
            rotateSelectedObjects('z', rotateStep);
            break;
        
        // Delete selected objects
        case 'Delete':
        case 'Backspace':
            // Delete all selected objects
            const objectsToDelete = [...selectedObjects]; // Create a copy
            objectsToDelete.forEach(obj => {
                deleteObject(obj.userData.id);
            });
            clearSelection();
            return;
        
        // Cancel connection mode
        case 'Escape':
            if (connectionMode) {
                cancelConnectionMode();
            } else if (dualMotorAttachState.active) {
                cancelDualMotorAttachMode();
            }
            break;
    }
}

// Move all selected objects by the given amount
function moveSelectedObjects(dx, dy, dz) {
    const moveVector = new THREE.Vector3(dx, dy, dz);
    
    selectedObjects.forEach(obj => {
        const objId = obj.userData.id;
        const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === objId);
        
        if (bodyIndex !== -1) {
            // Update physics body
            const body = bodies[bodyIndex];
            body.position.x += dx;
            body.position.y += dy;
            body.position.z += dz;
            
            // Update visual mesh
            obj.position.x += dx;
            obj.position.y += dy;
            obj.position.z += dz;
        }
    });
    
    // Update position inputs for the first selected object
    if (selectedObjects.length > 0) {
        updatePositionInputs(selectedObjects[0]);
    }else{
        camera.position.x += dx
        camera.position.y += dy
        camera.position.z += dz
    }
    
    // Update selection outlines
    outlines.forEach(outline => {
        outline.position.add(moveVector);
    });
    
    // Update transform controls position
    if (transformControls.object) {
        transformControls.update();
    }
    
    // Update connections
    updateConnections();
    
    // Update fixed indicators
    updateFixedIndicators();
}

// Update physics
function updatePhysics() {
    // Update motor constraints
    motors.forEach(motor => {
        if (motor.constraint && motor.speed !== 0 && isSimulating) {
            motor.constraint.enableMotor();
            motor.constraint.setMotorSpeed(motor.speed);
            motor.constraint.setMotorMaxForce(motor.force || 10);
        }
    });
    
    // Update dual motor constraints
    dualMotors.forEach(dualMotor => {
        if (dualMotor.motorConstraint && dualMotor.speed !== 0 && isSimulating) {
            dualMotor.motorConstraint.enableMotor();
            dualMotor.motorConstraint.setMotorSpeed(dualMotor.speed);
            dualMotor.motorConstraint.setMotorMaxForce(dualMotor.force || 20);
        }
    });
    
    if (!isSimulating) {
        return;
    }
    
    // Compute time since last step
    const time = performance.now();
    if (lastCallTime === undefined) {
        lastCallTime = time;
        return;
    }
    
    const dt = Math.min(time - lastCallTime, 1000) / 1000; // max dt is 1 second
    world.step(timeStep, dt);
    lastCallTime = time;
    
    // Update mesh positions to match physics bodies
    for (let i = 0; i < meshes.length && i < bodies.length; i++) {
        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);
    }
    
    // Update connections
    updateConnections();
    
    // Update fixed indicators
    updateFixedIndicators();
}
// Update all connections (stick, motor, glue)
function updateConnections() {
    // Update stick lines
    sticks.forEach(stick => {
        if (stick.line) {
            stick.line.geometry.setFromPoints([
                stick.object1.position,
                stick.object2.position
            ]);
        }
    });
    
    // Update motor lines
    motors.forEach(motor => {
        if (motor.line) {
            motor.line.geometry.setFromPoints([
                motor.object1.position,
                motor.object2.position
            ]);
        }
        
        // Update motor visualization
        if (motor.axisVisualization) {
            // Position the axis visualization at the center point between the two objects
            const midpoint = new THREE.Vector3().addVectors(
                motor.object1.position,
                motor.object2.position
            ).multiplyScalar(0.5);
            
            motor.axisVisualization.position.copy(midpoint);
        }
    });
    
    // Update glue connections
    glues.forEach(glue => {
        if (glue.line) {
            glue.line.geometry.setFromPoints([
                glue.object1.position,
                glue.object2.position
            ]);
        }
        
        // If objects are connected with a glue, update the second object's position to maintain relative positioning
        if (isSimulating) {
            // In simulation, the physics constraint handles this
        } else {
            // When not simulating, manually update the follower object
            const obj1 = glue.object1;
            const obj2 = glue.object2;
            
            // Calculate the new position and rotation based on the relative transform
            const newPosition = new THREE.Vector3();
            const newQuaternion = new THREE.Quaternion();
            
            // Apply the leader's transformation and then the relative transformation
            newPosition.copy(obj1.position);
            if (glue.relativePosition) {
                newPosition.add(
                    glue.relativePosition.clone().applyQuaternion(obj1.quaternion)
                );
            } else {
                console.warn('Missing relativePosition for glue connection', glue);
            }
            
            // Apply rotation only if relativeQuaternion exists
            if (glue.relativeQuaternion) {
                newQuaternion.multiplyQuaternions(obj1.quaternion, glue.relativeQuaternion);
            } else {
                newQuaternion.copy(obj1.quaternion);
                console.warn('Missing relativeQuaternion for glue connection', glue);
            }
            
            // Update the follower's position and rotation
            obj2.position.copy(newPosition);
            obj2.quaternion.copy(newQuaternion);
            
            // Update the physics body
            const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === obj2.userData.id);
            if (bodyIndex !== -1) {
                bodies[bodyIndex].position.copy(newPosition);
                bodies[bodyIndex].quaternion.copy(newQuaternion);
            }
        }
    });
}
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Update OrbitControls
    updatePhysics();
    updateConstraintVisuals();
    renderer.render(scene, camera);
}
