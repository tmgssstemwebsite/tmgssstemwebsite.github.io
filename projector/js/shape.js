
// FBX loader
let fbxLoader;


function createShape(shapeType) {
    // Get mass in grams and convert to kg for the simulation (1g = 0.001kg)
    const massInGrams = parseFloat(document.getElementById('mass-input').value);
    const mass = massInGrams * 0.001; // Convert g to kg for the simulation
    
    let width, height, length, radius, tubeRadius;
    
    // Get dimensions based on shape type
    if (shapeType === 'box' || shapeType === 'car') {
        width = parseFloat(document.getElementById('width-input').value) * 0.01; // cm to m
        height = parseFloat(document.getElementById('height-input').value) * 0.01; // cm to m
        length = parseFloat(document.getElementById('length-input').value) * 0.01; // cm to m
    } else if (shapeType === 'sphere' || shapeType === 'wheel') {
        radius = parseFloat(document.getElementById('width-input').value) * 0.01 / 2; // Diameter to radius, cm to m
    } else if (shapeType === 'cylinder' || shapeType === 'cone') {
        radius = parseFloat(document.getElementById('width-input').value) * 0.01 / 2; // Diameter to radius, cm to m
        height = parseFloat(document.getElementById('height-input').value) * 0.01; // cm to m
    } else if (shapeType === 'torus') {
        radius = parseFloat(document.getElementById('width-input').value) * 0.01 / 2; // Outer diameter to radius, cm to m
        tubeRadius = parseFloat(document.getElementById('height-input').value) * 0.01 / 2; // Tube diameter to radius, cm to m
    } else if (shapeType === 'dual-motor') {
        // Dual motor uses fixed size
        width = 0.2;  // 20 cm
        height = 0.1; // 10 cm
        length = 0.3; // 30 cm
    }
    
    const color = selectedColor;
    const material = new THREE.MeshPhongMaterial({ color: color });
    
    const x = 0;
    const y = 10;
    const z = 0;
    
    let mesh, body;
    
    // Create Three.js mesh based on shape type
    switch(shapeType) {
        case 'box':
            const boxGeometry = new THREE.BoxGeometry(width, height, length);
            mesh = new THREE.Mesh(boxGeometry, material);
            
            const boxShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, length/2));
            body = new CANNON.Body({ mass: mass });
            body.addShape(boxShape);
            
            // Store dimensions for later use
            mesh.userData.width = width;
            mesh.userData.height = height;
            mesh.userData.length = length;
            
            break;
            
        case 'sphere':
            const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
            mesh = new THREE.Mesh(sphereGeometry, material);
            
            const sphereShape = new CANNON.Sphere(radius);
            body = new CANNON.Body({ mass: mass });
            body.addShape(sphereShape);
            
            // Store size for later use
            mesh.userData.radius = radius;
            break;
            
        case 'cylinder':
            const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, height, 32);
            mesh = new THREE.Mesh(cylinderGeometry, material);
            
            const cylinderShape = new CANNON.Cylinder(radius, radius, height, 16);
            body = new CANNON.Body({ mass: mass });
            const cylinderQuaternion = new CANNON.Quaternion();
            cylinderQuaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            body.addShape(cylinderShape, new CANNON.Vec3(), cylinderQuaternion);
            
            // Store size for later use
            mesh.userData.radius = radius;
            mesh.userData.height = height;
            break;
            
        case 'cone':
            const coneGeometry = new THREE.ConeGeometry(radius, height, 32);
            mesh = new THREE.Mesh(coneGeometry, material);
            
            const coneShape = new CANNON.Cylinder(0.01, radius, height, 16);
            body = new CANNON.Body({ mass: mass });
            const coneQuaternion = new CANNON.Quaternion();
            coneQuaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            body.addShape(coneShape, new CANNON.Vec3(), coneQuaternion);
            
            // Store size for later use
            mesh.userData.radius = radius;
            mesh.userData.height = height;
            break;
            
        case 'torus':
            const torusGeometry = new THREE.TorusGeometry(radius, tubeRadius, 16, 32);
            mesh = new THREE.Mesh(torusGeometry, material);
            
            // For physics, we'll approximate a torus with a cylinder for better stability
            const torusShape = new CANNON.Cylinder(radius + tubeRadius, radius + tubeRadius, tubeRadius * 2, 16);
            body = new CANNON.Body({ mass: mass });
            const torusQuaternion = new CANNON.Quaternion();
            torusQuaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
            body.addShape(torusShape, new CANNON.Vec3(), torusQuaternion);
            
            // Store size for later use
            mesh.userData.radius = radius;
            mesh.userData.tubeRadius = tubeRadius;
            break;
        
        case 'car':
            // Create a car body (simplified as a box with wheels attachment points)
            const carGeometry = new THREE.BoxGeometry(width, height, length);
            
            // Create the car body with more detailed design
            const carGroup = new THREE.Group();
            
            // Main body
            const carBody = new THREE.Mesh(carGeometry, material);
            carGroup.add(carBody);
            
            // Car roof (slightly smaller and higher)
            const roofGeometry = new THREE.BoxGeometry(width * 0.8, height * 0.4, length * 0.6);
            const roofMaterial = new THREE.MeshPhongMaterial({ color: color });
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.y = height * 0.7; // Position on top of the main body
            roof.position.z = -length * 0.1; // Shift slightly backward
            carGroup.add(roof);
            
            // Add a front hood
            const hoodGeometry = new THREE.BoxGeometry(width * 0.8, height * 0.1, length * 0.3);
            const hood = new THREE.Mesh(hoodGeometry, material);
            hood.position.y = height * 0.25;
            hood.position.z = length * 0.35; // Position at the front
            carGroup.add(hood);
            
            // Add front bumper
            const bumperGeometry = new THREE.BoxGeometry(width * 0.9, height * 0.2, length * 0.1);
            const bumper = new THREE.Mesh(bumperGeometry, material);
            bumper.position.y = height * 0.1;
            bumper.position.z = length * 0.55; // Position at the very front
            carGroup.add(bumper);
            
            // Add headlights
            const headlightGeometry = new THREE.SphereGeometry(width * 0.06, 16, 16);
            const headlightMaterial = new THREE.MeshPhongMaterial({ color: 0xffffcc, emissive: 0xffffcc });
            
            const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            leftHeadlight.position.set(width * 0.35, height * 0.15, length * 0.52);
            carGroup.add(leftHeadlight);
            
            const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            rightHeadlight.position.set(-width * 0.35, height * 0.15, length * 0.52);
            carGroup.add(rightHeadlight);
            
            mesh = carGroup;
            
            const carShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, length/2));
            body = new CANNON.Body({ mass: mass });
            body.addShape(carShape);
            
            // Store dimensions for later use
            mesh.userData.width = width;
            mesh.userData.height = height;
            mesh.userData.length = length;
            mesh.userData.isCompound = true; // Mark as a compound object
            break;
            
        case 'wheel':
            // Create a wheel with realistic appearance
            const wheelGroup = new THREE.Group();
            
            // Wheel rim
            const rimGeometry = new THREE.CylinderGeometry(radius, radius, radius * 0.3, 32);
            rimGeometry.rotateX(Math.PI/2); // Rotate to proper orientation
            const rim = new THREE.Mesh(rimGeometry, material);
            wheelGroup.add(rim);
            
            // Wheel hub
            const hubGeometry = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, radius * 0.35, 16);
            hubGeometry.rotateX(Math.PI/2);
            const hubMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
            const hub = new THREE.Mesh(hubGeometry, hubMaterial);
            wheelGroup.add(hub);
            
            // Wheel spokes
            const spokeGeometry = new THREE.BoxGeometry(radius * 0.1, radius * 0.02, radius * 2 * 0.9);
            const spokeMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
            
            // Add several spokes
            for (let i = 0; i < 5; i++) {
                const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial);
                spoke.rotation.y = (Math.PI / 5) * i;
                wheelGroup.add(spoke);
            }
            
            mesh = wheelGroup;
            
            // Create a cylinder physics shape for the wheel
            const wheelShape = new CANNON.Cylinder(radius, radius, radius * 0.3, 16);
            body = new CANNON.Body({ mass: mass });
            const wheelQuaternion = new CANNON.Quaternion();
            wheelQuaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
            body.addShape(wheelShape, new CANNON.Vec3(), wheelQuaternion);
            
            // Store size for later use
            mesh.userData.radius = radius;
            mesh.userData.width = radius * 0.3; // Wheel width
            mesh.userData.isCompound = true; // Mark as a compound object
            break;
        
        case 'dual-motor':
            // Create a dual motor with two small cubes connected by a motor unit
            const dualMotorGroup = new THREE.Group();
            
            // Motor housing (center piece)
            const motorHousingGeometry = new THREE.BoxGeometry(width, height, length);
            const motorHousingMaterial = new THREE.MeshPhongMaterial({ color: color });
            const motorHousing = new THREE.Mesh(motorHousingGeometry, motorHousingMaterial);
            dualMotorGroup.add(motorHousing);
            
            // Add motor shaft indicators
            const shaftGeometry = new THREE.CylinderGeometry(height * 0.15, height * 0.15, width * 1.4, 16);
            const shaftMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
            const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
            shaft.rotation.z = Math.PI / 2; // Rotate to go through the motor sides
            dualMotorGroup.add(shaft);
            
            // Add the two connector cubes
            const cubeSize = height * 0.8;
            const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
            const cube1Material = new THREE.MeshPhongMaterial({ color: 0xfd5c63 }); // Reddish
            const cube2Material = new THREE.MeshPhongMaterial({ color: 0x3d85c6 }); // Blueish
            
            const cube1 = new THREE.Mesh(cubeGeometry, cube1Material);
            cube1.position.x = -width * 0.8; // Left side
            dualMotorGroup.add(cube1);
            cube1.userData = { 
                isDualMotorCube: true, 
                cubeNumber: 1,
                attachedObject: null
            };
            
            const cube2 = new THREE.Mesh(cubeGeometry, cube2Material);
            cube2.position.x = width * 0.8; // Right side
            dualMotorGroup.add(cube2);
            cube2.userData = { 
                isDualMotorCube: true, 
                cubeNumber: 2,
                attachedObject: null
            };
            
            mesh = dualMotorGroup;
            
            // Create physics shape for the dual motor
            const motorShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, length/2));
            body = new CANNON.Body({ mass: mass });
            body.addShape(motorShape);
            
            // Add shapes for the cubes
            const cubeShape = new CANNON.Box(new CANNON.Vec3(cubeSize/2, cubeSize/2, cubeSize/2));
            body.addShape(cubeShape, new CANNON.Vec3(-width * 0.8, 0, 0)); // Left cube
            body.addShape(cubeShape, new CANNON.Vec3(width * 0.8, 0, 0));  // Right cube
            
            // Store dimensions and special properties
            mesh.userData.width = width;
            mesh.userData.height = height;
            mesh.userData.length = length;
            mesh.userData.isDualMotor = true;
            mesh.userData.isCompound = true;
            mesh.userData.speed = 0;
            mesh.userData.force = 20; // Default force higher than regular motors
            mesh.userData.cube1 = cube1;
            mesh.userData.cube2 = cube2;
            
            // Add this to the dualMotors array
            dualMotors.push({
                id: objectIdCounter, // Will be set in a moment
                motor: mesh,
                body: body,
                speed: 0,
                force: 20,
                connections: [] // Will store objects connected to each cube
            });
            break;
    }
    
    // Set position for mesh and body
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    
    body.position.set(x, y, z);
    world.addBody(body);
    
    // Assign an id to this object pair
    const objectId = objectIdCounter++;
    mesh.userData.id = objectId;
    mesh.userData.type = shapeType;
    mesh.userData.mass = mass; // Store for later reference
    mesh.userData.color = color; // Store color for export/import
    mesh.userData.isFixed = false; // By default, objects are not fixed
    body.userData = { id: objectId, type: shapeType ,uuid:mesh.uuid };
    
    // Store mesh and body for later reference
    meshes.push(mesh);
    bodies.push(body);
    
    // Store initial position
    initialPositions.push({
        id: objectId,
        position: new THREE.Vector3(x, y, z),
        quaternion: new THREE.Quaternion().copy(mesh.quaternion)
    });
    
    // Add to object list
    addObjectToList(objectId, shapeType, color);
    
    // Update object count
    updateObjectCount();
    
    // Select the new object
    selectObject(mesh);
    
    // If this is a dual motor, update its reference in the dualMotors array
    if (shapeType === 'dual-motor') {
        dualMotors.find(motor => motor.id === undefined).id = objectId;
    }
    
    return mesh;
}


