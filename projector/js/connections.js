// Connection-related arrays
let sticks = [];
let motors = [];
let glues = []; // New array for glue connections
let dualMotors = []; // New array for dual motors
let fixedObjects = []; // New array for fixed objects
let connectionMode = null; // 'stick', 'motor', 'rigid-stick', 'rigid-motor', 'glue', or 'dual-motor-attach'
let tempConnectionLine = null;
let connectionStiffness = 50; // Default stiffness value (0-100 scale)
let motorForce = 10; // Default motor force value (N·m)
// Dual motor attachment state
let dualMotorAttachState = {
    active: false,
    motor: null,
    cube: null // 'cube1' or 'cube2'
};



//
// Connection Functions (Stick, Motor, Glue)
//

// Start flexible stick creation mode
function startStickMode() {
    if (isSimulating) {
        showToast("Cannot create connections during simulation", true);
        return;
    }
    
    if (connectionMode === 'stick') {
        cancelConnectionMode();
        return;
    }
    
    connectionMode = 'stick';
    showToast("Flexible Stick mode: Select first object");
    
    // Clear current selection
    clearSelection();
}

// Start rigid stick creation mode
function startRigidStickMode() {
    if (isSimulating) {
        showToast("Cannot create connections during simulation", true);
        return;
    }
    
    if (connectionMode === 'rigid-stick') {
        cancelConnectionMode();
        return;
    }
    
    connectionMode = 'rigid-stick';
    showToast("Rigid Stick mode: Select first object");
    
    // Clear current selection
    clearSelection();
}

// Start flexible motor creation mode
function startMotorMode() {
    if (isSimulating) {
        showToast("Cannot create connections during simulation", true);
        return;
    }
    
    if (connectionMode === 'motor') {
        cancelConnectionMode();
        return;
    }
    
    connectionMode = 'motor';
    showToast("Flexible Motor mode: Select first object");
    
    // Clear current selection
    clearSelection();
}

// Start rigid motor creation mode
function startRigidMotorMode() {
    if (isSimulating) {
        showToast("Cannot create connections during simulation", true);
        return;
    }
    
    if (connectionMode === 'rigid-motor') {
        cancelConnectionMode();
        return;
    }
    
    connectionMode = 'rigid-motor';
    showToast("Rigid Motor mode: Select first object");
    
    // Clear current selection
    clearSelection();
}

// Start glue creation mode
function startGlueMode() {
    if (isSimulating) {
        showToast("Cannot create connections during simulation", true);
        return;
    }
    
    if (connectionMode === 'glue') {
        cancelConnectionMode();
        return;
    }
    
    connectionMode = 'glue';
    showToast("Glue mode: Select leader object");
    
    // Clear current selection
    clearSelection();
}

// Update connection stiffness
function updateConnectionStiffness() {
    const stiffnessSlider = document.getElementById('connection-stiffness');
    const stiffnessValue = document.getElementById('stiffness-value');
    
    connectionStiffness = parseFloat(stiffnessSlider.value);
    stiffnessValue.textContent = connectionStiffness.toFixed(1);
    
    // Update selected connections if any
    if (selectedObjects.length === 0) return;
    
    // Find sticks connected to selected objects
    let updatedSticks = 0;
    let updatedMotors = 0;
    
    // Update sticks
    for (const stick of sticks) {
        if (selectedObjects.includes(stick.object1) || selectedObjects.includes(stick.object2)) {
            stick.stiffness = connectionStiffness;
            updateStickProperties(stick);
            updatedSticks++;
        }
    }
    
    // Update motors
    for (const motor of motors) {
        if (selectedObjects.includes(motor.object1) || selectedObjects.includes(motor.object2)) {
            motor.stiffness = connectionStiffness;
            updateMotorProperties(motor);
            updatedMotors++;
        }
    }
    
    if (updatedSticks > 0 || updatedMotors > 0) {
        let message = "Updated stiffness for ";
        if (updatedSticks > 0) {
            message += `${updatedSticks} stick${updatedSticks > 1 ? 's' : ''}`;
        }
        if (updatedMotors > 0) {
            message += updatedSticks > 0 ? " and " : "";
            message += `${updatedMotors} motor${updatedMotors > 1 ? 's' : ''}`;
        }
        showToast(message);
        
        // Update connections list
        updateConnectionsList();
    }
}

