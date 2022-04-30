import * as THREE from 'three';
import { Utils } from './utils';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class Profile {

    constructor(scene, renderer, raycaster, gui, objects, range, sizes) {
        this.scene = scene;
        this.renderer = renderer;
        this.raycaster = raycaster;
        this.pickedPointsClip = [];
        this.clippingSettings = {
            profile: {
                enabled: false,
                width: 1,
                showHelpers: false,
                clear: this.clearProfile.bind(this),
                showWindow: this.generateNew2DWindow.bind(this),
                enabledMainWindowClipping: false,
                task: {
                    inside: {
                        enabled: true,
                        set: this.setInsideTask.bind(this),
                    },
                    outside: {
                        enabled: false,
                        set: this.setOutsideTask.bind(this),
                    },
                    none: {
                        enabled: false,
                        set: this.setNoneTask.bind(this),
                    },
                }
            }
        };
        this.gui = gui;
        this.objects = objects;
        this.range = range;
        // if (!this.objects.ground.geometry.boundingSphere)
        //     this.objects.ground.geometry.computeBoundingSphere();
        this.sizes = sizes;
        this.initGUI();
    }

    initGUI() {
        this.clipping = this.gui.addFolder('Clipping');
        this.profile = this.clipping.addFolder('Profile');
        this.profile.add(this.clippingSettings.profile, 'enabled').name("Enable");
        this.profile.add(this.clippingSettings.profile, 'enabledMainWindowClipping').name("Enable Global CLipping").onChange(function(enabled) {
            this.renderer.localClippingEnabled = enabled;
        }.bind(this));
        this.profile.add(this.clippingSettings.profile, 'width', 0, 2 * this.range, 0.005).onChange(this.clipProfileWidthChange.bind(this)).name("Width");
        this.profile.add(this.clippingSettings.profile, 'showHelpers').onChange(function(showHelpers){
            if(this.helpers) this.helpers.visible = showHelpers;
        }.bind(this));
        this.profile.add(this.clippingSettings.profile, 'showWindow').name('Open Window');
        this.profile.add(this.clippingSettings.profile, 'clear').name("Clear");

        this.clipTask = this.profile.addFolder('Clip Task');
        this.clipTask.add(this.clippingSettings.profile.task.inside, 'enabled')
            .listen().onChange(() => this.profileClipTaskChange('inside')).name('Inside');
        this.clipTask.add(this.clippingSettings.profile.task.outside, 'enabled')
            .listen().onChange(() => this.profileClipTaskChange('outside')).name('Outside');
        this.clipTask.add(this.clippingSettings.profile.task.none, 'enabled')
            .listen().onChange(() => this.profileClipTaskChange('none')).name('None');
    }

    createLineClipper(points, lineColor) {
        this.clipPlanes = [];
        // this.clearMarkerLine();
        const material = new THREE.LineBasicMaterial({ 
            color: lineColor,
            // clippingPlanes: this.clipPlanes,
            // clipIntersection: false,
        });
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const line = new THREE.Line( geometry, material );

        if (points.length === 2) { 
            points.forEach((point, index, arr) => {            
                if (index < arr.length - 1) {    
                    this.linePlane = new THREE.Plane().setFromCoplanarPoints(
                        points[index], 
                        points[index + 1], 
                        points[index].clone().setZ(points[0].z + 1)
                    );  
                    this.clipPlanes = [
                        ...this.clipPlanes,
                        this.linePlane.clone().set(this.linePlane.normal, this.linePlane.constant + this.clippingSettings.profile.width),                     
                        this.linePlane.clone().set(this.linePlane.normal, this.linePlane.constant - this.clippingSettings.profile.width),
                    ];
                    if (this.clippingSettings.profile.task.inside.enabled) {
                        this.clipPlanes[1].negate();
                    }
                    else { 
                        this.clipPlanes[0].negate();
                        this.scene.children.filter(el => el.isPoints).forEach(points => {
                            points.material.clipIntersection = true;
                            points.material.clippingPlanes = this.clipPlanes;
                        })
                    }
                }
            })     
            
            this.helpers = new THREE.Group();
            this.helpers.name = 'clipper-planes-helper'
            this.clipPlanes.forEach(el => {
                this.helpers.add( new THREE.PlaneHelper( el, 2, 0xff0000 ) );
            })
            this.helpers.visible = this.clippingSettings.profile.showHelpers;
            this.scene.add( this.helpers );   
            
            this.scene.children.filter(el => el.isPoints).forEach(points => {
                points.material.clippingPlanes = this.clipPlanes;
            })
            if(this.clipPlanes?.length) {
                if (this.controlsProfile) {
                    this.controlsProfile.target.copy(this.linePlane.normal);
                    this.controlsProfile.update();
                }
            }
        }

        line.name = 'clipper-line';

        return line;
    }

    pickClipMarker(sphereColor, lineColor, mouse, camera) {
        let intersections = Utils.getIntersectedObjectsFromEmitedRay(this.raycaster, this.scene, mouse, camera);

        //TODO: lear how to combine more than two clipping planes
        if (intersections.length ) {
            let intersectedPoint = intersections[0].object.geometry.attributes.position;
            let intersetedPointIndex = intersections[0].index;
            this.pickedPointsClip.push(new THREE.Vector3().fromBufferAttribute(intersectedPoint, intersetedPointIndex));
            this.scene.add(Utils.createSphere(this.pickedPointsClip.at(-1), sphereColor, 'clip-marker'));
            this.scene.add(this.createLineClipper(this.pickedPointsClip, lineColor));
        }
        console.log(this.scene.children);
    }

    clipProfileWidthChange() {
        // this.clipPlanes.map(plane => {
        //     plane.constant = this.linePlane.constant
        // })
        if (!this.linePlane)
            return;

        this.clipPlanes = [
            this.linePlane.clone()
                .set(this.linePlane.normal, this.linePlane.constant + this.clippingSettings.profile.width),                     
            this.linePlane.clone()
                .set(this.linePlane.normal, this.linePlane.constant - this.clippingSettings.profile.width),
        ];

        if (this.clippingSettings.profile.task.inside.enabled)
            this.clipPlanes[1].negate();
        else 
            this.clipPlanes[0].negate();

        this.scene.children.filter(el => el.isPoints).forEach(points => {
            points.material.clippingPlanes = this.clipPlanes;
        })

        this.helpers.children = [];
        this.clipPlanes.forEach(el => {
            this.helpers.add( new THREE.PlaneHelper( el, 2, 0xff0000 ) );
        });
        this.pickedPointsClip = [];
    }

    profileClipTaskChange(prop) {
        for (let param in this.clippingSettings.profile.task) {
            this.clippingSettings.profile.task[param].enabled = false;
        }
        this.clippingSettings.profile.task[prop].enabled = true;

        this.clippingSettings.profile.task[prop].set(this.clippingSettings.profile?.previousTask === prop);
        if (prop !== 'none')
            this.clippingSettings.profile.previousTask = prop;
    }

    setInsideTask(wasPrevious) {
        if (this.clippingSettings.profile.enabledMainWindowClipping)
            this.renderer.localClippingEnabled = true;

        if (this.rendererProfile)
            this.rendererProfile.localClippingEnabled = true;

        if (!this.clipPlanes || wasPrevious)
            return;
        this.clipPlanes.forEach(plane => plane.negate());
        this.scene.children.filter(el => el.isPoints).forEach(points => {
            points.material.clipIntersection = false;
            points.material.clippingPlanes = this.clipPlanes;
        })
    }

    setOutsideTask(wasPrevious) {
        if (this.clippingSettings.profile.enabledMainWindowClipping)
            this.renderer.localClippingEnabled = true;

        if (this.rendererProfile)
            this.rendererProfile.localClippingEnabled = true;

        if (!this.clipPlanes || wasPrevious)
            return;
        this.clipPlanes.forEach(plane => plane.negate());
        this.scene.children.filter(el => el.isPoints).forEach(points => {
            points.material.clipIntersection = true;
            points.material.clippingPlanes = this.clipPlanes;
        })
    }

    setNoneTask(wasPrevious) {
        if (this.clippingSettings.profile.enabledMainWindowClipping)
            this.renderer.localClippingEnabled = false;

        if (this.rendererProfile)
            this.rendererProfile.localClippingEnabled = false;
    }

    clearProfile() {
        let selectedObjects = Utils.selectObjectsByNames(this.scene, 'clipper-line', 'clip-marker', 'clipper-planes-helper');
        selectedObjects.forEach(el => (el.clear(), this.scene.remove(el)));
        this.scene.children.filter(el => el.isPoints).forEach(points => {
            points.material.clippingPlanes = [];
        })

        this.pickedPointsClip = [];
        delete this.linePlane;
    }

    generateNew2DWindow() {

        this.profileSize = {
            width: this.sizes.width / 5 * 4,
            height: this.sizes.height / 3,
        }
        let div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.height = `${this.profileSize.height}px`;
        div.style.width = `${this.profileSize.width}px`;
        div.style.top = `${this.sizes.height - this.profileSize.height - 50}px`;

        div.innerHTML = `
            <div id="header" style="border-radius: 10px 10px 0 0;height: 30px;background: rgb(60, 80, 85);display: flex;justify-content: space-between;align-items: center;">
                <span style="margin-left:10px;cursor:default;color: #ddd;text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;font-weight:bold;">Profile</span>
                <span id="closeProfile" style="margin-right:10px;cursor:pointer;">❌</span>
            </div>
        `;

        
        let canvas = document.createElement('canvas');
        canvas.id = '2dprofile';

        div.append(canvas);

        document.body.append(div);
        this.dragElement(div);

        this.sceneProfile = new THREE.Scene();

        // this.initSizes();

        // Init camera
        let frustumSize = this.range * 2;
        let aspect = 1;//this.profileSize.width / this.profileSize.height;
        this.cameraProfile = new THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -frustumSize, frustumSize);
        // this.cameraProfile.position.set(1, 0, 0);
        this.cameraProfile.up.set(0, 0, 1);
        // Init renderer
        this.rendererProfile = new THREE.WebGLRenderer({
            canvas: canvas,
            // antialias: true,
        });
        this.rendererProfile.localClippingEnabled = true;
        this.rendererProfile.setClearColor(0x000000, 0.0);
        this.rendererProfile.setSize(this.profileSize.width, this.profileSize.height);
        this.rendererProfile.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        for (let [type, obj] of Object.entries(this.objects)) {
            if (obj.points)
                this.sceneProfile.add(obj.points.clone());
        }

        this.controlsProfile = new OrbitControls(this.cameraProfile, this.rendererProfile.domElement);
        this.controlsProfile.target.set(1, 0, 0);
        this.controlsProfile.update();

        this.rendererProfile.render(this.sceneProfile, this.cameraProfile);
        
        if(this.clipPlanes?.length) {
            if (this.controlsProfile) {
                this.controlsProfile.target.copy(this.linePlane.normal);
                this.controlsProfile.update();
            }
        }
    }

    dragElement(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (elmnt.querySelector("#header")) {
            /* if present, the header is where you move the DIV from:*/
            elmnt.querySelector("#header").onmousedown = dragMouseDown;
        } else {
            /* otherwise, move the DIV from anywhere inside the DIV:*/
            elmnt.onmousedown = dragMouseDown;
        }

        if (elmnt.querySelector('#closeProfile')) {
            elmnt.querySelector('#closeProfile').onclick = closeDiv.bind(this);
        }

        function closeDiv(e) {
            elmnt.remove();
            this.sceneProfile = null;
            this.cameraProfile = null;
            this.rendererProfile = null;
            this.controlsProfile = null;
        }
      
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }
      
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }
      
        function closeDragElement() {
            /* stop moving when mouse button is released:*/
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    tick() {
        this.rendererProfile.render(this.sceneProfile, this.cameraProfile);
    }
}