// Function to update dimension inputs based on selected object
function updateDimensionInputs(object) {
    if (!object) return;
    
    // For box objects and car
    if (object.userData.type === 'box' || object.userData.type === 'car' || object.userData.type === 'dual-motor') {
        document.getElementById('width-input').value = (object.userData.width * 100).toFixed(1); // m to cm
        document.getElementById('height-input').value = (object.userData.height * 100).toFixed(1); // m to cm
        document.getElementById('length-input').value = (object.userData.length * 100).toFixed(1); // m to cm
    } 
    // For spheres and wheels
    else if (object.userData.type === 'sphere' || object.userData.type === 'wheel') {
        const diameter = object.userData.radius * 2 * 100; // Convert radius to diameter in cm
        document.getElementById('width-input').value = diameter.toFixed(1);
        document.getElementById('height-input').value = diameter.toFixed(1);
        document.getElementById('length-input').value = diameter.toFixed(1);
    }
    // For cylinders and cones
    else if (object.userData.type === 'cylinder' || object.userData.type === 'cone') {
        document.getElementById('width-input').value = (object.userData.radius * 2 * 100).toFixed(1); // Diameter in cm
        document.getElementById('height-input').value = (object.userData.height * 100).toFixed(1); // Height in cm
        document.getElementById('length-input').value = (object.userData.radius * 2 * 100).toFixed(1); // Same as width
    }
    // For torus
    else if (object.userData.type === 'torus') {
        document.getElementById('width-input').value = (object.userData.radius * 2 * 100).toFixed(1); // Outer diameter in cm
        document.getElementById('height-input').value = (object.userData.tubeRadius * 2 * 100).toFixed(1); // Tube diameter in cm
        document.getElementById('length-input').value = (object.userData.radius * 2 * 100).toFixed(1); // Same as width
    }
}