// Update stick properties based on stiffness
function updateStickProperties(stick) {
    if (!stick || !stick.constraint) return;
    
    // If it's a rigid stick, use a LockConstraint for true rigidity
    if (stick.isRigid && stick.constraint.type !== CANNON.PointToPointConstraint.prototype.type) {
        // Already using the right constraint type
        return;
    } else if (stick.isRigid) {
        // Need to upgrade from PointToPointConstraint to LockConstraint
        
        // Remove the old constraint
        world.removeConstraint(stick.constraint);
        
        // Create a LockConstraint for complete rigidity
        const body1 = bodies.find(body => body.userData && body.userData.id === stick.object1.userData.id);
        const body2 = bodies.find(body => body.userData && body.userData.id === stick.object2.userData.id);
        
        if (!body1 || !body2) return;
        
        // Create the lock constraint
        const lockConstraint = new CANNON.LockConstraint(body1, body2);
        world.addConstraint(lockConstraint);
        
        // Update the stick object
        stick.constraint = lockConstraint;
        
        // Update visual appearance
        if (stick.line) {
            stick.line.material.color.set(0x00aa00); // Darker green for rigid sticks
            stick.line.material.linewidth = 3;
        }
        
        return;
    }
    
    // For flexible sticks, use a PointToPointConstraint with adjustable parameters
    // Convert stiffness (0-100) to actual physics values
    const stiffnessValue = 100 * Math.pow(stick.stiffness / 50, 2); // Non-linear scaling for better feel
    
    stick.constraint.stiffness = stiffnessValue;
    stick.constraint.relaxation = 3 / (stiffnessValue + 1);
    stick.constraint.damping = 0.5;
    
    // Update visual appearance
    if (stick.line) {
        stick.line.material.color.set(0x00ff00); // Bright green for flexible sticks
        stick.line.material.linewidth = 2;
    }
}

// Update motor properties based on stiffness
function updateMotorProperties(motor) {
    if (!motor || !motor.constraint) return;
    
    // For rigid motors, use a HingeConstraint with high stiffness
    if (motor.isRigid) {
        motor.constraint.stiffness = 1000000;
        motor.constraint.relaxation = 0;
        
        // Update visual appearance
        if (motor.line) {
            motor.line.material.color.set(0x0000aa); // Darker blue for rigid motors
            motor.line.material.linewidth = 3;
        }
        return;
    }
    
    // For flexible motors, adjust the stiffness
    // Convert stiffness (0-100) to actual physics values
    const stiffnessValue = 100 * Math.pow(motor.stiffness / 50, 2); // Non-linear scaling for better feel
    
    motor.constraint.stiffness = stiffnessValue;
    motor.constraint.relaxation = 3 / (stiffnessValue + 1);
    
    // Update visual appearance
    if (motor.line) {
        motor.line.material.color.set(0x0000ff); // Bright blue for flexible motors
        motor.line.material.linewidth = 2;
    }
}

// Cancel connection mode
function cancelConnectionMode() {
    connectionMode = null;
    
    // Remove temporary connection line if it exists
    if (tempConnectionLine) {
        scene.remove(tempConnectionLine);
        tempConnectionLine = null;
    }
    
    showToast("Connection mode cancelled");
}
let firstposition, secondposition;
// Handle clicks during connection mode
function handleConnectionClick(intersects) {
    if (intersects.length === 0) {
        showToast("If wanna exit connect mode,press ESC")
    }
    
    // Find the root object
    let object = intersects[0].object;
    let intersection = intersects[0];
    // Traverse up to find the root object that has our userData
    while (object && (!object.userData || !object.userData.id) && object.parent) {
        object = object.parent;
    }
    
    if (object && object.userData && object.userData.id !== undefined) {
        // Find the top-level mesh
        const topLevelObject = meshes.find(mesh => mesh.userData.id === object.userData.id);
        
        
        if (topLevelObject) {
            if (selectedObjects.length === 0) {
                // First object selection
                
                if (connectionMode === 'stick' || connectionMode === 'rigid-stick') {
                    const physicsBody = bodies.find((element) => element.userData.uuid === topLevelObject.uuid);
                    
                    if (physicsBody) {
                        // Get the global hit point in Three.js coordinates
                        
                        const hitPointGlobal = intersection.point.clone();
                        // Visual feedback at hit point (optional)
                        addHitMarker(hitPointGlobal);
                        // Convert global hit point to local object space
                        const localPoint = getLocalPoint(hitPointGlobal, meshes.find((element) => element.userData.id === topLevelObject.userData.id), physicsBody);
                        // Log the results
                        
                        const lineMaterial = new THREE.LineBasicMaterial({ 
                            color: getConnectionColor(connectionMode),
                            linewidth: connectionMode.includes('rigid') ? 5 : 2
                        });
                        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                            hitPointGlobal,
                            localPoint // Second point will be updated on mouse move
                        ]);
                        firstposition = hitPointGlobal;
                        tempConnectionLine = new THREE.Line(lineGeometry, lineMaterial);
                        scene.add(tempConnectionLine);
                        
                        // Add the first object to selectedObjects array
                        selectObject(topLevelObject);
                        
                        showToast(`${connectionMode.charAt(0).toUpperCase() + connectionMode.slice(1)} mode: Select second object`);
                    }
                } else {
                    // First object selection for other connection types
                    selectObject(topLevelObject);
                
                    // Create temporary connection line
                    const lineMaterial = new THREE.LineBasicMaterial({ 
                        color: getConnectionColor(connectionMode),
                        linewidth: connectionMode.includes('rigid') ? 3 : 2
                    });
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                        topLevelObject.position,
                        topLevelObject.position.clone() // Second point will be updated on mouse move
                    ]);
                    tempConnectionLine = new THREE.Line(lineGeometry, lineMaterial);
                    scene.add(tempConnectionLine);
                
                    showToast(`${connectionMode.charAt(0).toUpperCase() + connectionMode.slice(1)} mode: Select second object`);
                }
            } else if (selectedObjects[0] !== topLevelObject) {
                // Second object selection - complete the connection
                
                if (connectionMode === 'stick' || connectionMode === 'rigid-stick') {
                    // Create a stick between the two objects
                    const physicsBody = bodies.find((element) => element.userData.uuid === topLevelObject.uuid);
                    if (physicsBody) {
                        // Get the global hit point in Three.js coordinates
                        const hitPointGlobal = intersection.point.clone();
                        // Visual feedback at hit point (optional)
                        addHitMarker(hitPointGlobal);
                        // Convert global hit point to local object space
                        const localPoint = getLocalPoint(hitPointGlobal, meshes.find((element) => element.userData.id === topLevelObject.userData.id), physicsBody);
                        // Log the results
                        
                        secondposition = hitPointGlobal;
                        
                        createStick(selectedObjects[0], topLevelObject, 
                                 firstposition, secondposition,
                                 connectionMode === 'rigid-stick');
                    }
                } else if (connectionMode === 'motor' || connectionMode === 'rigid-motor') {
                    // Create a motor between the two objects
                    createMotor(selectedObjects[0], topLevelObject, 
                             intersects[0].point, selectedObjects[0].position,
                             'y', connectionMode === 'rigid-motor');
                } else if (connectionMode === 'glue') {
                    // Create a glue between the two objects
                    createGlue(selectedObjects[0], topLevelObject);
                }
                
                // Remove temporary connection line
                if (tempConnectionLine) {
                    scene.remove(tempConnectionLine);
                    tempConnectionLine = null;
                }
                
                // Clear selection
                clearSelection();
                
                // Exit connection mode
                connectionMode = null;
            }
        }
    }
}

