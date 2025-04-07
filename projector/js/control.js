
// Initial positions (for reset)
let initialPositions = [];

// Fix selected objects in place
function fixSelectedObjects() {
    if (selectedObjects.length === 0) {
        showToast("No objects selected", true);
        return;
    }
    
    let fixedCount = 0;
    
    selectedObjects.forEach(obj => {
        const objId = obj.userData.id;
        const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === objId);
        
        if (bodyIndex !== -1 && !obj.userData.isFixed) {
            // Save the original mass if not already saved
            if (obj.userData.originalMass === undefined) {
                obj.userData.originalMass = obj.userData.mass;
            }
            
            // Make the object static (mass = 0)
            bodies[bodyIndex].mass = 0;
            bodies[bodyIndex].updateMassProperties();
            bodies[bodyIndex].type = CANNON.Body.STATIC;
            
            // Mark the object as fixed
            obj.userData.isFixed = true;
            
            // Add a visual indicator for fixed objects
            const fixedIndicator = createFixedIndicator(obj);
            obj.userData.fixedIndicator = fixedIndicator;
            
            // Add to tracking array
            fixedObjects.push(obj);
            
            fixedCount++;
        }
    });
    
    // Update the object list to show fixed status
    updateObjectList();
    
    if (fixedCount > 0) {
        showToast(`Fixed ${fixedCount} object${fixedCount > 1 ? 's' : ''} in place`);
    } else {
        showToast("Selected objects are already fixed", true);
    }
}