// Function to update position inputs based on selected object
function updatePositionInputs(object) {
    if (!object) return;
    
    document.getElementById('pos-x').value = object.position.x.toFixed(2);
    document.getElementById('pos-y').value = object.position.y.toFixed(2);
    document.getElementById('pos-z').value = object.position.z.toFixed(2);
}


// Apply position from input fields to selected objects
function applyPosition() {
    if (selectedObjects.length === 0 || isSimulating) return;
    
    const x = parseFloat(document.getElementById('pos-x').value);
    const y = parseFloat(document.getElementById('pos-y').value);
    const z = parseFloat(document.getElementById('pos-z').value);
    
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
        showToast("Invalid position values", true);
        return;
    }
    
    // Apply to all selected objects
    selectedObjects.forEach(obj => {
        const objectId = obj.userData.id;
        const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === objectId);
        if (bodyIndex !== -1) {
            // Apply to physics body
            bodies[bodyIndex].position.set(x, y, z);
            
            // Apply to visual mesh
            obj.position.set(x, y, z);
        }
    });
    
    // Update connections
    updateConnections();
    
    // Update selection outlines
    updateSelectionOutlines();
    
    // Update transform controls
    if (transformControls.object) {
        transformControls.update();
    }
}


// Function to apply dimensions to selected objects
function applyDimensions() {
    if (selectedObjects.length === 0 || isSimulating) return;
    
    // Get new dimensions in cm and convert to meters
    const width = parseFloat(document.getElementById('width-input').value) * 0.01; // cm to m
    const height = parseFloat(document.getElementById('height-input').value) * 0.01; // cm to m
    const length = parseFloat(document.getElementById('length-input').value) * 0.01; // cm to m
    
    // Apply to each selected object
    selectedObjects.forEach(obj => {
        // Don't resize dual motors - they have fixed proportions
        if (obj.userData.type === 'dual-motor') {
            showToast("Cannot resize dual motors", true);
            return;
        }
        
        resizeObject(obj, width, height, length);
    });
    
    // Update connections
    updateConnections();
    
    // Regenerate outlines
    updateSelectionOutlines();
}

// Resize an object based on its type
function resizeObject(object, width, height, length) {
    if (!object) return;
    
    const objectId = object.userData.id;
    const meshIndex = meshes.findIndex(mesh => mesh.userData.id === objectId);
    const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === objectId);
    
    if (meshIndex === -1 || bodyIndex === -1) return;
    
    // Store the current position, rotation, and mass
    const position = object.position.clone();
    const quaternion = object.quaternion.clone();
    const mass = object.userData.mass;
    
    // Handle based on object type
    switch (object.userData.type) {
        case 'box':
            resizeBox(object, bodies[bodyIndex], width, height, length, position, quaternion, mass);
            break;
        case 'sphere':
            // For spheres, use width as diameter (average of dimensions)
            const radius = (width + height + length) / 6; // Average and divide by 2 for radius
            resizeSphere(object, bodies[bodyIndex], radius, position, quaternion, mass);
            break;
        case 'cylinder':
        case 'cone':
            // For cylinders/cones, use width as diameter and height as height
            const cylinderRadius = width / 2;
            resizeCylinder(object, bodies[bodyIndex], cylinderRadius, height, position, quaternion, mass, object.userData.type === 'cone');
            break;
        case 'torus':
            // For torus, use width as outer diameter and height as tube diameter
            const torusRadius = width / 2;
            const tubeRadius = height / 2;
            resizeTorus(object, bodies[bodyIndex], torusRadius, tubeRadius, position, quaternion, mass);
            break;
        case 'car':
            resizeCar(object, bodies[bodyIndex], width, height, length, position, quaternion, mass);
            break;
        case 'wheel':
            // For wheels, use width as diameter
            const wheelRadius = width / 2;
            resizeWheel(object, bodies[bodyIndex], wheelRadius, position, quaternion, mass);
            break;
        case 'fbx':
            scaleFbxModel(object, bodies[bodyIndex], width, height, length, position, quaternion, mass);
            break;
        default:
            break;
    }
}

function scaleFbxModel(mesh, body, width, height, length, position, quaternion, mass) {
    // Store current scale for reference
    const oldScale = mesh.scale.clone();
    
    // Remove body from world temporarily
    world.removeBody(body);
    
    // Convert input values from centimeters to scale factors
    const scaleX = width / 100;
    const scaleY = height / 100;
    const scaleZ = length / 100;
    
    // Apply new scale to the FBX model
    mesh.scale.set(scaleX, scaleY, scaleZ);
    
    // Update position and rotation if provided
    if (position) mesh.position.copy(position);
    if (quaternion) mesh.quaternion.copy(quaternion);
    
    // Ensure material properties are maintained
    mesh.traverse(function(child) {
        if (child.isMesh) {
            if (child.geometry) {
                child.geometry.computeVertexNormals();
            }
            
            child.material = new THREE.MeshLambertMaterial({
                color: child.material.color || new THREE.Color(selectedColor),
                side: THREE.DoubleSide,
                emissive: 0x000000,
                reflectivity: 0
            });
        }
    });
    
    // Recalculate improved center of gravity after scaling
    const { centerOfGravity, size } = calculateCenterOfGravity(mesh);
    
    console.log("New center of gravity after scaling:", centerOfGravity);
    console.log("New size after scaling:", size);
    
    // Create new physics shape based on the calculated size
    const halfExtents = size.clone().multiplyScalar(0.5);
    const boxShape = new CANNON.Box(new CANNON.Vec3(
        halfExtents.x, 
        halfExtents.y, 
        halfExtents.z
    ));
    
    // Calculate offset between model position and new center of gravity
    const offset = centerOfGravity.clone().sub(mesh.position);
    
    // Update physics body
    body.shapes = [];
    body.shapeOffsets = [];
    body.shapeOrientations = [];
    body.addShape(boxShape, new CANNON.Vec3(offset.x, offset.y, offset.z));
    
    // Set the center of mass
    body.shapeOffsets[0].copy(offset);
    
    if (position) body.position.copy(position);
    if (quaternion) body.quaternion.copy(quaternion);
    
    // Update mass
    if (mass !== undefined) {
        body.mass = mass;
        body.updateMassProperties();
        
        if (mass === 0) {
            body.type = CANNON.Body.STATIC;
        } else {
            body.type = CANNON.Body.DYNAMIC;
        }
        
        mesh.userData.mass = mass;
    } else {
        // Update mass properties for new center of mass
        body.updateMassProperties();
    }
    
    // Add body back to world
    world.addBody(body);
    
    // Update userData
    mesh.userData.scale = { x: scaleX, y: scaleY, z: scaleZ };
    mesh.userData.width = size.x;
    mesh.userData.height = size.y;
    mesh.userData.length = size.z;
    mesh.userData.physicsOffset = offset;
    mesh.userData.centerOfGravity = centerOfGravity.clone();
    
    // Visualize the new center of gravity (briefly)
    const cogSphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const cogSphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cogSphere = new THREE.Mesh(cogSphereGeometry, cogSphereMaterial);
    cogSphere.position.copy(centerOfGravity);
    scene.add(cogSphere);
    setTimeout(() => {
        scene.remove(cogSphere);
    }, 3000);
    
    // Update fixed indicator if present
    if (mesh.userData.isFixed && mesh.userData.fixedIndicator) {
        scene.remove(mesh.userData.fixedIndicator);
        const fixedIndicator = createFixedIndicator(mesh);
        mesh.userData.fixedIndicator = fixedIndicator;
    }
    
    // Update connections
    updateConnections(mesh, oldScale);
    
    // Show feedback
    showToast("Model scaled with updated center of gravity");
    
    console.log("Model scaled, new dimensions:", size);
    console.log("New center of gravity offset:", offset);
}