// Get color for connection line based on mode
function getConnectionColor(mode) {
    switch(mode) {
        case 'stick': return 0x00ff00; // Green
        case 'rigid-stick': return 0x00aa00; // Dark green
        case 'motor': return 0x0000ff; // Blue
        case 'rigid-motor': return 0x0000aa; // Dark blue
        case 'glue': return 0xffaa00; // Orange
        default: return 0xffffff; // White
    }
}

// Utility function to check if a point contains NaN values
function isValidPoint(point) {
    if (!point) return false;
    
    // Check for Three.js Vector3
    if (point.isVector3) {
        return !isNaN(point.x) && !isNaN(point.y) && !isNaN(point.z);
    }
    
    // Check for CANNON.Vec3
    if (point instanceof CANNON.Vec3) {
        return !isNaN(point.x) && !isNaN(point.y) && !isNaN(point.z);
    }
    
    // For generic objects with x,y,z properties
    return (
        point.x !== undefined && !isNaN(point.x) &&
        point.y !== undefined && !isNaN(point.y) &&
        point.z !== undefined && !isNaN(point.z)
    );
}
function createStick(object1, object2, point1Global, point2Global, isRigid = false) {
    console.log("Creating stick between:", object1, object2);
    console.log("Points:", point1Global, point2Global);
    
    // Validate input objects
    if (!object1 || !object2) {
        console.error("createStick: Invalid objects provided");
        showToast("Error: Invalid objects for connection");
        return null;
    }
    
    // Validate points
    if (!isValidPoint(point1Global) || !isValidPoint(point2Global)) {
        console.error("createStick: Invalid points provided", point1Global, point2Global);
        showToast("Error: Invalid points for connection");
        return null;
    }
    
    // Improved body lookup that handles both direct UUID and ID-based references
    const body1 = bodies.find((body) => {
        return (body.userData && body.userData.uuid === object1.uuid) || 
               (body.userData && body.userData.id === object1.userData.id);
    });
    
    const body2 = bodies.find((body) => {
        return (body.userData && body.userData.uuid === object2.uuid) || 
               (body.userData && body.userData.id === object2.userData.id);
    });
    
    console.log("Found physics bodies:", body1, body2);
    
    if (!body1 || !body2) {
        console.error("createStick: Missing physics bodies");
        showToast("Error: Could not find physics bodies for objects");
        return null;
    }
    
    try {
        // Convert global points to local space relative to each body
        const cannonPoint1Global = new CANNON.Vec3(point1Global.x, point1Global.y, point1Global.z);
        const cannonPoint2Global = new CANNON.Vec3(point2Global.x, point2Global.y, point2Global.z);
        
        const localPoint1 = new CANNON.Vec3();
        const localPoint2 = new CANNON.Vec3();
        
        body1.pointToLocalFrame(cannonPoint1Global, localPoint1);
        body2.pointToLocalFrame(cannonPoint2Global, localPoint2);
        
        // Rest of the function remains the same...
        
        // Create the constraint with appropriate settings
        let constraint;
        
        constraint = new CANNON.PointToPointConstraint(
            body1, localPoint1,
            body2, localPoint2,
            1000 // Higher force for rigid connections
        );
        
        // Add constraint to the physics world
        world.addConstraint(constraint);
        
        // Create visual representation (line)
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: isRigid ? 0x00aa00 : 0x00ff00, 
            linewidth: isRigid ? 3 : 2 
        });
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            point1Global, point2Global
        ]);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        
        const stick = {
            id: Date.now(),
            object1: object1,
            object2: object2,
            point1: point1Global.clone().sub(object1.position), // Store relative to object
            point2: point2Global.clone().sub(object2.position), // Store relative to object
            constraint: constraint,
            line: line,
            stiffness: connectionStiffness,
            isRigid: isRigid
        };
        // Add to connections array
        sticks.push(stick);
        
        showToast(`Created ${isRigid ? 'rigid stick' : 'stick'} connection`);
        updateConnectionsList();
        return stick;
    } catch (err) {
        console.error("Error creating stick constraint:", err);
        showToast("Error creating connection: " + err.message);
        return null;
    }
}