// Create a visual indicator for fixed objects
function createFixedIndicator(object) {
    // Create a wireframe box or sphere slightly larger than the object
    let geometry;
    const boundingBox = new THREE.Box3().setFromObject(object);
    const size = boundingBox.getSize(new THREE.Vector3());
    
    // We'll use a simple wireframe cube for all shapes
    geometry = new THREE.BoxGeometry(size.x * 1.1, size.y * 1.1, size.z * 1.1);
    
    const material = new THREE.MeshBasicMaterial({
        color: 0xaa33cc, // Purple
        wireframe: true,
        transparent: true,
        opacity: 0.7
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.copy(object.position);
    indicator.quaternion.copy(object.quaternion);
    indicator.userData.isFixedIndicator = true;
    indicator.userData.targetId = object.userData.id;
    
    scene.add(indicator);
    
    return indicator;
}


// Unfix selected objects
function unfixSelectedObjects() {
    if (selectedObjects.length === 0) {
        showToast("No objects selected", true);
        return;
    }
    
    let unfixedCount = 0;
    
    selectedObjects.forEach(obj => {
        const objId = obj.userData.id;
        const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === objId);
        
        if (bodyIndex !== -1 && obj.userData.isFixed) {
            // Restore the original mass
            const originalMass = obj.userData.originalMass || obj.userData.mass;
            bodies[bodyIndex].mass = originalMass;
            bodies[bodyIndex].updateMassProperties();
            bodies[bodyIndex].type = CANNON.Body.DYNAMIC;
            
            // Mark the object as not fixed
            obj.userData.isFixed = false;
            
            // Remove the visual indicator
            if (obj.userData.fixedIndicator) {
                scene.remove(obj.userData.fixedIndicator);
                obj.userData.fixedIndicator = null;
            }
            
            // Remove from tracking array
            const index = fixedObjects.indexOf(obj);
            if (index !== -1) {
                fixedObjects.splice(index, 1);
            }
            
            unfixedCount++;
        }
    });
    
    // Update the object list to show fixed status
    updateObjectList();
    
    if (unfixedCount > 0) {
        showToast(`Unfixed ${unfixedCount} object${unfixedCount > 1 ? 's' : ''}`);
    } else {
        showToast("Selected objects are not fixed", true);
    }
}

// Function to reset positions without physics simulation
function resetPositions() {
    // Stop simulation
    pauseSimulation();
    
    // Clear selection
    clearSelection();
    
    // Reset all objects to their initial positions
    for (let i = 0; i < meshes.length; i++) {
        const meshId = meshes[i].userData.id;
        const initialPos = initialPositions.find(p => p.id === meshId);
        
        if (initialPos) {
            // Reset mesh position and rotation
            meshes[i].position.copy(initialPos.position);
            meshes[i].quaternion.copy(initialPos.quaternion);
            
            // Reset physics body
            bodies[i].position.copy(initialPos.position);
            bodies[i].quaternion.copy(initialPos.quaternion);
            bodies[i].velocity.set(0, 0, 0);
            bodies[i].angularVelocity.set(0, 0, 0);
            bodies[i].sleep();
        }
    }
    
    // Update connections
    updateConnections();
    
    // Show toast notification
    showToast("Objects reset to initial positions");
}
// Function to reset positions without physics simulation
function recordPositions() {
    // Stop simulation
    pauseSimulation();
    
    // Clear selection
    clearSelection();
    
    // Reset all objects to their initial positions
    for (let i = 0; i < meshes.length; i++) {
        const meshId = meshes[i].userData.id;
        const initialPos = initialPositions.find(p => p.id === meshId);
        
        if (initialPos) {
            // Reset mesh position and rotation
            initialPos.position.copy(meshes[i].position);
            initialPos.quaternion.copy(meshes[i].quaternion);
            
            // Reset physics body
            initialPos.quaternion.copy(bodies[i].position);
            initialPos.quaternion.copy(bodies[i].quaternion);
        }
    }
    
    // Update connections
    updateConnections();
    
    // Show toast notification
    showToast("Objects reset to initial positions");
}


// Function to update dual motor controls visibility
function updateDualMotorControlsVisibility() {
    const dualMotorControlsDiv = document.getElementById('dual-motor-controls');
    const dualMotorInfoDiv = document.getElementById('dual-motor-info');
    
    // Check if a dual motor is selected
    const selectedDualMotor = selectedObjects.find(obj => obj.userData.isDualMotor);
    
    if (selectedDualMotor) {
        dualMotorControlsDiv.classList.remove('hidden');
        
        // Find the dual motor data
        const dualMotor = dualMotors.find(m => m.id === selectedDualMotor.userData.id);
        if (dualMotor) {
            // Update the motor info
            dualMotorInfoDiv.textContent = `Dual Motor #${dualMotor.id}`;
            if (dualMotor.connections.length > 0) {
                dualMotorInfoDiv.textContent += ` - ${dualMotor.connections.length} connection(s)`;
            }
            
            // Update the speed slider
            document.getElementById('dual-motor-speed-slider').value = dualMotor.speed;
            document.getElementById('dual-motor-speed-value').textContent = `${dualMotor.speed.toFixed(1)} rad/s`;
            
            // Update the force slider
            document.getElementById('dual-motor-force-slider').value = dualMotor.force;
            document.getElementById('dual-motor-force-value').textContent = `${dualMotor.force.toFixed(1)} N·m`;
        }
    } else {
        dualMotorControlsDiv.classList.add('hidden');
    }
}
// Handle clicks during dual motor attachment
function handleDualMotorAttachClick(intersects) {
    if (!dualMotorAttachState.active || !dualMotorAttachState.motor || !dualMotorAttachState.cube) {
        cancelDualMotorAttachMode();
        return;
    }
    
    if (intersects.length === 0) {
        // Clicked on empty space - cancel attachment
        cancelDualMotorAttachMode();
        return;
    }
    
    // Find the root object
    let object = intersects[0].object;
    
    // Skip if clicked on the dual motor itself or its cubes
    if (object === dualMotorAttachState.motor || 
        object === dualMotorAttachState.motor.userData.cube1 || 
        object === dualMotorAttachState.motor.userData.cube2) {
        return;
    }
    
    // Traverse up to find the root object
    while (object && (!object.userData || !object.userData.id) && object.parent) {
        object = object.parent;
    }
    
    if (object && object.userData && object.userData.id !== undefined) {
        // Don't allow attaching to another dual motor
        if (object.userData.isDualMotor) {
            showToast("Cannot attach dual motor to another dual motor", true);
            return;
        }
        
        // Find the top-level mesh
        const targetObject = meshes.find(mesh => mesh.userData.id === object.userData.id);
        
        if (targetObject) {
            // Attach the dual motor cube to this object
            attachDualMotorCube(
                dualMotorAttachState.dualMotor,
                dualMotorAttachState.cube,
                targetObject
            );
            
            // Remove temporary connection line
            if (tempConnectionLine) {
                scene.remove(tempConnectionLine);
                tempConnectionLine = null;
            }
            
            // Exit attachment mode
            cancelDualMotorAttachMode();
            
            // Update connections list
            updateConnectionsList();
            
            // Show success message
            showToast(`Attached dual motor to ${targetObject.userData.type}`);
        }
    }
}
// Attach a dual motor cube to an object
function attachDualMotorCube(dualMotor, cube, targetObject) {
    if (!dualMotor || !cube || !targetObject) return;
    
    // Get the cube number (1 or 2)
    const cubeNumber = cube === dualMotor.motor.userData.cube1 ? 1 : 2;
    
    // Check if this cube is already attached
    const existingConnection = dualMotor.connections.find(conn => conn.cubeNumber === cubeNumber);
    if (existingConnection) {
        // Remove the existing constraint
        if (existingConnection.constraint) {
            world.removeConstraint(existingConnection.constraint);
        }
        
        // Update the connection
        existingConnection.object = targetObject;
        existingConnection.constraint = null;
    } else {
        // Create a new connection entry
        dualMotor.connections.push({
            cubeNumber: cubeNumber,
            object: targetObject,
            constraint: null
        });
    }
    
    // Mark the cube as attached to this object
    cube.userData.attachedObject = targetObject;
    
    // Find the body for the target object
    const targetBody = bodies.find(body => body.userData && body.userData.id === targetObject.userData.id);
    if (!targetBody) return;
    
    // Find the body for the dual motor
    const motorBody = bodies.find(body => body.userData && body.userData.id === dualMotor.id);
    if (!motorBody) return;
    
    // Create a lock constraint between the cube and the target object
    const cubeWorldPos = new THREE.Vector3();
    cube.getWorldPosition(cubeWorldPos);
    
    // Calculate the attachment point in the target object's local space
    const attachPoint = cubeWorldPos.clone().sub(targetObject.position);
    // Convert to CANNON vector
    const localPoint = new CANNON.Vec3(attachPoint.x, attachPoint.y, attachPoint.z);
    
    // Create a lock constraint (all 6 degrees of freedom restricted)
    const constraint = new CANNON.LockConstraint(motorBody, targetBody, {
        localOffsetB: localPoint,
        localOrientationB: new CANNON.Quaternion()
    });
    
    world.addConstraint(constraint);
    
    // Add the constraint to the connection
    const connection = dualMotor.connections.find(conn => conn.cubeNumber === cubeNumber);
    if (connection) {
        connection.constraint = constraint;
    }
    
    // If both cubes are attached, create a motor constraint
    if (dualMotor.connections.length >= 2) {
        enableDualMotor(dualMotor);
    }
}


// Enable a dual motor's rotation once both cubes are attached
function enableDualMotor(dualMotor) {
    // Make sure both cubes are attached
    if (dualMotor.connections.length < 2) return;
    
    // Get the connections
    const cube1Conn = dualMotor.connections.find(conn => conn.cubeNumber === 1);
    const cube2Conn = dualMotor.connections.find(conn => conn.cubeNumber === 2);
    
    if (!cube1Conn || !cube2Conn) return;
    
    // Find the bodies
    const body1 = bodies.find(body => body.userData && body.userData.id === cube1Conn.object.userData.id);
    const body2 = bodies.find(body => body.userData && body.userData.id === cube2Conn.object.userData.id);
    
    if (!body1 || !body2) return;
    
    // Create a hinge constraint between the two bodies along the X axis
    // (the shaft of the dual motor runs along the X axis)
    const axisVector = new CANNON.Vec3(1, 0, 0); // Rotate around X axis
    
    // Find the midpoint between the two cubes for the pivot
    const cube1Pos = new THREE.Vector3();
    const cube2Pos = new THREE.Vector3();
    dualMotor.motor.userData.cube1.getWorldPosition(cube1Pos);
    dualMotor.motor.userData.cube2.getWorldPosition(cube2Pos);
    
    const midpoint = new THREE.Vector3().addVectors(cube1Pos, cube2Pos).multiplyScalar(0.5);
    
    // Create local pivot points
    const pivotInBody1 = new CANNON.Vec3().copy(midpoint.clone().sub(cube1Conn.object.position));
    const pivotInBody2 = new CANNON.Vec3().copy(midpoint.clone().sub(cube2Conn.object.position));
    
    // Create the hinge constraint with motor capabilities
    const motorConstraint = new CANNON.HingeConstraint(body1, body2, {
        pivotA: pivotInBody1,
        pivotB: pivotInBody2,
        axisA: axisVector,
        axisB: axisVector
    });
    
    // Set the motor speed if defined
    if (dualMotor.speed !== 0) {
        motorConstraint.enableMotor();
        motorConstraint.setMotorSpeed(dualMotor.speed);
        motorConstraint.setMotorMaxForce(dualMotor.force || 20);
    }
    
    world.addConstraint(motorConstraint);
    
    // Store the motor constraint
    dualMotor.motorConstraint = motorConstraint;
}
// Update dual motor speed
function updateDualMotorSpeed() {
    const speed = parseFloat(document.getElementById('dual-motor-speed-slider').value);
    document.getElementById('dual-motor-speed-value').textContent = `${speed.toFixed(1)} rad/s`;
    
    // Find selected dual motor
    const selectedDualMotor = selectedObjects.find(obj => obj.userData.isDualMotor);
    if (!selectedDualMotor) return;
    
    // Find the dual motor data
    const dualMotor = dualMotors.find(m => m.id === selectedDualMotor.userData.id);
    if (!dualMotor) return;
    
    // Update speed
    dualMotor.speed = speed;
    selectedDualMotor.userData.speed = speed;
    
    // If motor is active, apply the speed
    if (dualMotor.motorConstraint && isSimulating) {
        if (speed === 0) {
            dualMotor.motorConstraint.disableMotor();
        } else {
            dualMotor.motorConstraint.enableMotor();
            dualMotor.motorConstraint.setMotorSpeed(speed);
            dualMotor.motorConstraint.setMotorMaxForce(dualMotor.force || 20);
        }
    }
    
    showToast(`Set dual motor speed to ${speed.toFixed(1)} rad/s`);
}


// Update dual motor force
function updateDualMotorForce() {
    const force = parseFloat(document.getElementById('dual-motor-force-slider').value);
    document.getElementById('dual-motor-force-value').textContent = `${force.toFixed(1)} N·m`;
    
    // Find selected dual motor
    const selectedDualMotor = selectedObjects.find(obj => obj.userData.isDualMotor);
    if (!selectedDualMotor) return;
    
    // Find the dual motor data
    const dualMotor = dualMotors.find(m => m.id === selectedDualMotor.userData.id);
    if (!dualMotor) return;
    
    // Update force
    dualMotor.force = force;
    selectedDualMotor.userData.force = force;
    
    // If motor is active and running, apply the force
    if (dualMotor.motorConstraint && isSimulating && dualMotor.speed !== 0) {
        dualMotor.motorConstraint.setMotorMaxForce(force);
    }
    
    showToast(`Set dual motor force to ${force.toFixed(1)} N·m`);
}

// Set direction for dual motor
function setDualMotorDirection(direction) {
    // Find selected dual motor
    const selectedDualMotor = selectedObjects.find(obj => obj.userData.isDualMotor);
    if (!selectedDualMotor) {
        showToast("No dual motor selected", true);
        return;
    }
    
    // Find the dual motor data
    const dualMotor = dualMotors.find(m => m.id === selectedDualMotor.userData.id);
    if (!dualMotor) return;
    
    // Set speed based on direction
    if (direction === 'cw') {
        // Use existing speed magnitude or default to 3
        dualMotor.speed = Math.abs(dualMotor.speed) || 3;
    } else if (direction === 'ccw') {
        // Use existing speed magnitude or default to 3
        dualMotor.speed = -(Math.abs(dualMotor.speed) || 3);
    }
    
    selectedDualMotor.userData.speed = dualMotor.speed;
    
    // Apply to constraint if simulating
    if (isSimulating && dualMotor.motorConstraint) {
        dualMotor.motorConstraint.enableMotor();
        dualMotor.motorConstraint.setMotorSpeed(dualMotor.speed);
        dualMotor.motorConstraint.setMotorMaxForce(dualMotor.force || 20);
    }
    
    // Update speed slider and display value
    document.getElementById('dual-motor-speed-slider').value = dualMotor.speed;
    document.getElementById('dual-motor-speed-value').textContent = `${dualMotor.speed.toFixed(1)} rad/s`;
    
    showToast(`Set dual motor to ${direction === 'cw' ? 'clockwise' : 'counter-clockwise'}`);
}


// Stop dual motor
function stopDualMotor() {
    // Find selected dual motor
    const selectedDualMotor = selectedObjects.find(obj => obj.userData.isDualMotor);
    if (!selectedDualMotor) {
        showToast("No dual motor selected", true);
        return;
    }
    
    // Find the dual motor data
    const dualMotor = dualMotors.find(m => m.id === selectedDualMotor.userData.id);
    if (!dualMotor) return;
    
    // Stop the motor
    dualMotor.speed = 0;
    selectedDualMotor.userData.speed = 0;
    
    // Apply to constraint if simulating
    if (isSimulating && dualMotor.motorConstraint) {
        dualMotor.motorConstraint.disableMotor();
    }
    
    // Update speed slider and display value
    document.getElementById('dual-motor-speed-slider').value = 0;
    document.getElementById('dual-motor-speed-value').textContent = "0.0 rad/s";
    
    showToast("Dual motor stopped");
}

// Start dual motor attachment mode
function startDualMotorAttachMode() {
    // First find if there's a dual motor selected
    const selectedDualMotor = selectedObjects.find(obj => obj.userData.isDualMotor);
    
    if (!selectedDualMotor) {
        showToast("Select a dual motor first", true);
        return;
    }
    
    // Get the dual motor data
    const dualMotorData = dualMotors.find(m => m.id === selectedDualMotor.userData.id);
    
    if (!dualMotorData) {
        showToast("Dual motor data not found", true);
        return;
    }
    
    // If we're already in attach mode, cancel it
    if (dualMotorAttachState.active && dualMotorAttachState.motor === selectedDualMotor) {
        cancelDualMotorAttachMode();
        return;
    }
    
    // Determine which cube to attach
    let cubeToAttach = null;
    
    // Check if cube 1 is already attached
    const cube1Attached = dualMotorData.connections.some(conn => conn.cubeNumber === 1);
    // Check if cube 2 is already attached
    const cube2Attached = dualMotorData.connections.some(conn => conn.cubeNumber === 2);
    
    if (!cube1Attached) {
        cubeToAttach = selectedDualMotor.userData.cube1;
    } else if (!cube2Attached) {
        cubeToAttach = selectedDualMotor.userData.cube2;
    } else {
        showToast("Both cubes already attached. Detach one first.", true);
        return;
    }
    
    // Set up the attachment state
    dualMotorAttachState = {
        active: true,
        motor: selectedDualMotor,
        cube: cubeToAttach,
        dualMotor: dualMotorData
    };
    
    // Create a temporary connection line
    const cubePosition = new THREE.Vector3();
    cubeToAttach.getWorldPosition(cubePosition);
    
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: cubeToAttach === selectedDualMotor.userData.cube1 ? 0xfd5c63 : 0x3d85c6,
        linewidth: 3
    });
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        cubePosition,
        cubePosition.clone() // Second point will be updated on mouse move
    ]);
    
    tempConnectionLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(tempConnectionLine);
    
    showToast(`Select an object to attach to the ${cubeToAttach === selectedDualMotor.userData.cube1 ? 'left' : 'right'} cube`);
}

// Cancel dual motor attachment mode
function cancelDualMotorAttachMode() {
    dualMotorAttachState = {
        active: false,
        motor: null,
        cube: null,
        dualMotor: null
    };
    
    // Remove temporary connection line
    if (tempConnectionLine) {
        scene.remove(tempConnectionLine);
        tempConnectionLine = null;
    }
    
    showToast("Dual motor attachment cancelled");
}

// Update positions of fixed indicators
function updateFixedIndicators() {
    fixedObjects.forEach(obj => {
        if (obj.userData.fixedIndicator) {
            obj.userData.fixedIndicator.position.copy(obj.position);
            obj.userData.fixedIndicator.quaternion.copy(obj.quaternion);
        }
    });
}