// Resize a box
function resizeBox(mesh, body, width, height, length, position, quaternion, mass) {
    // Remove old mesh from scene
    scene.remove(mesh);
    
    // Create new geometry with updated dimensions
    const material = new THREE.MeshPhongMaterial({ color: mesh.material.color });
    const newGeometry = new THREE.BoxGeometry(width, height, length);
    mesh.geometry.dispose();
    mesh.geometry = newGeometry;
    
    // Update mesh
    mesh.position.copy(position);
    mesh.quaternion.copy(quaternion);
    scene.add(mesh);
    
    // Update physics body
    world.removeBody(body);
    const boxShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, length/2));
    body.shapes = [];
    body.shapeOffsets = [];
    body.shapeOrientations = [];
    body.addShape(boxShape);
    body.position.copy(position);
    body.quaternion.copy(quaternion);
    world.addBody(body);
    
    // Update userData
    mesh.userData.width = width;
    mesh.userData.height = height;
    mesh.userData.length = length;
}


// Resize a car
function resizeCar(carGroup, body, width, height, length, position, quaternion, mass) {
    // Remove old mesh from scene
    scene.remove(carGroup);
    
    // Create a new car group
    const newCarGroup = new THREE.Group();
    
    // Create color material
    const material = new THREE.MeshPhongMaterial({ color: carGroup.userData.color });
    
    // Main body
    const carGeometry = new THREE.BoxGeometry(width, height, length);
    const carBody = new THREE.Mesh(carGeometry, material);
    newCarGroup.add(carBody);
    
    // Car roof (slightly smaller and higher)
    const roofGeometry = new THREE.BoxGeometry(width * 0.8, height * 0.4, length * 0.6);
    const roofMaterial = new THREE.MeshPhongMaterial({ color: carGroup.userData.color });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = height * 0.7;
    roof.position.z = -length * 0.1;
    newCarGroup.add(roof);
    
    // Add a front hood
    const hoodGeometry = new THREE.BoxGeometry(width * 0.8, height * 0.1, length * 0.3);
    const hood = new THREE.Mesh(hoodGeometry, material);
    hood.position.y = height * 0.25;
    hood.position.z = length * 0.35;
    newCarGroup.add(hood);
    
    // Add front bumper
    const bumperGeometry = new THREE.BoxGeometry(width * 0.9, height * 0.2, length * 0.1);
    const bumper = new THREE.Mesh(bumperGeometry, material);
    bumper.position.y = height * 0.1;
    bumper.position.z = length * 0.55;
    newCarGroup.add(bumper);
    
    // Add headlights
    const headlightGeometry = new THREE.SphereGeometry(width * 0.06, 16, 16);
    const headlightMaterial = new THREE.MeshPhongMaterial({ color: 0xffffcc, emissive: 0xffffcc });
    
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(width * 0.35, height * 0.15, length * 0.52);
    newCarGroup.add(leftHeadlight);
    
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(-width * 0.35, height * 0.15, length * 0.52);
    newCarGroup.add(rightHeadlight);
    
    // Update the position and rotation
    newCarGroup.position.copy(position);
    newCarGroup.quaternion.copy(quaternion);
    
    // Copy userData from original
    newCarGroup.userData = { ...carGroup.userData };
    newCarGroup.userData.width = width;
    newCarGroup.userData.height = height;
    newCarGroup.userData.length = length;
    
    // Replace old car with new one
    const index = meshes.indexOf(carGroup);
    if (index !== -1) {
        meshes[index] = newCarGroup;
    }
    
    // Add the new car to the scene
    scene.add(newCarGroup);
    
    // Update physics body
    world.removeBody(body);
    const carShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, length/2));
    body.shapes = [];
    body.shapeOffsets = [];
    body.shapeOrientations = [];
    body.addShape(carShape);
    body.position.copy(position);
    body.quaternion.copy(quaternion);
    world.addBody(body);
    
    // Update transform controls if this was the selected object
    if (transformControls.object === carGroup) {
        transformControls.attach(newCarGroup);
    }
    
    // Update selection if this was a selected object
    const selIndex = selectedObjects.indexOf(carGroup);
    if (selIndex !== -1) {
        selectedObjects[selIndex] = newCarGroup;
    }
    
    return newCarGroup;
}


// Resize a wheel
function resizeWheel(wheelGroup, body, radius, position, quaternion, mass) {
    // Remove old mesh from scene
    scene.remove(wheelGroup);
    
    // Create a new wheel group
    const newWheelGroup = new THREE.Group();
    const material = new THREE.MeshPhongMaterial({ color: wheelGroup.userData.color });
    
    // Wheel rim
    const rimGeometry = new THREE.CylinderGeometry(radius, radius, radius * 0.3, 32);
    rimGeometry.rotateX(Math.PI/2);
    const rim = new THREE.Mesh(rimGeometry, material);
    newWheelGroup.add(rim);
    
    // Wheel hub
    const hubGeometry = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, radius * 0.35, 16);
    hubGeometry.rotateX(Math.PI/2);
    const hubMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    newWheelGroup.add(hub);
    
    // Wheel spokes
    const spokeGeometry = new THREE.BoxGeometry(radius * 0.1, radius * 0.02, radius * 2 * 0.9);
    const spokeMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
    
    // Add several spokes
    for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial);
        spoke.rotation.y = (Math.PI / 5) * i;
        newWheelGroup.add(spoke);
    }
    
    // Update the position and rotation
    newWheelGroup.position.copy(position);
    newWheelGroup.quaternion.copy(quaternion);
    
    // Copy userData from original
    newWheelGroup.userData = { ...wheelGroup.userData };
    newWheelGroup.userData.radius = radius;
    newWheelGroup.userData.width = radius * 0.3; // Wheel width
    
    // Replace old wheel with new one
    const index = meshes.indexOf(wheelGroup);
    if (index !== -1) {
        meshes[index] = newWheelGroup;
    }
    
    // Add the new wheel to the scene
    scene.add(newWheelGroup);
    
    // Update physics body
    world.removeBody(body);
    const wheelShape = new CANNON.Cylinder(radius, radius, radius * 0.3, 16);
    body.shapes = [];
    body.shapeOffsets = [];
    body.shapeOrientations = [];
    
    const wheelQuaternion = new CANNON.Quaternion();
    wheelQuaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
    body.addShape(wheelShape, new CANNON.Vec3(), wheelQuaternion);
    body.position.copy(position);
    body.quaternion.copy(quaternion);
    world.addBody(body);
    
    // Update transform controls if this was the selected object
    if (transformControls.object === wheelGroup) {
        transformControls.attach(newWheelGroup);
    }
    
    // Update selection if this was a selected object
    const selIndex = selectedObjects.indexOf(wheelGroup);
    if (selIndex !== -1) {
        selectedObjects[selIndex] = newWheelGroup;
    }
    
    return newWheelGroup;
}