// Add this call to your animation loop

// Create a motor connection between two objects
function createMotor(object1, object2, point1, point2, axis = null, isRigid = false) {
    // Create the constraint for physics
    const body1 = bodies.find(body => body.userData && body.userData.id === object1.userData.id);
    const body2 = bodies.find(body => body.userData && body.userData.id === object2.userData.id);
    
    if (!body1 || !body2) {
        showToast("Cannot create motor: Physics bodies not found", true);
        return null;
    }
    
    // If points aren't provided, use object positions
    if (!point1) point1 = object1.position.clone();
    if (!point2) point2 = object2.position.clone();
    
    // Calculate local pivot points in each body's reference frame
    const pivotInBody1 = new CANNON.Vec3().copy(point1.clone().sub(object1.position));
    const pivotInBody2 = new CANNON.Vec3().copy(point2.clone().sub(object2.position));
    
    // Calculate axis based on the connection line between objects
    const axisVector = new THREE.Vector3().subVectors(point2, point1).normalize();
    
    // Convert THREE.Vector3 to CANNON.Vec3
    const axisVec = new CANNON.Vec3(axisVector.x, axisVector.y, axisVector.z);
    
    // We need a perpendicular axis for the hinge
    // First try using the global up vector to find perpendicular
    const worldUp = new CANNON.Vec3(0, 1, 0);
    let hingeAxis = new CANNON.Vec3();
    
    // Cross product to find perpendicular vector
    worldUp.cross(axisVec, hingeAxis);
    
    // If resulting axis is too small (objects are aligned with world up), 
    // try a different reference vector
    if (hingeAxis.length() < 0.01) {
        const worldForward = new CANNON.Vec3(0, 0, 1);
        worldForward.cross(axisVec, hingeAxis);
        
        if (hingeAxis.length() < 0.01) {
            const worldRight = new CANNON.Vec3(1, 0, 0);
            worldRight.cross(axisVec, hingeAxis);
        }
    }
    
    // Normalize the axis
    hingeAxis.normalize();
    
    // Create hinge constraint with motor capabilities
    const constraint = new CANNON.HingeConstraint(body1, body2, {
        pivotA: pivotInBody1,
        pivotB: pivotInBody2,
        axisA: hingeAxis,
        axisB: hingeAxis
    });
    
    world.addConstraint(constraint);
    
    // Create visual representation (line)
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: isRigid ? 0x0000aa : 0x0000ff, 
        linewidth: isRigid ? 3 : 2
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        point1, point2
    ]);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    
    // Create axis visualization
    let axisVisualization;
    
    // Create a small arrow showing the rotation axis
    const midpoint = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
    
    // Convert CANNON hingeAxis back to THREE
    const threeHingeAxis = new THREE.Vector3(hingeAxis.x, hingeAxis.y, hingeAxis.z);
    
    // Create a directional arrow
    const arrowLength = 0.5;  // Length of the arrow
    const arrowHelper = new THREE.ArrowHelper(
        threeHingeAxis,
        midpoint,
        arrowLength,
        0x0000ff // Blue for all motor axes
    );
    
    scene.add(arrowHelper);
    axisVisualization = arrowHelper;
    
    // Create a motor object
    const motor = {
        id: Date.now(),
        object1: object1,
        object2: object2,
        point1: point1.clone().sub(object1.position), // Store relative to object
        point2: point2.clone().sub(object2.position), // Store relative to object
        axis: "auto", // Now the axis is automatically calculated
        speed: 0, // Default speed (0 = not moving)
        force: motorForce, // Use current motor force value
        constraint: constraint,
        line: line,
        axisVisualization: axisVisualization,
        stiffness: connectionStiffness,
        isRigid: isRigid,
        hingeAxis: threeHingeAxis // Store the calculated hinge axis
    };
    
    // Apply stiffness properties
    updateMotorProperties(motor);
    
    // Add to motors array
    motors.push(motor);
    
    // Update connections list
    updateConnectionsList();
    
    // Update floating motor panel
    if (isSimulating) {
        updateMotorRemotePanel();
    }
    
    showToast(`${isRigid ? 'Rigid' : 'Flexible'} motor created successfully`);
    return motor;
}
// Create a glue connection between two objects
function createGlue(object1, object2, point1, point2) {
    // Create the constraint for physics
    const body1 = bodies.find(body => body.userData && body.userData.id === object1.userData.id);
    const body2 = bodies.find(body => body.userData && body.userData.id === object2.userData.id);
    
    if (!body1 || !body2) {
        showToast("Cannot create glue: Physics bodies not found", true);
        return null;
    }
    
    // Default to object positions if specific points aren't provided
    if (!point1) point1 = object1.position.clone();
    if (!point2) point2 = object2.position.clone();
    
    // Calculate local pivot points in each body's reference frame
    const pivotInBody1 = new CANNON.Vec3().copy(point1.clone().sub(object1.position));
    const pivotInBody2 = new CANNON.Vec3().copy(point2.clone().sub(object2.position));
    
    // Create a point-to-point constraint with very high stiffness
    // This connects two specific points on the objects with a strong force
    const constraint = new CANNON.PointToPointConstraint(
        body1, pivotInBody1,
        body2, pivotInBody2,
        1000 // Very high stiffness
    );
    
    // Add a second connection point if possible to increase stability
    const offset = new THREE.Vector3(0.1, 0.1, 0.1);
    const secondPoint1 = point1.clone().add(offset);
    const secondPoint2 = point2.clone().add(offset);
    
    const secondPivotInBody1 = new CANNON.Vec3().copy(secondPoint1.clone().sub(object1.position));
    const secondPivotInBody2 = new CANNON.Vec3().copy(secondPoint2.clone().sub(object2.position));
    
    const secondConstraint = new CANNON.PointToPointConstraint(
        body1, secondPivotInBody1,
        body2, secondPivotInBody2,
        1000 // Very high stiffness
    );
    
    world.addConstraint(constraint);
    world.addConstraint(secondConstraint);
    
    // Create visual representation (line)
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffaa00, // Orange 
        linewidth: 3,
        dashSize: 0.1,
        gapSize: 0.05
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        point1, point2
    ]);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    
    // Create a glue object
    const glue = {
        id: Date.now(),
        object1: object1, // Leader object
        object2: object2, // Follower object
        point1: point1.clone().sub(object1.position), // Store relative to object
        point2: point2.clone().sub(object2.position), // Store relative to object
        constraint: constraint,
        secondConstraint: secondConstraint,
        line: line
    };
    
    // Add to glues array
    glues.push(glue);
    
    // Update connections list
    updateConnectionsList();
    
    showToast("Glue connection created successfully");
    return glue;
}
// Remove a glue connection
function removeGlue(glue) {
    if (glue.constraint) {
        world.removeConstraint(glue.constraint);
    }
    
    if (glue.secondConstraint) {
        world.removeConstraint(glue.secondConstraint);
    }
    
    if (glue.line) {
        scene.remove(glue.line);
    }
    
    // Remove from glues array
    const index = glues.indexOf(glue);
    if (index !== -1) {
        glues.splice(index, 1);
    }
    
    // Update connections list
    updateConnectionsList();
}

