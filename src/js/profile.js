import * as THREE from 'three';
import { Utils } from './utils';

export class Profile {

    constructor(scene, renderer, raycaster, gui) {
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
        this.initGUI();
    }

    initGUI() {
        this.clipping = this.gui.addFolder('Clipping');
        this.profile = this.clipping.addFolder('Profile');
        this.profile.add(this.clippingSettings.profile, 'enabled').name("Enable");
        this.profile.add(this.clippingSettings.profile, 'width', 0, 20/*TODO: Figure out how to compute max width for a scene */, 0.005).onChange(this.clipProfileWidthChange.bind(this)).name("Width");
        this.profile.add(this.clippingSettings.profile, 'showHelpers').onChange(function(showHelpers){
            if(this.helpers) this.helpers.visible = showHelpers;
        }.bind(this));
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
                        points[index].clone().setY(points[0].y + 1)
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
        this.renderer.localClippingEnabled = true;

        if (!this.clipPlanes || wasPrevious)
            return;
        this.clipPlanes.forEach(plane => plane.negate());
        this.scene.children.filter(el => el.isPoints).forEach(points => {
            points.material.clipIntersection = false;
            points.material.clippingPlanes = this.clipPlanes;
        })
    }

    setOutsideTask(wasPrevious) {
        this.renderer.localClippingEnabled = true;

        if (!this.clipPlanes || wasPrevious)
            return;
        this.clipPlanes.forEach(plane => plane.negate());
        this.scene.children.filter(el => el.isPoints).forEach(points => {
            points.material.clipIntersection = true;
            points.material.clippingPlanes = this.clipPlanes;
        })
    }

    setNoneTask(wasPrevious) {
        this.renderer.localClippingEnabled = false;
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
}