// Resize a sphere
function resizeSphere(mesh, body, radius, position, quaternion, mass) {
    // Remove old mesh from scene
    scene.remove(mesh);
    
    // Create new geometry with updated dimensions
    const material = new THREE.MeshPhongMaterial({ color: mesh.material.color });
    const newGeometry = new THREE.SphereGeometry(radius, 32, 32);
    mesh.geometry.dispose();
    mesh.geometry = newGeometry;
    
    // Update mesh
    mesh.position.copy(position);
    mesh.quaternion.copy(quaternion);
    scene.add(mesh);
    
    // Update physics body
    world.removeBody(body);
    const sphereShape = new CANNON.Sphere(radius);
    body.shapes = [];
    body.shapeOffsets = [];
    body.shapeOrientations = [];
    body.addShape(sphereShape);
    body.position.copy(position);
    body.quaternion.copy(quaternion);
    world.addBody(body);
    
    // Update userData
    mesh.userData.radius = radius;
}

// Resize a cylinder or cone
function resizeCylinder(mesh, body, radius, height, position, quaternion, mass, isCone) {
    // Remove old mesh from scene
    scene.remove(mesh);
    
    // Create new geometry with updated dimensions
    const material = new THREE.MeshPhongMaterial({ color: mesh.material.color });
    let newGeometry;
    
    if (isCone) {
        newGeometry = new THREE.ConeGeometry(radius, height, 32);
    } else {
        newGeometry = new THREE.CylinderGeometry(radius, radius, height, 32);
    }
    
    mesh.geometry.dispose();
    mesh.geometry = newGeometry;
    
    // Update mesh
    mesh.position.copy(position);
    mesh.quaternion.copy(quaternion);
    scene.add(mesh);
    
    // Update physics body
    world.removeBody(body);
    let cylinderShape;
    if (isCone) {
        cylinderShape = new CANNON.Cylinder(0.01, radius, height, 16);
    } else {
        cylinderShape = new CANNON.Cylinder(radius, radius, height, 16);
    }
    
    body.shapes = [];
    body.shapeOffsets = [];
    body.shapeOrientations = [];
    
    const bodyQuaternion = new CANNON.Quaternion();
    bodyQuaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    body.addShape(cylinderShape, new CANNON.Vec3(), bodyQuaternion);
    body.position.copy(position);
    body.quaternion.copy(quaternion);
    world.addBody(body);
    
    // Update userData
    mesh.userData.radius = radius;
    mesh.userData.height = height;
}

// Resize a torus
function resizeTorus(mesh, body, radius, tubeRadius, position, quaternion, mass) {
    // Remove old mesh from scene
    scene.remove(mesh);
    
    // Create new geometry with updated dimensions
    const material = new THREE.MeshPhongMaterial({ color: mesh.material.color });
    const newGeometry = new THREE.TorusGeometry(radius, tubeRadius, 16, 32);
    mesh.geometry.dispose();
    mesh.geometry = newGeometry;
    
    // Update mesh
    mesh.position.copy(position);
    mesh.quaternion.copy(quaternion);
    scene.add(mesh);
    
    // Update physics body
    world.removeBody(body);
    // Use a cylinder to approximate the torus
    const torusShape = new CANNON.Cylinder(radius + tubeRadius, radius + tubeRadius, tubeRadius * 2, 16);
    body.shapes = [];
    body.shapeOffsets = [];
    body.shapeOrientations = [];
    
    const bodyQuaternion = new CANNON.Quaternion();
    bodyQuaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
    body.addShape(torusShape, new CANNON.Vec3(), bodyQuaternion);
    body.position.copy(position);
    body.quaternion.copy(quaternion);
    world.addBody(body);
    
    // Update userData
    mesh.userData.radius = radius;
    mesh.userData.tubeRadius = tubeRadius;
}

// Apply rotation from input fields to selected objects
function applyRotation() {
    if (selectedObjects.length === 0 || isSimulating) return;
    
    const xRot = parseFloat(document.getElementById('rot-x').value) * Math.PI / 180;
    const yRot = parseFloat(document.getElementById('rot-y').value) * Math.PI / 180;
    const zRot = parseFloat(document.getElementById('rot-z').value) * Math.PI / 180;
    
    // Create a new quaternion from Euler angles
    const euler = new THREE.Euler(xRot, yRot, zRot, 'XYZ');
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    
    // Apply to all selected objects
    selectedObjects.forEach(obj => {
        const objectId = obj.userData.id;
        const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === objectId);
        if (bodyIndex !== -1) {
            // Apply to physics body
            bodies[bodyIndex].quaternion.set(
                quaternion.x,
                quaternion.y,
                quaternion.z,
                quaternion.w
            );
            
            // Apply to visual mesh
            obj.quaternion.copy(quaternion);
        }
    });
    
    // Update connections
    updateConnections();
    
    // Update selection outlines
    updateSelectionOutlines();
}

// Apply color to selected objects
function applyColorToSelected(color) {
    if (selectedObjects.length === 0) return;
    
    selectedObjects.forEach(obj => {
        // Handle different object types
        if (obj.userData.isCompound) {
            // For compound objects like car or wheel, traverse children
            obj.traverse(child => {
                if (child.isMesh && child.material && child.material.color !== undefined) {
                    // Skip certain parts like headlights which have special materials
                    if (child.material.emissive && child.material.emissive.r > 0.5) {
                        return; // Skip emissive parts
                    }
                    child.material.color.set(color);
                }
            });
        } else if (obj.material) {
            // For simple objects with a single material
            obj.material.color.set(color);
        }
        
        // Update userData
        obj.userData.color = color;
        
        // Update object list
        const objEntry = document.querySelector(`#object-list div[data-id="${obj.userData.id}"] .w-4`);
        if (objEntry) {
            objEntry.style.backgroundColor = color;
        }
    });
}

// Handle FBX file upload
function handleFBXUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusElement = document.getElementById('fbx-status');
    statusElement.textContent = "Loading model...";
    
    // Convert to data URL to load it
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        console.log(dataUrl)
        try {
            // Load the FBX model
            fbxLoader.load(
                dataUrl, 
                // onLoad callback
                function(fbxModel) {
                    importFBXModel(fbxModel,dataUrl);
                    statusElement.textContent = "Model loaded successfully!";
                    setTimeout(() => { statusElement.textContent = ""; }, 3000);
                },
                // onProgress callback
                function(xhr) {
                    statusElement.textContent = `Loading: ${Math.round((xhr.loaded / xhr.total) * 100)}%`;
                },
                // onError callback
                function(error) {
                    console.error('Error loading FBX:', error);
                    statusElement.textContent = "Error loading model. See console for details.";
                }
            );
        } catch (error) {
            console.error('Error setting up FBX loader:', error);
            statusElement.textContent = "Error setting up model loader.";
        }
    };
    reader.readAsDataURL(file);
}