// Remove a stick connection
function removeStick(stick) {
    if (stick.constraint) {
        world.removeConstraint(stick.constraint);
    }
    
    if (stick.line) {
        scene.remove(stick.line);
    }
    
    // Remove from sticks array
    const index = sticks.indexOf(stick);
    if (index !== -1) {
        sticks.splice(index, 1);
    }
    
    // Update connections list
    updateConnectionsList();
}

// Remove a motor connection
function removeMotor(motor) {
    if (motor.constraint) {
        world.removeConstraint(motor.constraint);
    }
    
    if (motor.line) {
        scene.remove(motor.line);
    }
    
    if (motor.axisVisualization) {
        scene.remove(motor.axisVisualization);
    }
    
    // Remove from motors array
    const index = motors.indexOf(motor);
    if (index !== -1) {
        motors.splice(index, 1);
    }
    
    // Update connections list
    updateConnectionsList();
    
    // Update floating motor panel
    updateMotorRemotePanel();
    
    // Hide motor controls if needed
    updateMotorControlsVisibility();
}

// Update the connections list display
function updateConnectionsList() {
    const connectionsList = document.getElementById('connection-list');
    
    // Clear current content
    connectionsList.innerHTML = '';
    
    if (sticks.length === 0 && motors.length === 0 && glues.length === 0 && 
        dualMotors.filter(m => m.connections.length > 0).length === 0) {
        connectionsList.innerHTML = '<div class="text-center text-gray-500 dark:text-gray-400 text-sm">No connections</div>';
        return;
    }
    
    // Add sticks
    sticks.forEach((stick, index) => {
        const stickDiv = document.createElement('div');
        stickDiv.className = 'flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-600';
        stickDiv.dataset.type = 'stick';
        stickDiv.dataset.id = stick.id;
        
        const stickType = stick.isRigid ? "Rigid Stick" : "Flex Stick";
        const stickColor = stick.isRigid ? "bg-green-800" : "bg-green-500";
        
        stickDiv.innerHTML = `
            <div class="flex items-center">
                <div class="w-3 h-3 rounded-full ${stickColor} mr-2"></div>
                <span>${stickType} #${index + 1} (${stick.stiffness.toFixed(1)})</span>
            </div>
            <button class="delete-connection-btn text-red-600 hover:text-red-800">×</button>
        `;
        
        stickDiv.querySelector('.delete-connection-btn').addEventListener('click', () => {
            removeStick(stick);
        });
        
        // Add click event to select the connected objects
        stickDiv.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-connection-btn')) {
                clearSelection();
                selectAdditionalObject(stick.object1);
                selectAdditionalObject(stick.object2);
            }
        });
        
        connectionsList.appendChild(stickDiv);
    });
    
    // Add motors
    motors.forEach((motor, index) => {
        const motorDiv = document.createElement('div');
        motorDiv.className = 'flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-600';
        motorDiv.dataset.type = 'motor';
        motorDiv.dataset.id = motor.id;
        
        const motorType = motor.isRigid ? "Rigid Motor" : "Flex Motor";
        const motorColor = motor.isRigid ? "bg-blue-800" : "bg-blue-500";
        
        // Add more detailed info about the motor
        motorDiv.innerHTML = `
            <div class="flex-grow">
                <div class="flex items-center">
                    <div class="w-3 h-3 rounded-full ${motorColor} mr-2"></div>
                    <span>${motorType} #${index + 1}</span>
                </div>
                <div class="text-xs text-gray-600 dark:text-gray-300">
                    Speed: ${motor.speed.toFixed(1)} rad/s | Force: ${(motor.force || 10).toFixed(1)} N·m | Axis: ${motor.axis.toUpperCase()}
                </div>
            </div>
            <button class="delete-connection-btn text-red-600 hover:text-red-800">×</button>
        `;
        
        motorDiv.querySelector('.delete-connection-btn').addEventListener('click', () => {
            removeMotor(motor);
        });
        
        // Add click event to select the connected objects
        motorDiv.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-connection-btn')) {
                clearSelection();
                selectAdditionalObject(motor.object1);
                selectAdditionalObject(motor.object2);
            }
        });
        
        connectionsList.appendChild(motorDiv);
    });
    
    // Add glues
    glues.forEach((glue, index) => {
        const glueDiv = document.createElement('div');
        glueDiv.className = 'flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-600';
        glueDiv.dataset.type = 'glue';
        glueDiv.dataset.id = glue.id;
        
        glueDiv.innerHTML = `
            <div class="flex items-center">
                <div class="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <span>Glue #${index + 1}</span>
            </div>
            <button class="delete-connection-btn text-red-600 hover:text-red-800">×</button>
        `;
        
        glueDiv.querySelector('.delete-connection-btn').addEventListener('click', () => {
            removeGlue(glue);
        });
        
        // Add click event to select the connected objects
        glueDiv.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-connection-btn')) {
                clearSelection();
                selectAdditionalObject(glue.object1);
                selectAdditionalObject(glue.object2);
            }
        });
        
        connectionsList.appendChild(glueDiv);
    });
    
    // Add dual motor connections
    dualMotors.forEach((dualMotor, index) => {
        if (dualMotor.connections.length === 0) return;
        
        const dualMotorDiv = document.createElement('div');
        dualMotorDiv.className = 'flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-600';
        dualMotorDiv.dataset.type = 'dual-motor';
        dualMotorDiv.dataset.id = dualMotor.id;
        
        dualMotorDiv.innerHTML = `
            <div class="flex-grow">
                <div class="flex items-center">
                    <div class="w-3 h-3 rounded-full bg-pink-500 mr-2"></div>
                    <span>Dual Motor #${dualMotor.id}</span>
                </div>
                <div class="text-xs text-gray-600 dark:text-gray-300">
                    Speed: ${dualMotor.speed.toFixed(1)} rad/s | Force: ${(dualMotor.force || 20).toFixed(1)} N·m | Connections: ${dualMotor.connections.length}
                </div>
            </div>
            <button class="view-dual-motor-btn text-blue-600 hover:text-blue-800">👁️</button>
        `;
        
        dualMotorDiv.querySelector('.view-dual-motor-btn').addEventListener('click', () => {
            // Select the dual motor
            clearSelection();
            selectObject(dualMotor.motor);
        });
        
        // Add click event to select the dual motor
        dualMotorDiv.addEventListener('click', (e) => {
            if (!e.target.classList.contains('view-dual-motor-btn')) {
                clearSelection();
                selectObject(dualMotor.motor);
            }
        });
        
        connectionsList.appendChild(dualMotorDiv);
    });
}

