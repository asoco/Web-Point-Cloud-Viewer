// ORIGINAL
import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'stats.js/build/stats.min.js';
import * as dat from 'dat.gui'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Profile } from './js/profile.js';
import { rawtext, Utils } from './js/utils.js';
import { Navigation } from './js/navigation.js';
import { CustomShaderMaterial, TYPES } from './js/customShader';
import { vShader } from './shader/vertex';
import { fShader } from './shader/fragment';
import { Gradients, getGradient, getGradientNames } from './js/gradient'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry'
import {cancellableLoad, getBinaryLocal} from './js/loadLasFile'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SobelOperatorShader } from './js/sobel/SobelOperatorShader';

class App {
    constructor() {
        this.settings={
            resetSceneOnLoad:true,
            saveSettings: {
                value: true,
                clear: function() {
                    localStorage.clear();
                },
            },
        }
        this.data = [];
        this.scene = {};
        this.objects = {};
        this.pickedPoints = [[]];
        this.pickedPointsClip = [];
        this.pickedPointsInfo = [];
        this.initInfo();
        this.gradient = {
            enableGradient: false,
        };
        this.gradientNames = getGradientNames();
        [this.gradientColors, this.gradientBounds] = getGradient(Gradients.RAINBOW);
        let localAppearence = JSON.parse(localStorage.getItem('appearence'));
        if (localAppearence)
            this.appearence = localAppearence;
        else 
            this.appearence = {
                pointType: {
                    circle: true,
                },
                edgeDetection: {
                    value: false,
                },
                activeCamera: {
                    type: "perspective",
                },
                useSizeAttenuation: {
                    value: true,
                },                
            }
        this.init();

    }
    init() {
        this.initSettings();
        this.initFileReader();
        this.initDragAndDrop();
        this.initTHREE();
        this.parseData(rawtext);
        // this.calcCenter();
        this.initRayCast();
        this.renderData();
        this.initGUI();
        this.initProfile();
        this.initHoverPoint();
        this.initNavigation();
    }

    initProfile() {
        let range = Math.abs(this.maxY - this.minY);
        this.profileClipper = new Profile(this.scene, this.renderer, this.raycaster, this.gui, this.objects, range, this.sizes);
    }

    initHoverPoint() {
        this.pointHover = Utils.createSphere(new THREE.Vector3(), this.measurementSettings.markerColor, 'marker-hover');
        this.pointHover.visible = false;
        this.scene.add(this.pointHover);
    }

    initNavigation() {
        let range = Math.abs(this.maxY - this.minY);
        this.nav = new Navigation(this.activeCamera, this.controls, 2 * range, this.gui);
        this.nav.initGUI();
    }