// Create an object from imported data
function createImportedObject(objData) {
    let mesh, body;
    const material = new THREE.MeshPhongMaterial({ color: objData.color });
    const position = new THREE.Vector3(objData.position.x, objData.position.y, objData.position.z);
    const quaternion = new THREE.Quaternion(objData.rotation.x, objData.rotation.y, objData.rotation.z, objData.rotation.w);
    
    // Create mesh based on object type
    switch(objData.type) {
        case 'box':
            const boxGeometry = new THREE.BoxGeometry(objData.width, objData.height, objData.length);
            mesh = new THREE.Mesh(boxGeometry, material);
            
            const boxShape = new CANNON.Box(new CANNON.Vec3(objData.width/2, objData.height/2, objData.length/2));
            body = new CANNON.Body({ mass: objData.mass });
            body.addShape(boxShape);
            
            // Store dimensions
            mesh.userData.width = objData.width;
            mesh.userData.height = objData.height;
            mesh.userData.length = objData.length;
            break;
            
        case 'sphere':
            const sphereGeometry = new THREE.SphereGeometry(objData.radius, 32, 32);
            mesh = new THREE.Mesh(sphereGeometry, material);
            
            const sphereShape = new CANNON.Sphere(objData.radius);
            body = new CANNON.Body({ mass: objData.mass });
            body.addShape(sphereShape);
            
            mesh.userData.radius = objData.radius;
            break;
            
        case 'cylinder':
            const cylinderGeometry = new THREE.CylinderGeometry(objData.radius, objData.radius, objData.height, 32);
            mesh = new THREE.Mesh(cylinderGeometry, material);
            
            const cylinderShape = new CANNON.Cylinder(objData.radius, objData.radius, objData.height, 16);
            body = new CANNON.Body({ mass: objData.mass });
            const cylinderQuaternion = new CANNON.Quaternion();
            cylinderQuaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            body.addShape(cylinderShape, new CANNON.Vec3(), cylinderQuaternion);
            
            mesh.userData.radius = objData.radius;
            mesh.userData.height = objData.height;
            break;
            
        case 'cone':
            const coneGeometry = new THREE.ConeGeometry(objData.radius, objData.height, 32);
            mesh = new THREE.Mesh(coneGeometry, material);
            
            const coneShape = new CANNON.Cylinder(0.01, objData.radius, objData.height, 16);
            body = new CANNON.Body({ mass: objData.mass });
            const coneQuaternion = new CANNON.Quaternion();
            coneQuaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            body.addShape(coneShape, new CANNON.Vec3(), coneQuaternion);
            
            mesh.userData.radius = objData.radius;
            mesh.userData.height = objData.height;
            break;
            
        case 'torus':
            const torusGeometry = new THREE.TorusGeometry(objData.radius, objData.tubeRadius, 16, 32);
            mesh = new THREE.Mesh(torusGeometry, material);
            
            const torusShape = new CANNON.Cylinder(
                objData.radius + objData.tubeRadius, 
                objData.radius + objData.tubeRadius, 
                objData.tubeRadius * 2, 
                16
            );
            body = new CANNON.Body({ mass: objData.mass });
            const torusQuaternion = new CANNON.Quaternion();
            torusQuaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
            body.addShape(torusShape, new CANNON.Vec3(), torusQuaternion);
            
            mesh.userData.radius = objData.radius;
            mesh.userData.tubeRadius = objData.tubeRadius;
            break;
            
        case 'car':
            // Create a car with imported dimensions
            const carGroup = new THREE.Group();
            const width = objData.width;
            const height = objData.height;
            const length = objData.length;
            
            // Main body
            const carGeometry = new THREE.BoxGeometry(width, height, length);
            const carBody = new THREE.Mesh(carGeometry, material);
            carGroup.add(carBody);
            
            // Car roof (slightly smaller and higher)
            const roofGeometry = new THREE.BoxGeometry(width * 0.8, height * 0.4, length * 0.6);
            const roof = new THREE.Mesh(roofGeometry, material);
            roof.position.y = height * 0.7;
            roof.position.z = -length * 0.1;
            carGroup.add(roof);
            
            // Add a front hood
            const hoodGeometry = new THREE.BoxGeometry(width * 0.8, height * 0.1, length * 0.3);
            const hood = new THREE.Mesh(hoodGeometry, material);
            hood.position.y = height * 0.25;
            hood.position.z = length * 0.35;
            carGroup.add(hood);
            
            // Add front bumper
            const bumperGeometry = new THREE.BoxGeometry(width * 0.9, height * 0.2, length * 0.1);
            const bumper = new THREE.Mesh(bumperGeometry, material);
            bumper.position.y = height * 0.1;
            bumper.position.z = length * 0.55;
            carGroup.add(bumper);
            
            // Add headlights
            const headlightGeometry = new THREE.SphereGeometry(width * 0.06, 16, 16);
            const headlightMaterial = new THREE.MeshPhongMaterial({ color: 0xffffcc, emissive: 0xffffcc });
            
            const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            leftHeadlight.position.set(width * 0.35, height * 0.15, length * 0.52);
            carGroup.add(leftHeadlight);
            
            const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            rightHeadlight.position.set(-width * 0.35, height * 0.15, length * 0.52);
            carGroup.add(rightHeadlight);
            
            mesh = carGroup;
            
            const carShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, length/2));
            body = new CANNON.Body({ mass: objData.mass });
            body.addShape(carShape);
            
            // Store dimensions
            mesh.userData.width = width;
            mesh.userData.height = height;
            mesh.userData.length = length;
            mesh.userData.isCompound = true;
            break;
            
        case 'wheel':
            // Create a wheel with imported radius
            const wheelGroup = new THREE.Group();
            const wheelRadius = objData.radius;
            const wheelWidth = objData.width || (wheelRadius * 0.3);
            
            // Wheel rim
            const rimGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 32);
            rimGeometry.rotateX(Math.PI/2);
            const rim = new THREE.Mesh(rimGeometry, material);
            wheelGroup.add(rim);
            
            // Wheel hub
            const hubGeometry = new THREE.CylinderGeometry(wheelRadius * 0.2, wheelRadius * 0.2, wheelWidth * 1.1, 16);
            hubGeometry.rotateX(Math.PI/2);
            const hubMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
            const hub = new THREE.Mesh(hubGeometry, hubMaterial);
            wheelGroup.add(hub);
            
            // Wheel spokes
            const spokeGeometry = new THREE.BoxGeometry(wheelRadius * 0.1, wheelRadius * 0.02, wheelRadius * 2 * 0.9);
            const spokeMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
            
            // Add several spokes
            for (let i = 0; i < 5; i++) {
                const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial);
                spoke.rotation.y = (Math.PI / 5) * i;
                wheelGroup.add(spoke);
            }
            
            mesh = wheelGroup;
            
            const wheelShape = new CANNON.Cylinder(wheelRadius, wheelRadius, wheelWidth, 16);
            body = new CANNON.Body({ mass: objData.mass });
            const wheelBodyQuaternion = new CANNON.Quaternion();
            wheelBodyQuaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
            body.addShape(wheelShape, new CANNON.Vec3(), wheelBodyQuaternion);
            
            // Store size for later use
            mesh.userData.radius = wheelRadius;
            mesh.userData.width = wheelWidth;
            mesh.userData.isCompound = true;
            break;
            
        case 'dual-motor':
            // Create dual motor
            const dualMotorGroup = new THREE.Group();
            const motorWidth = objData.width || 0.2;  // Default 20 cm
            const motorHeight = objData.height || 0.1; // Default 10 cm
            const motorLength = objData.length || 0.3; // Default 30 cm
            
            // Motor housing (center piece)
            const motorHousingGeometry = new THREE.BoxGeometry(motorWidth, motorHeight, motorLength);
            const motorHousingMaterial = new THREE.MeshPhongMaterial({ color: objData.color });
            const motorHousing = new THREE.Mesh(motorHousingGeometry, motorHousingMaterial);
            dualMotorGroup.add(motorHousing);
            
            // Add motor shaft indicators
            const shaftGeometry = new THREE.CylinderGeometry(motorHeight * 0.15, motorHeight * 0.15, motorWidth * 1.4, 16);
            const shaftMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
            const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
            shaft.rotation.z = Math.PI / 2; // Rotate to go through the motor sides
            dualMotorGroup.add(shaft);
            
            // Add the two connector cubes
            const cubeSize = motorHeight * 0.8;
            const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
            const cube1Material = new THREE.MeshPhongMaterial({ color: 0xfd5c63 }); // Reddish
            const cube2Material = new THREE.MeshPhongMaterial({ color: 0x3d85c6 }); // Blueish
            
            const cube1 = new THREE.Mesh(cubeGeometry, cube1Material);
            cube1.position.x = -motorWidth * 0.8; // Left side
            dualMotorGroup.add(cube1);
            cube1.userData = { 
                isDualMotorCube: true, 
                cubeNumber: 1,
                attachedObject: null
            };
            
            const cube2 = new THREE.Mesh(cubeGeometry, cube2Material);
            cube2.position.x = motorWidth * 0.8; // Right side
            dualMotorGroup.add(cube2);
            cube2.userData = { 
                isDualMotorCube: true, 
                cubeNumber: 2,
                attachedObject: null
            };
            
            mesh = dualMotorGroup;
            
            // Create physics shape for the dual motor
            const motorShape = new CANNON.Box(new CANNON.Vec3(motorWidth/2, motorHeight/2, motorLength/2));
            body = new CANNON.Body({ mass: objData.mass });
            body.addShape(motorShape);
            
            // Add shapes for the cubes
            const cubeShape = new CANNON.Box(new CANNON.Vec3(cubeSize/2, cubeSize/2, cubeSize/2));
            body.addShape(cubeShape, new CANNON.Vec3(-motorWidth * 0.8, 0, 0)); // Left cube
            body.addShape(cubeShape, new CANNON.Vec3(motorWidth * 0.8, 0, 0));  // Right cube
            
            // Store dimensions and special properties
            mesh.userData.width = motorWidth;
            mesh.userData.height = motorHeight;
            mesh.userData.length = motorLength;
            mesh.userData.isDualMotor = true;
            mesh.userData.isCompound = true;
            mesh.userData.cube1 = cube1;
            mesh.userData.cube2 = cube2;
            mesh.userData.speed = objData.speed || 0;
            mesh.userData.force = objData.force || 20;
            
            // Add to dualMotors array
            dualMotors.push({
                id: objData.id,
                motor: mesh,
                body: body,
                speed: objData.speed || 0,
                force: objData.force || 20,
                connections: []
            });
            break;
            
        case 'fbx':
            // FBX models would need special handling
            showToast("FBX import from scene not supported yet", true);
            return null;
            
        default:
            console.warn(`Unknown object type: ${objData.type}`);
            return null;
    }
    
    // Set position and rotation
    mesh.position.copy(position);
    mesh.quaternion.copy(quaternion);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    
    body.position.copy(position);
    body.quaternion.copy(quaternion);
    world.addBody(body);
    
    // Assign object ID
    const objectId = objData.id || objectIdCounter++;
    mesh.userData.id = objectId;
    mesh.userData.type = objData.type;
    mesh.userData.mass = objData.mass;
    mesh.userData.color = objData.color;
    mesh.userData.isFixed = objData.isFixed || false;
    body.userData = { id: objectId, type: objData.type };
    
    // Make sure objectIdCounter is always higher than any imported ID
    if (objectId >= objectIdCounter) {
        objectIdCounter = objectId + 1;
    }
    
    // Store initial position
    initialPositions.push({
        id: objectId,
        position: position.clone(),
        quaternion: quaternion.clone()
    });
    
    // Add to arrays
    meshes.push(mesh);
    bodies.push(body);
    
    // Add to object list
    addObjectToList(objectId, objData.type, objData.color);
    
    // Update object count
    updateObjectCount();
    
    return mesh;
}