// Update motor speed from slider
function updateMotorSpeed() {
    const speed = parseFloat(document.getElementById('motor-speed-slider').value);
    document.getElementById('motor-speed-value').textContent = `${speed.toFixed(2)} rad/s`;
    
    // Find motors that have any of the selected objects
    const updatedMotors = [];
    
    for (const motor of motors) {
        if (selectedObjects.includes(motor.object1) || selectedObjects.includes(motor.object2)) {
            motor.speed = speed;
            
            if (isSimulating) {
                // Apply the speed to the constraint
                if (speed === 0) {
                    motor.constraint.disableMotor();
                } else {
                    motor.constraint.enableMotor();
                    motor.constraint.setMotorSpeed(speed);
                    motor.constraint.setMotorMaxForce(motor.force || 10);
                }
            }
            
            updatedMotors.push(motor);
        }
    }
    
    // Update connections list to show new speeds
    updateConnectionsList();
    
    // Update floating motor panel
    updateMotorRemotePanel();
    
    if (updatedMotors.length > 0) {
        showToast(`Updated speed for ${updatedMotors.length} motor${updatedMotors.length > 1 ? 's' : ''}`);
    }
}

// Update motor axis from selector
function updateMotorAxis() {
    const axis = document.getElementById('motor-axis-select').value;
    
    // Find motors that have any of the selected objects
    const updatedMotors = [];
    
    for (const motor of motors) {
        if (selectedObjects.includes(motor.object1) || selectedObjects.includes(motor.object2)) {
            // We would need to recreate the constraint to change the axis
            // This is simplified for this example
            motor.axis = axis;
            updatedMotors.push(motor);
            
            // Update axis visualization if it exists
            if (motor.axisVisualization) {
                scene.remove(motor.axisVisualization);
                
                // Create a new arrow for the updated axis
                const midpoint = new THREE.Vector3().addVectors(
                    motor.object1.position,
                    motor.object2.position
                ).multiplyScalar(0.5);
                
                const arrowLength = 0.5;
                const arrowHelper = new THREE.ArrowHelper(
                    new THREE.Vector3(
                        axis === 'x' ? 1 : 0, 
                        axis === 'y' ? 1 : 0, 
                        axis === 'z' ? 1 : 0
                    ),
                    midpoint,
                    arrowLength,
                    axis === 'x' ? 0xff0000 : (axis === 'y' ? 0x00ff00 : 0x0000ff)
                );
                
                scene.add(arrowHelper);
                motor.axisVisualization = arrowHelper;
            }
        }
    }
    
    // Update connections list
    updateConnectionsList();
    
    // Update floating motor panel
    updateMotorRemotePanel();
    
    if (updatedMotors.length > 0) {
        showToast(`Updated axis for ${updatedMotors.length} motor${updatedMotors.length > 1 ? 's' : ''}. Will apply on restart.`);
    }
}