    initSettings() {
        this.objects = {
            unclassified: { level: "0", color: 0x22223b, colorhex: "#22223b", size: 0.15, title: "Unclassified" },
                 default: { level: "1", color: 0x4a4e69, colorhex: "#4a4e69", size: 0.15, title: "Default" },
                  ground: { level: "2", color: 0xe07a5f, colorhex: "#e07a5f", size: 0.30, title: "Ground" },
                lowgreen: { level: "3", color: 0x2d6a4f, colorhex: "#2d6a4f", size: 0.15, title: "Low green" },
                midgreen: { level: "4", color: 0x74c69d, colorhex: "#74c69d", size: 0.15, title: "Mid green" },
               highgreen: { level: "5", color: 0x95d5b2, colorhex: "#95d5b2", size: 0.15, title: "High green" },
                   roofs: { level: "6", color: 0xe2062c, colorhex: "#e2062c", size: 0.70, title: "Roofs" },
                    fake: { level: "7", color: 0x7209b7, colorhex: "#7209b7", size: 0.15, title: "False points" },
                serviceA: { level: "8", color: 0xf2e9e4, colorhex: "#f2e9e4", size: 0.15, title: "Service A points" },
                   water: { level: "9", color: 0xd4f1f9, colorhex: "#d4f1f9", size: 0.15, title: "Water" },
                    rail: { level: "10", color: 0xcf4a37, colorhex: "#cf4a37", size: 0.15, title: "Rail" },
             roadSurface: { level: "11", color: 0xb7b1ae, colorhex: "#b7b1ae", size: 0.15, title: "Road Surface" },
                serviceB: { level: "12", color: 0xf2e9e4, colorhex: "#f2e9e4", size: 0.15, title: "Service B points" },
               wireGuard: { level: "13", color: 0x88171a, colorhex: "#88171a", size: 0.15, title: "Wire – Guard (Shield)" },
           wireConductor: { level: "14", color: 0x88171a, colorhex: "#88171a", size: 0.15, title: "Wire – Conductor (Phase)" },
       transmissionTower: { level: "15", color: 0x544c50, colorhex: "#544c50", size: 0.15, title: "Transmission Tower" },
       wireStructureConn: { level: "16", color: 0xd4f1f9, colorhex: "#d4f1f9", size: 0.15, title: "Wire-Structure Connector" },
              bridgeDeck: { level: "17", color: 0xd4f1f9, colorhex: "#d4f1f9", size: 0.15, title: "Bridge Deck" },
               highNoise: { level: "18", color: 0xd4f1f9, colorhex: "#d4f1f9", size: 0.15, title: "High Noise" },
           overheadStruc: { level: "19", color: 0xd4f1f9, colorhex: "#d4f1f9", size: 0.15, title: "Overhead Structure" },
           ignoredGround: { level: "20", color: 0xd4f1f9, colorhex: "#d4f1f9", size: 0.15, title: "Ignored Ground" },
                    snow: { level: "21", color: 0xffffff, colorhex: "#ffffff", size: 0.15, title: "Snow" },
           tempExclusion: { level: "22", color: 0xd4f1f9, colorhex: "#d4f1f9", size: 0.15, title: "Temporal Exclusion" },
        };

        for (let [type, obj] of Object.entries(this.objects)) {
            let storage = JSON.parse(localStorage.getItem(obj.title));
            if (!storage)
                continue;
            if (storage.size !== undefined)
                obj.size = Number(storage.size);
            if (storage.color !== undefined) {
                obj.color = Number(storage.color);
                obj.colorhex = `#${obj.color.toString(16).padStart(6, 0)}`;
            }
            if (storage.visible !== undefined) {
                obj.visible = storage.visible;
            }
        }

        this.AxesHelperSettings = {
            canvas: {
                width: 100,
                height: 100,
            }
        };
        
    }
    initTHREE() {
        const canvas = document.querySelector("canvas.webgl");
        // Init scene
        this.scene = new THREE.Scene();
        this.axesScene = new THREE.Scene();

        this.initSizes();

        // Init camera
        this.aspect = this.sizes.width / this.sizes.height;

        this.camera = new THREE.PerspectiveCamera(75, this.aspect, 0.1, 10000);
        this.camera.position.set(20, 20, 0);
        this.camera.up.set(0,0,1);

        this.frustumSize = 75 * 0.5;
        this.cameraOrtho = new THREE.OrthographicCamera(this.frustumSize * this.aspect / - 2, this.frustumSize * this.aspect / 2, this.frustumSize / 2, this.frustumSize / - 2, -10000, 10000);
        this.cameraOrtho.position.set(20, 20, 0);
        this.cameraOrtho.up.set(0,0,1);

        if (this.appearence.activeCamera.type === "perspective") 
            this.activeCamera = this.camera;
        else
            this.activeCamera = this.cameraOrtho;

        this.axesCamera = new THREE.PerspectiveCamera(75, this.AxesHelperSettings.canvas.width / this.AxesHelperSettings.canvas.height, 0.1, 10000);
        this.axesCamera.up = this.activeCamera.up;
        
        this.cameraPostion = new THREE.Vector3();
        this.cameraDirection = new THREE.Vector3();
        
        // Init lights
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.x = 0;
        pointLight.position.y = 0;
        pointLight.position.z = 0;

        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(this.sizes.width, this.sizes.height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        document.body.appendChild(this.labelRenderer.domElement);

        // Init controls
        this.controls = new OrbitControls(this.activeCamera, this.labelRenderer.domElement);
        this.controls.enableDamping = true;
        this.controls.listenToKeyEvents(window);
        let thus = this;

        this.controls.addEventListener('change', ()=>{
            let cache = thus.activeCamera.getWorldPosition(thus.cameraPostion);
            thus.info.cameraX.innerText = cache.x.toFixed(3);
            thus.info.cameraY.innerText = cache.y.toFixed(3);
            thus.info.cameraZ.innerText = cache.z.toFixed(3);
        } );


        // Init stats
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);
        this.stats.begin();
        // Add things to scene
        this.scene.add(this.activeCamera);
        // this.scene.add(new THREE.AxesHelper(20));
        this.axesScene.add(new THREE.AxesHelper());
        this.scene.add(pointLight);
        
        // Init renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            powerPreference: "high-performance", 
        });
        this.renderer.setClearColor(0x000000, 0.0);
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.axesRenderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        this.axesRenderer.setClearColor(0x000000, 0.0);
        this.axesRenderer.setSize(this.AxesHelperSettings.canvas.width, this.AxesHelperSettings.canvas.height);
        let axesContainer = document.getElementById('axesContainer');
        axesContainer.appendChild( this.axesRenderer.domElement );
        
        this.renderer.render(this.scene, this.activeCamera)

        this.composer = new EffectComposer( this.renderer );
        this.renderPass = new RenderPass( this.scene, this.activeCamera );
        this.composer.addPass( this.renderPass );

        this.effectSobel = new ShaderPass( SobelOperatorShader );
        this.effectSobel.uniforms[ 'resolution' ].value.x = window.innerWidth * window.devicePixelRatio;
        this.effectSobel.uniforms[ 'resolution' ].value.y = window.innerHeight * window.devicePixelRatio;
        this.composer.addPass( this.effectSobel );

        this.tick();
        
    }
    initGUI() {
        if (this.gui) this.gui.destroy();
        this.gui = new dat.GUI();

        this.appearenceFolder = this.gui.addFolder("Appearence");
        this.appearenceFolder.add(this.appearence.pointType, 'circle').onChange(function (enabled) {
            for (let [type, obj] of Object.entries(this.objects)) {
                if (!obj.points || !obj.material) continue;
                obj.material.uniforms.circle.value = enabled;
            }
        }.bind(this))
        this.appearenceFolder.add(this.appearence.edgeDetection, 'value').name('Edge detection');
        this.appearenceFolder.add(this.appearence.activeCamera, 'type', ['perspective', 'ortho']).name("Camera").onChange(function(event) {
            if (event === "perspective") {
                this.activeCamera = this.camera;
                this.activeCamera.position.copy(this.cameraOrtho.position);
            } else {
                this.activeCamera = this.cameraOrtho;
                this.activeCamera.position.copy(this.camera.position);
            }
            this.controls.object = this.activeCamera;
            this.nav.destroyGUI();
            this.initNavigation();
            this.renderPass.camera = this.activeCamera;
        }.bind(this))
        this.appearenceFolder.add(this.appearence.useSizeAttenuation, "value")
            .name("Size Attenuation")
            .onChange(function (event) {
            console.log(event);
            for (let [type, obj] of Object.entries(this.objects)) {
                if (!obj.points || !obj.material) continue;
                obj.material.sizeAttenuation = event;
                obj.material.needsUpdate = true;
            }
        }.bind(this));

        this.toggleFolder = this.gui.addFolder("Visibility");
        this.sizeFolder = this.gui.addFolder("Size");
        this.colorFolder = this.gui.addFolder("Color scheme");
        if (!this.colorConfig)
            this.colorConfig = { option: "classification", value: 1};
        this.colorFolder.add(this.colorConfig, 'option', ['classification', 'rgb']).onChange(function(event) {        
            this.colorConfig.value = event === 'classification' ? 1 : 2;
            for (let [type, obj] of Object.entries(this.objects)) {
                if (!obj.points || !obj.material) continue;
                if (event === 'rgb')
                    obj.material.uniforms.type.value = 2
                else
                    obj.material.uniforms.type.value = 1
            }
        }.bind(this));
        this.loaddataconf = {
            add: function () {
                document.getElementById("file-input").click();
            },
            preserveSettings: false,
        };
        this.loadFolder = this.gui.addFolder("Load data");
        this.loadbtn = this.loadFolder.add(this.loaddataconf, "add").name("Load data");
        this.preserveSettings = this.loadFolder.add(this.loaddataconf, "preserveSettings").name("Preserve Settings");
        
        this.settingFolder = this.gui.addFolder("Settings");
        this.settingSave = this.settingFolder.add(this.settings.saveSettings, "value").name("Save Settings On Exit");
        this.settingClear = this.settingFolder.add(this.settings.saveSettings, "clear").name("Clear");
        // this.gui.add(this.settings, "resetSceneOnLoad", true).name("Reset on load");
        this.measurementSettings = {
            ruler: {
                enable: false,
                clear: this.clearMeasurements.bind(this),
            },
            info: {
                enable: false,
                clear: this.clearMarkerInfo.bind(this),
            },
            markerColor: '#ffff00',
            lineColor: '#0000ff',
        }
        this.measurement = this.gui.addFolder('Measurements');   

        this.ruler = this.measurement.addFolder('Ruler');
        this.ruler.add(this.measurementSettings.ruler, "enable", false).name("Enable"); 
        this.ruler.add(this.measurementSettings.ruler, 'clear').name("Clear");
        
        this.infoMarker = this.measurement.addFolder('Info');
        this.infoMarker.add(this.measurementSettings.info, "enable", false).name("Enable"); 
        this.infoMarker.add(this.measurementSettings.info, 'clear').name("Clear");
        
        this.measurement.addColor(this.measurementSettings, 'markerColor').name('Marker Color').onChange(this.#markerColorChange.bind(this));
        this.measurement.addColor(this.measurementSettings, 'lineColor').name('Line Color').onChange(this.#lineColorChange.bind(this));

        this.loaddGUI();
    }

    #markerColorChange() {    
        let selectedObjects = this.selectObjectsByNames('marker', 'marker-info', 'marker-hover');
        selectedObjects.map(el => el.material.color.set(this.measurementSettings.markerColor));
    }

    #lineColorChange() {    
        let selectedObjects = this.selectObjectsByNames('marker-line');
        selectedObjects.map(el => el.material.color.set(this.measurementSettings.lineColor));
    }

    clearMeasurements() {
        let selectedObjects = this.selectObjectsByNames('marker', 'marker-line');
        selectedObjects.forEach(el => this.scene.remove(el));
        document.querySelectorAll('.label.measurement').forEach(label => label.remove());
        this.pickedPoints = [[]];
    }

    clearMarkerLine() {
        let selectedObjects = this.selectObjectsByNames('marker-line');
        selectedObjects.forEach(el => (el.clear(), this.scene.remove(el)));
    }

    clearMarkerInfo() {    
        let selectedObjects = this.selectObjectsByNames('marker-info');
        selectedObjects.forEach(el => this.scene.remove(el));
        document.querySelectorAll('.label.info').forEach(label => label.remove());
        this.pickedPointsInfo = [];
    }

    selectObjectsByNames(...names) {
        let selectedObjects = [];
        this.scene.traverse(el => {if (names.includes(el.name)) selectedObjects.push(el)})
        return selectedObjects;
    }

    loaddGUI() {
        for (let [type, obj] of Object.entries(this.objects)) {
            if (!obj.points || !obj.material) continue;
            this.toggleFolder.add(obj.points, "visible", true).name(obj.title);
            this.sizeFolder.add(obj.points.material, "size", 0, 10, 0.005).name(obj.title + " size")
                .onChange(el => console.log(el));
            let conf = { color: obj.colorhex };
            this.colorFolder.addColor(conf, "color").name(obj.title).onChange(function (colorValue) {
                obj.material.uniforms.colorBase.value.set(colorValue);
            });
        }
        this.gradientFolder = this.colorFolder.addFolder('Gradient');
        this.gradientFolder.add(this.gradient, 'enableGradient')
            .name("Enable")
            .listen()
            .onChange(function (enabled) {
                for (let [type, obj] of Object.entries(this.objects)) {
                    if (!obj.points || !obj.material) continue;
                    obj.material.uniforms.enableGradient.value = enabled;
                }
            }.bind(this));
        this.gradientNames.forEach(function (el) {
            let conf = {color: this.setGradient.bind(this, el)};
            this.gradientFolder.add(conf, 'color').name(el)
                .domElement.parentElement.parentElement.classList.add(el);
        }.bind(this))
    }

    setGradient(color) {
        for (let [type, obj] of Object.entries(this.objects)) {
            if (!obj.points || !obj.material) continue;
            [this.gradientColors, this.gradientBounds] = getGradient(Gradients[color]);
            if (obj.material.uniforms?.colorsGradient) {
                obj.material.uniforms.len.value = this.gradientBounds.length;
                obj.material.uniforms.colorsGradient.value = this.gradientColors;
                obj.material.uniforms.bounds.value = this.gradientBounds;
            }
        }
    }

    gradientColorChange(prop, colorValue) {
        for (let [type, obj] of Object.entries(this.objects)) {
            if (!obj.points || !obj.material) continue;
            obj.material.uniforms[prop].value.set(colorValue);
        }
    }

    tick() {        
        // Update Orbital Controls
        this.controls.update();

        if (this?.profileClipper?.controlsProfile){
            this.profileClipper.tick();
        }
        
        // this.initRayCast();
        // Render
        if (this.appearence?.edgeDetection.value)
            this.composer.render();
        else
            this.renderer.render(this.scene, this.activeCamera);
        this.labelRenderer.render(this.scene, this.activeCamera);
        this.axesRenderer.render(this.axesScene, this.axesCamera);
        this.stats.update();
        this.axesCamera.position.copy( this.activeCamera.position );
        this.axesCamera.position.sub( this.controls.target ); // added by @libe
        this.axesCamera.position.setLength( 1 );
    
        this.axesCamera.lookAt( this.axesScene.position );
        // Call tick again on the next frame
        let rAF = this.tick.bind(this)
        window.requestAnimationFrame(rAF);
    }
    initSizes() {
        this.sizes = {
            width: window.innerWidth,
            height: window.innerHeight,
        };
        window.addEventListener("resize", () => {
            // Update sizes
            this.sizes.width = window.innerWidth;
            this.sizes.height = window.innerHeight;

            // Update camera
            this.activeCamera.aspect = this.sizes.width / this.sizes.height;
            this.aspect = this.sizes.width / this.sizes.height;
            this.cameraOrtho.left = this.frustumSize * this.aspect / - 2;
            this.cameraOrtho.right = this.frustumSize * this.aspect / 2;
            this.cameraOrtho.top = this.frustumSize / 2;
            this.cameraOrtho.bottom = this.frustumSize / - 2;
            this.cameraOrtho.updateMatrix();
            this.activeCamera.updateProjectionMatrix();            
            // Update renderer
            this.renderer.setSize(this.sizes.width, this.sizes.height);
            this.labelRenderer.setSize(this.sizes.width, this.sizes.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            this.composer.setSize( window.innerWidth, window.innerHeight );
            
            // this.rtEDL.setSize( window.innerWidth, window.innerHeight );

            this.effectSobel.uniforms[ 'resolution' ].value.x = window.innerWidth * window.devicePixelRatio;
            this.effectSobel.uniforms[ 'resolution' ].value.y = window.innerHeight * window.devicePixelRatio;
            // this.edlShader.uniforms['screenWidth'].value = window.innerWidth;
            // this.edlShader.uniforms['screenHeight'].value = window.innerHeight;
        });
    }

    #onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (event.ctrlKey && this.measurementSettings?.ruler?.enable)
            this.#pickPoint(event.shiftKey);

        if (event.ctrlKey && this.measurementSettings?.info?.enable)
            this.#pickInfoMarker();

        if(event.ctrlKey && this.profileClipper.clippingSettings.profile.enabled)
            this.profileClipper.pickClipMarker(this.measurementSettings.markerColor, this.measurementSettings.lineColor, this.mouse, this.activeCamera);
    }

    #onMouseHover(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (event.ctrlKey)
            this.#highlightPoint();
        else
            this.#clearHovered();
    }

    #clearHovered() {
        this.pointHover.visible = false;
    }

    #createSphere(position, name = 'marker') {
        const geometry = new THREE.SphereGeometry(0.1);
        const material = new THREE.MeshBasicMaterial({
            color: this.measurementSettings.markerColor,
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        sphere.name = name;
        return sphere;
    }

    #createLine(points) {
        const material = new LineMaterial({ 
            color: this.measurementSettings.lineColor,
            alphaToCoverage: true,
            linewidth: 3,
        });
        const geometry = new LineGeometry();
        let positions = [];
        points.forEach(point => positions.push(point.x, point.y, point.z));
        geometry.setPositions(positions);
        material.resolution.set(this.sizes.width, this.sizes.height );

        const line = new Line2( geometry, material );
        line.computeLineDistances();
        line.scale.set( 1, 1, 1 );

        if (points.length >= 2) { 
            points.forEach((point, index, arr) => {
                if (index < arr.length - 1) {        
                const lineMeasurementDiv = document.createElement('div');
                lineMeasurementDiv.className = 'label measurement';
                lineMeasurementDiv.textContent = `${points[index].distanceTo(points[index + 1]).toFixed(2)} m`;
                lineMeasurementDiv.style.marginTop = '-1em';
                const lineMeasurementLabel = new CSS2DObject(lineMeasurementDiv);
                lineMeasurementLabel.position.copy(this.getLineCenter(points[index], points[index + 1]));
                line.add(lineMeasurementLabel);
                lineMeasurementLabel.layers.set(0);
                }
            })        
        }

        line.name = 'marker-line';

        return line;
    }

    getLineCenter(start, end) {
        return new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    }

    #getIntersectedObjectsFromEmitedRay() {
        this.raycaster.setFromCamera(this.mouse, this.activeCamera);
        
        let intersections = []
        this.scene.children.filter(el => el.isPoints).forEach(points => {
            const intersects = this.raycaster.intersectObject(points, true);

            if (intersects.length) {
                intersections.push(intersects[0]);
            }    
        });
        intersections.sort((a, b) => a.distanceToRay - b.distanceToRay);

        return intersections;
    }

    #pickInfoMarker() {
        let intersections = this.#getIntersectedObjectsFromEmitedRay();

        if (intersections.length) {
            let intersecyedPoint = intersections[0].object.geometry.attributes.position;
            let intersetedPointIndex = intersections[0].index;
            this.pickedPointsInfo.push(new THREE.Vector3().fromBufferAttribute(intersecyedPoint, intersetedPointIndex));
            this.scene.add(this.#createMarkerInfo(this.pickedPointsInfo.at(-1),  intersections[0].object.name));
        }
    }

    #createMarkerInfo(point, type) {
        let markerInfo = this.#createSphere(point);
        markerInfo.name = 'marker-info';
        const markerInfoDiv = document.createElement('div');
        markerInfoDiv.className = 'label info';
        let realPoint = new THREE.Vector3().addVectors(point, this.centerPoint);
        console.log(realPoint);
        markerInfoDiv.innerHTML = `(${realPoint.x.toFixed(3)}, ${realPoint.y.toFixed(3)}, ${realPoint.z.toFixed(3)})</br>${type}`;
        markerInfoDiv.style.marginTop = '-1em';
        const markerInfoLabel = new CSS2DObject(markerInfoDiv);
        markerInfoLabel.position.set(0, 0.1, 0);
        markerInfo.add(markerInfoLabel);
        markerInfoLabel.layers.set( 0 );
        return markerInfo;
    }

    #highlightPoint() {
        let intersections = this.#getIntersectedObjectsFromEmitedRay();

        if (intersections.length) {
            let intersectedPoint = intersections[0].object.geometry.attributes.position;
            let intersetedPointIndex = intersections[0].index;
            this.pointHover.position.copy(new THREE.Vector3().fromBufferAttribute(intersectedPoint, intersetedPointIndex));
            this.pointHover.visible = true;
        } else {
            this.pointHover.visible = false;
        }
    }

    #pickPoint(newLine) {
        let intersections = this.#getIntersectedObjectsFromEmitedRay();

        if (intersections.length) {
            let intersectedPoint = intersections[0].object.geometry.attributes.position;
            let intersetedPointIndex = intersections[0].index;
            if (newLine)
                this.pickedPoints.push([]);
            this.pickedPoints[this.pickedPoints.length - 1].push(new THREE.Vector3().fromBufferAttribute(intersectedPoint, intersetedPointIndex));
            this.scene.add(this.#createSphere(this.pickedPoints[this.pickedPoints.length - 1].at(-1)));
            this.clearMarkerLine();
            this.pickedPoints.forEach(picked => {
                this.scene.add(this.#createLine(picked));
            })
        }
        console.log(this.scene.children);
    }

    initRayCast() {
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 0.1;
        this.mouse = new THREE.Vector2();
        window.addEventListener('click', this.#onMouseClick.bind(this), false);
        window.addEventListener('mousemove', this.#onMouseHover.bind(this), false);
    }

    initInfo(){
        let filename = document.getElementById("filename")
        let cameraX = document.getElementById("cameraX")
        let cameraY = document.getElementById("cameraY")
        let cameraZ = document.getElementById("cameraZ")

        this.info = {
            filename:filename,
            cameraX:cameraX,
            cameraY:cameraY,
            cameraZ:cameraZ,
        }
    }
    initFileReader() {
        if (window.FileList && window.File && window.FileReader) {
            let thus = this;
            document.getElementById("file-input").addEventListener("change", (event) => {
                const file = event.target.files[0];
                thus.info.filename.innerText = event.target.files[0].name;
                const reader = new FileReader();
                reader.addEventListener("load", (event) => {
                    let response = event.target.result;
                    if (thus.settings.resetSceneOnLoad) this.resetScene();
                    this.parseData(response);
                    this.renderData();
                    this.initGUI();
                    this.initProfile();
                    this.initNavigation();
                });
                let ext = file.name.split('.').pop();
                if (ext === 'laz' ||ext === 'las')
                    cancellableLoad(getBinaryLocal, [file], file.name);
                else
                    reader.readAsText(file);
            });
        }
    }
    initDragAndDrop() {
                var lastTarget = null;
                let thus = this;
                function isFile(evt) {
                    var dt = evt.dataTransfer;
                
                    for (var i = 0; i < dt.types.length; i++) {
                        if (dt.types[i] === "Files") {
                            return true;
                        }
                    }
                    return false;
                }
                
                window.addEventListener("dragenter", function (e) {
                    if (isFile(e)) {
                        lastTarget = e.target;
                        document.querySelector("#dropzone").style.visibility = "";
                        document.querySelector("#dropzone").style.opacity = 1;
                        document.querySelector("#textnode").style.fontSize = "48px";
                    }
                });
                
                window.addEventListener("dragleave", function (e) {
                    e.preventDefault();
                    if (e.target === document || e.target === lastTarget) {
                        document.querySelector("#dropzone").style.visibility = "hidden";
                        document.querySelector("#dropzone").style.opacity = 0;
                        document.querySelector("#textnode").style.fontSize = "42px";
                    }
                });
                
                window.addEventListener("dragover", function (e) {
                    e.preventDefault();
                });
                window.addEventListener("drop", function (e) {
                    e.preventDefault();
                    document.querySelector("#dropzone").style.visibility = "hidden";
                    document.querySelector("#dropzone").style.opacity = 0;
                    document.querySelector("#textnode").style.fontSize = "42px";
                    if(e.dataTransfer.files.length == 1)
                    {
                    thus.info.filename.innerText = e.dataTransfer.files[0].name;
                      console.log("File selected:" ,);
                      const reader = new FileReader();
                      reader.addEventListener("load", (event) => {
                          let response = event.target.result;
                          thus.parseData(response);
                          if (thus.settings.resetSceneOnLoad) thus.resetScene();
                          thus.renderData();
                          thus.initGUI();
                          thus.initProfile();                      
                          thus.initNavigation();
                      });
                      let ext = e.dataTransfer.files[0].name.split('.').pop();
                      if (ext === 'laz' || ext === 'las')
                          cancellableLoad(getBinaryLocal, [e.dataTransfer.files[0]], e.dataTransfer.files[0].name);
                      else
                          reader.readAsText(e.dataTransfer.files[0]);
                    }
                });  
            
    }
    renderData() {
        for (let [type, obj] of Object.entries(this.objects)) {
            const raw = this.data.filter((item) => {
                return item[0] === obj.level;
            });
            if (raw.length === 0) {
                obj.points = undefined;
                continue;
            }

            const dataBuffer = [];
            const color = [];
            let type;
            if (raw[0].length === 4) {
                type = 1;
            } else if (raw[0].length === 7) {
                type = 2;
            } else if (raw[0].length === 8) {
                type = 3;
            }

            for (let i = 1; i < raw.length; i++) {
                if (type === 1)
                    dataBuffer.push(raw[i][1], raw[i][2], raw[i][3]);
                else if (type === 2) {
                    dataBuffer.push(raw[i][1], raw[i][2], raw[i][3]);
                    color.push(raw[i][4]/255, raw[i][5]/255, raw[i][6]/255)
                }
                else if (type === 3) {
                    dataBuffer.push(raw[i][1], raw[i][2], raw[i][3]);
                    color.push(raw[i][5]/255, raw[i][6]/255, raw[i][7]/255)
                }
            }

            obj.positions = dataBuffer.flat(3);

            obj.geometry = new THREE.BufferGeometry();
            obj.geometry.setAttribute("position", new THREE.Float32BufferAttribute(obj.positions, 3));
            if (type === 2 || type === 3)
                obj.geometry.setAttribute("colors", new THREE.Float32BufferAttribute(color, 3));
            // obj.material = new THREE.PointsMaterial({ size: obj.size, name: obj.level,color: obj.color,});
            obj.material = new CustomShaderMaterial({
                baseMaterial: TYPES.POINTS,
                // Our Custom vertex shader
                vShader: vShader,
                fShader: fShader(this.gradientColors.length),
                uniforms: {
                    colorsGradient: {
                        value: this.gradientColors,
                    },
                    bounds: {
                        value: this.gradientBounds,
                    },
                    len: {
                        value: this.gradientColors.length,
                    },                
                    bboxMin: {
                        value: this.minZ,
                    },
                    bboxMax: {
                        value: this.maxZ,
                    },
                    enableGradient: {
                        value: this.gradient.enableGradient,
                    },
                    type: {
                        value: type,
                    },
                    colorBase: {
                        value: new THREE.Color(obj.color),
                    },
                    circle: {
                        value: this.appearence.pointType.circle,
                    },
                    maxColorComponent: {
                        value: 1,
                    },
                },
                passthrough: {
                    size: obj.size,
                    vertexColors: type === 2 || type === 3,
                    sizeAttenuation: this.appearence?.useSizeAttenuation?.value ?? true,
                },
            })
            obj.points = new THREE.Points(obj.geometry, obj.material);
            obj.points.name = obj.title;
            obj.points.visible = obj.visible ?? true;
            
            // obj.geometry.rotateX(-1.5);
            // obj.geometry.translate(-1, -2, 11);

            this.scene.add(obj.points);
        }
    }
    saveSettings() {
        for (let [type, obj] of Object.entries(this.objects)) {
            if (!obj.points || !obj.material)
                continue;
            let set = {
                size: obj.material.size,
                color: obj.material?.uniforms?.colorBase?.value ?? obj.color,
                visible: obj.points.visible,
            }
            localStorage.setItem(obj.title, JSON.stringify(set));
        }
        localStorage.setItem("appearence", JSON.stringify(this.appearence));
    }
    getSettings() {
        let localAppearence = JSON.parse(localStorage.getItem('appearence'));
        if (localAppearence)
            this.appearence = localAppearence;

        for (let [type, obj] of Object.entries(this.objects)) {
            let storage = JSON.parse(localStorage.getItem(obj.title));
            if (!storage)
                continue;
            if (storage.size !== undefined)
                obj.size = Number(storage.size);
            if (storage.color !== undefined) {
                obj.color = Number(storage.color);
                obj.colorhex = `#${obj.color.toString(16).padStart(6, 0)}`;
            }
            if (storage.visible !== undefined) {
                obj.visible = storage.visible;
            }
        }
    }
    resetScene(){
        if (this.loaddataconf.preserveSettings)
            this.saveSettings();
        this.clearMarkerInfo();
        this.clearMarkerLine();
        this.clearMeasurements();
        this.profileClipper.clearProfile();
        for (let [type, obj] of Object.entries(this.objects)) {
            if (obj.positions) obj.positions = [];
            if (obj.points) {this.scene.remove( obj.points );obj.points = undefined}
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
            if (obj.colorBuffer) delete obj.colorBuffer;
        }   
        if (this.loaddataconf.preserveSettings)
            this.getSettings();
    }
    parseData(text) {
        let tmp = text.split("\n");
        this.data = [];
        this.data = tmp.reduce((result, item) => {
            item = item.trim().replaceAll(',', '');
            if (item.charAt(0)!=="#" && item !=="") {
                let line = item.split(/\s+/);
                if ([3, 6, 7].includes(line.length))
                    line.unshift(this.objects.unclassified.level);
                result.push(line);
            }
            return result;
        }, []);
        this.data = this.data.filter(i=>{return i.length > 1 })
        if(this.settings.resetSceneOnLoad) this.calcCenter();
    }
    calcCenter(){
        console.log("recalc called")
        for(let i = 0; i<this.data.length;i++){
            for(let j = 0; j < this.data[i].length;j++)
                if (!this.data[j]|| Number.isNaN(this.data[j]))
                    this.data.splice(i, 1);
            }
        let meanX = 0,meanY = 0, meanZ = 0;
        let x = [];
        let y = [];
        let z = [];
        for (let i = 0; i < this.data.length; i++){
            let item = this.data[i]
            if(item[0]<2 && item[0]>6) continue;
            x.push(item[1]);
            y.push(item[2]);
            z.push(item[3]);
        }

        meanX = this.arrAvg(x);
        meanY = this.arrAvg(y);
        meanZ = this.arrAvg(z);
        this.centerPoint = new THREE.Vector3(meanX, meanY, meanZ); 
        x=[];y=[];z=[];
        for (let i = 0; i < this.data.length; i++){
            this.data[i][1] = this.data[i][1] - meanX // красный
            this.data[i][2] = this.data[i][2] - meanY // + синий -
            this.data[i][3] = this.data[i][3] - meanZ // зеленый
            if (this.data[i][0] != 7) {
                x.push(this.data[i][1]);
                y.push(this.data[i][2]);
                z.push(this.data[i][3]);
            }
        }
        this.minX = this.arrayMin(x);
        this.maxX = this.arrayMax(x);
        this.minY = this.arrayMin(y);
        this.maxY = this.arrayMax(y);
        this.minZ = this.arrayMin(z);
        this.maxZ = this.arrayMax(z);
    } 

    arrayMin(arr) {
        var len = arr.length, min = Infinity;
        while (len--) {
            if (arr[len] < min) {
                min = arr[len];
            }
        }
        return min;
    }
      
    arrayMax(arr) {
        var len = arr.length, max = -Infinity;
        while (len--) {
            if (arr[len] > max) {
                max = arr[len];
            }
        }
        return max;
    }

    arrAvg(arr){
        for(let i = 0; i<arr.length;i++){
                arr[i] = parseFloat(arr[i])
        }
        let sum = arr.reduce((a, b) => a + b, 0);
        return (sum / arr.length);
    }
    loadLasFile(e) {
        if (this.settings.resetSceneOnLoad) this.resetScene();
        let batcher = e.detail.batches[0].batcher;
        let header = e.detail.batches[0].header;
        console.log(e.detail.batches)
        let appearedClasses = new Set();
        this.data = [];
        this.minX = header.mins[0];
        this.maxX = header.maxs[0];
        this.minY = header.mins[1];
        this.maxY = header.maxs[1];
        this.minZ = header.mins[2];
        this.maxZ = header.maxs[2];
        let meanX = 0;
        let meanY = 0;
        let meanZ = 0;
        // this.camera.position.set(this.minX, this.minY, this.minZ);
        this.corrective = new THREE.Vector3(header.mins[0],
            header.mins[1],
            header.mins[2]);
        let cameraPoint;
        let minZ = Infinity;
        let maxZ = -Infinity;
        let maxColor = null;
        batcher.forEach(batch => {
            for (let i = 0; i< batch.pointsCount; i++) {
                let point = batch.getPoint(i);
                let pointCoord = point.position;
                pointCoord[0] = pointCoord[0] * header.scale[0] + (header.offset[0]- this.corrective.x);
                pointCoord[1] = pointCoord[1] * header.scale[1] + (header.offset[1]- this.corrective.y);
                pointCoord[2] = pointCoord[2] * header.scale[2] + (header.offset[2] - this.corrective.z);
                minZ = Math.min(minZ, pointCoord[2]);
                maxZ = Math.max(maxZ, pointCoord[2]);
                meanX += pointCoord[0];
                meanY += pointCoord[1];
                meanZ += pointCoord[2];
                if(i === 0) {
                    cameraPoint = pointCoord;
                }
                let obj = this.objects[Object.keys(this.objects)[point.classification ?? 0]];
                appearedClasses.add(obj.level);
                if (!obj.positions) obj.positions = [];
                obj.positions.push(...pointCoord);
                if (point.color) {
                    let color = point.color;
                    color[0] = (color[0] / 255);
                    color[1] = (color[1] / 255);
                    color[2] = (color[2] / 255);
                    if (maxColor === null) {
                        maxColor = new THREE.Color();
                        maxColor.r = color[0];
                        maxColor.g = color[1];
                        maxColor.b = color[2];
                    } else {
                        maxColor.r = Math.max(maxColor.r, color[0]);
                        maxColor.g = Math.max(maxColor.g, color[1]);
                        maxColor.b = Math.max(maxColor.b, color[2]);
                    }
                    if (!obj.colorBuffer) obj.colorBuffer = [];
                    obj.colorBuffer.push(...color);
                }
            }
        })
        meanX /= header.pointsCount;
        meanY /= header.pointsCount;
        meanZ /= header.pointsCount;
        let maxColorComponent;
        if (maxColor)
            maxColorComponent =Math.max(maxColor.r, maxColor.g, maxColor.b);

            console.log(maxColorComponent)
        if (appearedClasses.size === 1 && appearedClasses.has(this.objects.unclassified.level)) {
            this.colorConfig.option = "rgb";
            this.colorConfig.value = 2;
            if (! this.objects.unclassified?.colorBuffer?.length)
                this.gradient.enableGradient = true;
            else
                this.gradient.enableGradient = false;
        } else {
            this.gradient.enableGradient = false;
        }

        for (let [type, obj] of Object.entries(this.objects)) {
            if (!appearedClasses.has(obj.level)) {
                obj.points = undefined;
                continue;
            }
            obj.geometry = new THREE.BufferGeometry();
            for (let i = 0; i < obj.positions.length; i+=3) {
                obj.positions[i] -= meanX;
                obj.positions[i+1] -= meanY;
                obj.positions[i+2] -= meanZ;
            }
            obj.geometry.setAttribute("position", new THREE.Float32BufferAttribute(obj.positions, 3));
            if (obj.colorBuffer)
                obj.geometry.setAttribute("colors", new THREE.Float32BufferAttribute(obj.colorBuffer, 3));
            // obj.material = new THREE.PointsMaterial({ size: obj.size, name: obj.level,color: obj.color,});
            obj.material = new CustomShaderMaterial({
                baseMaterial: TYPES.POINTS,
                // Our Custom vertex shader
                vShader: vShader,
                fShader: fShader(this.gradientColors.length),
                uniforms: {
                    colorsGradient: {
                        value: this.gradientColors,
                    },
                    bounds: {
                        value: this.gradientBounds,
                    },
                    len: {
                        value: this.gradientColors.length,
                    },                
                    bboxMin: {
                        value: minZ - meanZ,
                    },
                    bboxMax: {
                        value: maxZ - meanZ,
                    },
                    enableGradient: {
                        value: this.gradient.enableGradient,
                    },
                    type: {
                        value: this.colorConfig.value,
                    },
                    colorBase: {
                        value: new THREE.Color(obj.color),
                    },
                    circle: {
                        value: this.appearence.pointType.circle,
                    },
                    maxColorComponent: {
                        value: maxColorComponent ?? 1,
                    },
                },
                passthrough: {
                    size: obj.size,
                    vertexColors: Boolean(obj.colorBuffer),
                },
            })
            obj.points = new THREE.Points(obj.geometry, obj.material);
            obj.points.name = obj.title;
            obj.points.visible = obj.visible ?? true;
        
            this.scene.add(obj.points);
        }
        
        this.initGUI();
        this.initProfile();
        this.initNavigation();

        
        this.centerPoint = new THREE.Vector3(meanX, meanY, meanZ);
    }
}
window.app = new App();
console.log(app)
document.addEventListener("load.completed", app.loadLasFile.bind(app))

function exitConformation() {
    // if (confirm("Would you like to save settings?"))
    if (app.settings.saveSettings.value)
        app.saveSettings();
    return null;
    
}
window.onbeforeunload = exitConformation;