function addObjectToList(id, type, color) {
    const objectList = document.getElementById('object-list');
    
    // Remove the "No objects yet" message if it exists
    const noObjectsMsg = objectList.querySelector('.text-center');
    if (noObjectsMsg) {
        objectList.removeChild(noObjectsMsg);
    }
    
    // Create object entry
    const objectEntry = document.createElement('div');
    objectEntry.className = 'flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600';
    objectEntry.dataset.id = id;
    
    // Format the type display
    let displayType = type;
    if (type === 'box') displayType = 'Cube';
    if (type === 'dual-motor') displayType = 'Dual Motor';
    
    // Color indicator and object type
    objectEntry.innerHTML = `
        <div class="flex items-center">
            <div class="w-4 h-4 rounded-full mr-2" style="background-color: ${color}"></div>
            <span class="capitalize">${displayType}</span>
        </div>
        <button class="delete-object-btn text-red-600 hover:text-red-800">
            ×
        </button>
    `;
    
    // Add click event to select the object
    objectEntry.addEventListener('click', (e) => {
        // Only handle if not clicking the delete button
        if (!e.target.classList.contains('delete-object-btn')) {
            const objId = parseInt(objectEntry.dataset.id);
            const targetObject = meshes.find(mesh => mesh.userData.id === objId);
            
            if (targetObject) {
                // Check if holding shift for multi-select
                if (e.shiftKey) {
                    // Toggle selection of this object
                    const index = selectedObjects.indexOf(targetObject);
                    if (index === -1) {
                        // Add to selection
                        selectAdditionalObject(targetObject);
                    } else {
                        // Remove from selection
                        deselectObject(targetObject);
                    }
                } else {
                    // Single selection
                    clearSelection();
                    selectObject(targetObject);
                }
            }
        }
    });
    
    // Add delete functionality
    objectEntry.querySelector('.delete-object-btn').addEventListener('click', () => {
        deleteObject(id);
    });
    
    objectList.appendChild(objectEntry);
    
    // Check if this object is fixed and update the appearance
    const obj = meshes.find(mesh => mesh.userData.id === id);
    if (obj && obj.userData.isFixed) {
        objectEntry.classList.add('bg-purple-100', 'dark:bg-purple-900');
    }
}