// Set motor direction (cw/ccw)
function setMotorDirection(direction) {
    // Find motors associated with selected objects
    const selectedMotors = motors.filter(motor => 
        selectedObjects.includes(motor.object1) || selectedObjects.includes(motor.object2)
    );
    
    if (selectedMotors.length === 0) {
        showToast("No motors selected", true);
        return;
    }
    
    selectedMotors.forEach(motor => {
        // Set speed based on direction
        if (direction === 'cw') {
            // Use existing speed magnitude or default to 2
            motor.speed = Math.abs(motor.speed) || 2;
        } else if (direction === 'ccw') {
            // Use existing speed magnitude or default to 2
            motor.speed = -(Math.abs(motor.speed) || 2);
        }
        
        // Apply to constraint if simulating
        if (isSimulating && motor.constraint) {
            motor.constraint.enableMotor();
            motor.constraint.setMotorSpeed(motor.speed);
            motor.constraint.setMotorMaxForce(motor.force || 10);
        }
    });
    
    // Update speed slider and display value
    if (selectedMotors.length === 1) {
        document.getElementById('motor-speed-slider').value = selectedMotors[0].speed;
        document.getElementById('motor-speed-value').textContent = `${selectedMotors[0].speed.toFixed(2)} rad/s`;
    }
    
    // Update connections list
    updateConnectionsList();
    
    // Update floating motor panel
    updateMotorRemotePanel();
    
    showToast(`Set ${selectedMotors.length} motor${selectedMotors.length > 1 ? 's' : ''} to ${direction === 'cw' ? 'clockwise' : 'counter-clockwise'}`);
}

// Stop motors
function stopMotor() {
    // Find motors associated with selected objects
    const selectedMotors = motors.filter(motor => 
        selectedObjects.includes(motor.object1) || selectedObjects.includes(motor.object2)
    );
    
    if (selectedMotors.length === 0) {
        showToast("No motors selected", true);
        return;
    }
    
    selectedMotors.forEach(motor => {
        motor.speed = 0;
        
        // Apply to constraint if simulating
        if (isSimulating && motor.constraint) {
            motor.constraint.disableMotor();
        }
    });
    
    // Update speed slider and display value
    document.getElementById('motor-speed-slider').value = 0;
    document.getElementById('motor-speed-value').textContent = "0.00 rad/s";
    
    // Update connections list
    updateConnectionsList();
    
    // Update floating motor panel
    updateMotorRemotePanel();
    
    showToast(`Stopped ${selectedMotors.length} motor${selectedMotors.length > 1 ? 's' : ''}`);
}