function deleteObject(id) {
    // Find the index of the mesh and body
    let meshIndex = -1;
    let bodyIndex = -1;
    
    for (let i = 0; i < meshes.length; i++) {
        if (meshes[i].userData.id === id) {
            meshIndex = i;
            break;
        }
    }
    
    for (let i = 0; i < bodies.length; i++) {
        if (bodies[i].userData && bodies[i].userData.id === id) {
            bodyIndex = i;
            break;
        }
    }
    
    if (meshIndex === -1) return;
    
    const objToDelete = meshes[meshIndex];
    
    // Check if the object has any connections and remove them
    // Remove sticks
    for (let i = sticks.length - 1; i >= 0; i--) {
        if (sticks[i].object1 === objToDelete || sticks[i].object2 === objToDelete) {
            removeStick(sticks[i]);
        }
    }
    
    // Remove motors
    for (let i = motors.length - 1; i >= 0; i--) {
        if (motors[i].object1 === objToDelete || motors[i].object2 === objToDelete) {
            removeMotor(motors[i]);
        }
    }
    
    // Remove glues
    for (let i = glues.length - 1; i >= 0; i--) {
        if (glues[i].object1 === objToDelete || glues[i].object2 === objToDelete) {
            removeGlue(glues[i]);
        }
    }
    
    // If it's a dual motor, remove it from the dualMotors array
    if (objToDelete.userData.isDualMotor) {
        const dualMotorIndex = dualMotors.findIndex(m => m.id === id);
        if (dualMotorIndex !== -1) {
            // Remove any connections
            const dualMotor = dualMotors[dualMotorIndex];
            if (dualMotor.connections) {
                dualMotor.connections.forEach(conn => {
                    if (conn.constraint) {
                        world.removeConstraint(conn.constraint);
                    }
                });
            }
            
            dualMotors.splice(dualMotorIndex, 1);
        }
    }
    
    // Check if this is an object that's connected to a dual motor cube
    dualMotors.forEach(motor => {
        if (motor.connections) {
            for (let i = motor.connections.length - 1; i >= 0; i--) {
                if (motor.connections[i].object === objToDelete) {
                    // Remove the constraint
                    if (motor.connections[i].constraint) {
                        world.removeConstraint(motor.connections[i].constraint);
                    }
                    
                    // Update the cube status
                    const cube = motor.connections[i].cubeNumber === 1 ?
                        motor.motor.userData.cube1 : motor.motor.userData.cube2;
                    
                    if (cube) {
                        cube.userData.attachedObject = null;
                    }
                    
                    // Remove from connections array
                    motor.connections.splice(i, 1);
                }
            }
        }
    });
    
    // Check if this object is fixed
    if (objToDelete.userData.isFixed) {
        // Remove from fixedObjects array
        const fixedIndex = fixedObjects.indexOf(objToDelete);
        if (fixedIndex !== -1) {
            fixedObjects.splice(fixedIndex, 1);
        }
        
        // Remove fixed indicator
        if (objToDelete.userData.fixedIndicator) {
            scene.remove(objToDelete.userData.fixedIndicator);
        }
    }
    
    // Check if this object is selected, if so, remove from selection
    const selIndex = selectedObjects.indexOf(objToDelete);
    if (selIndex !== -1) {
        selectedObjects.splice(selIndex, 1);
        
        // If it's the object with transform controls, detach
        if (transformControls.object === objToDelete) {
            transformControls.detach();
        }
    }
    
    // Remove the initial position
    const initialPosIndex = initialPositions.findIndex(p => p.id === id);
    if (initialPosIndex !== -1) {
        initialPositions.splice(initialPosIndex, 1);
    }
    
    // Remove mesh and body
    if (meshIndex !== -1) {
        scene.remove(meshes[meshIndex]);
        meshes.splice(meshIndex, 1);
    }
    
    if (bodyIndex !== -1) {
        world.removeBody(bodies[bodyIndex]);
        bodies.splice(bodyIndex, 1);
    }
    
    // Remove from object list
    const objectEntry = document.querySelector(`#object-list div[data-id="${id}"]`);
    if (objectEntry) {
        objectEntry.parentNode.removeChild(objectEntry);
    }
    
    // If no objects left, show "No objects yet" message
    if (meshes.length === 0) {
        const objectList = document.getElementById('object-list');
        objectList.innerHTML = '<div class="text-center text-gray-500 dark:text-gray-400 text-sm">No objects yet</div>';
    }
    
    // Update object count
    updateObjectCount();
    
    // Update selection outlines
    updateSelectionOutlines();
    
    // Update connections list
    updateConnectionsList();
    
    // Update floating motor panel
    updateMotorRemotePanel();
    
    // Hide motor controls if needed
    updateMotorControlsVisibility();
    
    // Hide dual motor controls if needed
    updateDualMotorControlsVisibility();
}

function updateObjectCount() {
    document.getElementById('object-count').textContent = meshes.length;
}


// Function to rotate selected objects
function rotateSelectedObjects(axis, angle) {
    // Create rotation quaternion
    const rotationQuat = new THREE.Quaternion();
    const rotationAxis = new THREE.Vector3();
    
    if (axis === 'x') {
        rotationAxis.set(1, 0, 0);
    } else if (axis === 'y') {
        rotationAxis.set(0, 1, 0);
    } else if (axis === 'z') {
        rotationAxis.set(0, 0, 1);
    }
    
    rotationQuat.setFromAxisAngle(rotationAxis, angle);
    
    // Apply to all selected objects
    selectedObjects.forEach(obj => {
        const objId = obj.userData.id;
        const bodyIndex = bodies.findIndex(body => body.userData && body.userData.id === objId);
        
        if (bodyIndex !== -1) {
            // Apply to the object's quaternion
            obj.quaternion.premultiply(rotationQuat);
            
            // Apply to physics body
            const cannonQuat = new CANNON.Quaternion();
            cannonQuat.set(rotationQuat.x, rotationQuat.y, rotationQuat.z, rotationQuat.w);
            bodies[bodyIndex].quaternion.mult(cannonQuat, bodies[bodyIndex].quaternion);
        }
    });
    
    // Update selection outline
    updateSelectionOutlines();
    
    // Update connections (if implemented)
    if (typeof updateConnections === 'function') {
        updateConnections();
    }
    
    // Update fixed indicators (if implemented)
    if (typeof updateFixedIndicators === 'function') {
        updateFixedIndicators();
    }
    
    showToast(`Rotated ${axis.toUpperCase()} axis by ${(angle * 180 / Math.PI).toFixed(0)}°`);
}

// Set up rotation controls
function setupRotationControls() {
    const rotationButtons = document.querySelectorAll('.control-button[data-axis]');
    
    rotationButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (selectedObjects.length === 0) {
                showToast("No objects selected for rotation");
                return;
            }
            
            const axis = this.getAttribute('data-axis');
            const direction = this.getAttribute('data-direction');
            
            // Get angle in degrees, convert to radians
            let angleInDegrees = parseFloat(document.getElementById('rotation-angle-input').value);
            if (isNaN(angleInDegrees) || angleInDegrees <= 0) {
                angleInDegrees = 15; // Default angle
            }
            
            // Convert to radians
            let angleInRadians = angleInDegrees * Math.PI / 180;
            
            // Apply negative angle if needed
            if (direction === 'negative') {
                angleInRadians = -angleInRadians;
            }
            
            // Apply rotation
            rotateSelectedObjects(axis, angleInRadians);
        });
    });
}

// Show/hide rotation controls based on selection
function updateRotationControlsVisibility() {
    const rotationPanel = document.getElementById('rotation-controls-panel');
    const selectedObjectName = document.getElementById('selected-object-name');
    
    if (selectedObjects.length > 0) {
        rotationPanel.classList.remove('hidden');
        
        // Update selected object name
        if (selectedObjects.length === 1) {
            selectedObjectName.textContent = selectedObjects[0].userData.name || "Unnamed Object";
        } else {
            selectedObjectName.textContent = `${selectedObjects.length} objects selected`;
        }
    } else {
        rotationPanel.classList.add('hidden');
        selectedObjectName.textContent = "None";
    }
}