// Delete selected connections
function deleteSelectedConnections() {
    if (selectedObjects.length === 0) {
        showToast("Select objects to delete their connections", true);
        return;
    }
    
    let deletedCount = 0;
    
    // Find and remove sticks that connect selected objects
    for (let i = sticks.length - 1; i >= 0; i--) {
        const stick = sticks[i];
        if (selectedObjects.includes(stick.object1) || selectedObjects.includes(stick.object2)) {
            removeStick(stick);
            deletedCount++;
        }
    }
    
    // Find and remove motors that connect selected objects
    for (let i = motors.length - 1; i >= 0; i--) {
        const motor = motors[i];
        if (selectedObjects.includes(motor.object1) || selectedObjects.includes(motor.object2)) {
            removeMotor(motor);
            deletedCount++;
        }
    }
    
    // Find and remove glues that connect selected objects
    for (let i = glues.length - 1; i >= 0; i--) {
        const glue = glues[i];
        if (selectedObjects.includes(glue.object1) || selectedObjects.includes(glue.object2)) {
            removeGlue(glue);
            deletedCount++;
        }
    }
    
    // Find any dual motor connections that involve selected objects
    for (const dualMotor of dualMotors) {
        if (dualMotor.connections) {
            for (let i = dualMotor.connections.length - 1; i >= 0; i--) {
                if (selectedObjects.includes(dualMotor.connections[i].object)) {
                    // Remove the constraint
                    if (dualMotor.connections[i].constraint) {
                        world.removeConstraint(dualMotor.connections[i].constraint);
                        deletedCount++;
                    }
                    
                    // Update the cube status
                    const cube = dualMotor.connections[i].cubeNumber === 1 ?
                        dualMotor.motor.userData.cube1 : dualMotor.motor.userData.cube2;
                    
                    if (cube) {
                        cube.userData.attachedObject = null;
                    }
                    
                    // Remove from connections array
                    dualMotor.connections.splice(i, 1);
                }
            }
            
            // If dual motor has a motor constraint and we removed connections, also remove the motor constraint
            if (dualMotor.connections.length < 2 && dualMotor.motorConstraint) {
                world.removeConstraint(dualMotor.motorConstraint);
                dualMotor.motorConstraint = null;
            }
        }
    }
    
    if (deletedCount > 0) {
        showToast(`Deleted ${deletedCount} connection${deletedCount > 1 ? 's' : ''}`);
        updateConnectionsList();
    } else {
        showToast("No connections found for selected objects", true);
    }
}
function addHitMarker(position) {
    const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(position);
    scene.add(marker);
    
    // Remove the marker after a short time
    setTimeout(() => {
      scene.remove(marker);
      marker.geometry.dispose();
      marker.material.dispose();
    }, 2000);
}
function getLocalPoint(hitPointGlobal, mesh, body) {
    // Convert global Three.js point to local mesh coordinates
    const threeLocalPoint = mesh.worldToLocal(hitPointGlobal.clone());
    
    // Convert global Three.js point to Cannon.js global coordinates
    const cannonGlobalPoint = new CANNON.Vec3(
      hitPointGlobal.x,
      hitPointGlobal.y,
      hitPointGlobal.z
    );
    
    // Convert global Cannon.js point to local body coordinates
    const cannonLocalPoint = new CANNON.Vec3();
    body.pointToLocalFrame(cannonGlobalPoint, cannonLocalPoint);
    
    return {
      threeLocal: threeLocalPoint,
      cannonLocal: cannonLocalPoint
    };
}

// Function to handle the visual updating of all constraints in each animation frame
function updateConstraintVisuals() {
    // Update stick lines
    sticks.forEach(stick => {
        if (stick.line && stick.object1 && stick.object2) {
            // Calculate current global positions of connection points
            const pos1 = stick.object1.position.clone().add(stick.point1);
            const pos2 = stick.object2.position.clone().add(stick.point2);
            
            // Update line geometry
            const positions = new Float32Array([
                pos1.x, pos1.y, pos1.z,
                pos2.x, pos2.y, pos2.z
            ]);
            
            stick.line.geometry.setAttribute('position', 
                new THREE.BufferAttribute(positions, 3));
            stick.line.geometry.attributes.position.needsUpdate = true;
        }
    });
    
    // Update motor lines
    motors.forEach(motor => {
        if (motor.line && motor.object1 && motor.object2) {
            // Calculate current global positions of connection points
            const pos1 = motor.object1.position.clone().add(motor.point1);
            const pos2 = motor.object2.position.clone().add(motor.point2);
            
            // Update line geometry
            const positions = new Float32Array([
                pos1.x, pos1.y, pos1.z,
                pos2.x, pos2.y, pos2.z
            ]);
            
            motor.line.geometry.setAttribute('position', 
                new THREE.BufferAttribute(positions, 3));
            motor.line.geometry.attributes.position.needsUpdate = true;
            
            // Update axis visualization if it exists
            if (motor.axisVisualization) {
                const midpoint = new THREE.Vector3().addVectors(pos1, pos2).multiplyScalar(0.5);
                motor.axisVisualization.position.copy(midpoint);
                
                // If using hingeAxis (automatically calculated axis)
                if (motor.hingeAxis) {
                    // For auto-calculated motors, the axis should always point in the right direction
                    motor.axisVisualization.setDirection(motor.hingeAxis);
                }
            }
        }
    });
    
    // Update glue lines
    glues.forEach(glue => {
        if (glue.line && glue.object1 && glue.object2) {
            // Calculate current global positions of connection points
            const pos1 = glue.object1.position.clone().add(glue.point1);
            const pos2 = glue.object2.position.clone().add(glue.point2);
            
            // Update line geometry
            const positions = new Float32Array([
                pos1.x, pos1.y, pos1.z,
                pos2.x, pos2.y, pos2.z
            ]);
            
            glue.line.geometry.setAttribute('position', 
                new THREE.BufferAttribute(positions, 3));
            glue.line.geometry.attributes.position.needsUpdate = true;
        }
    });
}




