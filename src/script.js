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

class App {
    constructor() {
        this.settings={
            resetSceneOnLoad:true
        }
        this.data = [];
        this.scene = {};
        this.objects = {};
        this.pickedPoints = [];
        this.pickedPointsClip = [];
        this.pickedPointsInfo = [];
        this.initInfo();
        this.gradient = {
            enableGradient: false,
            color1: '#0000ff',
            color2: '#ffff00',        
            color3: '#ff0000',
        };
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
        this.nav = new Navigation(this.camera, 2 * range, this.gui);
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
                serviceB: { level: "9", color: 0xf2e9e4, colorhex: "#f2e9e4", size: 0.15, title: "Service B point" },
        };

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
        this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.1, 10000);
        this.camera.position.x = 20;
        this.camera.position.y = 0;
        this.camera.position.z = 20;

        this.axesCamera = new THREE.PerspectiveCamera(75, this.AxesHelperSettings.canvas.width / this.AxesHelperSettings.canvas.height, 0.1, 10000);
        this.axesCamera.up = this.camera.up;
        
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
        this.controls = new OrbitControls(this.camera, this.labelRenderer.domElement);
        this.controls.enableDamping = true;
        this.controls.listenToKeyEvents(window);
        let thus = this;

        this.controls.addEventListener('change', ()=>{
            let cache = thus.camera.getWorldPosition(thus.cameraPostion);
            thus.info.cameraX.innerText = cache.x.toFixed(3);
            thus.info.cameraY.innerText = cache.y.toFixed(3);
            thus.info.cameraZ.innerText = cache.z.toFixed(3);
        } );


        // Init stats
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);
        this.stats.begin();
        // Add things to scene
        this.scene.add(this.camera);
        // this.scene.add(new THREE.AxesHelper(20));
        this.axesScene.add(new THREE.AxesHelper());
        this.scene.add(pointLight);
        
        // Init renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true
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
        
        this.tick();
        
    }
    initGUI() {
        if (this.gui) this.gui.destroy();
        this.gui = new dat.GUI();
        this.toggleFolder = this.gui.addFolder("Visibility");
        this.sizeFolder = this.gui.addFolder("Size");
        this.colorFolder = this.gui.addFolder("Color scheme");
        let loaddataconf = {
            add: function () {
                document.getElementById("file-input").click();
            },
        };
        this.loadbtn = this.gui.add(loaddataconf, "add").name("Load data");
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
        this.pickedPoints = [];
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
            this.sizeFolder.add(obj.points.material, "size", 0, 1, 0.005).name(obj.title + " size");
            let conf = { color: obj.colorhex };
            this.colorFolder.addColor(conf, "color").name(obj.title).onChange(function (colorValue) {
                obj.material.color.set(colorValue);
            });
        }
        this.gradientFolrder = this.colorFolder.addFolder('Gradient');
        this.gradientFolrder.add(this.gradient, 'enableGradient')
            .name("Enable")
            .listen()
            .onChange(function (enabled) {
                for (let [type, obj] of Object.entries(this.objects)) {
                    if (!obj.points || !obj.material) continue;
                    obj.material.uniforms.enableGradient.value = enabled;
                }
            }.bind(this));
        this.gradientFolrder.addColor(this.gradient, 'color1')
            .listen()
            .onChange(this.gradientColorChange.bind(this, 'color1'));
        this.gradientFolrder.addColor(this.gradient, 'color2')
            .listen()
            .onChange(this.gradientColorChange.bind(this, 'color2'));
        this.gradientFolrder.addColor(this.gradient, 'color3')
            .listen()
            .onChange(this.gradientColorChange.bind(this, 'color3'));
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
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
        this.axesRenderer.render(this.axesScene, this.axesCamera);
        this.stats.update();
        this.axesCamera.position.copy( this.camera.position );
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
            this.camera.aspect = this.sizes.width / this.sizes.height;
            this.camera.updateProjectionMatrix();

            // Update renderer
            this.renderer.setSize(this.sizes.width, this.sizes.height);
            this.labelRenderer.setSize(this.sizes.width, this.sizes.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });
    }

    #onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (event.ctrlKey && this.measurementSettings?.ruler?.enable)
            this.#pickPoint();

        if (event.ctrlKey && this.measurementSettings?.info?.enable)
            this.#pickInfoMarker();

        if(event.ctrlKey && this.profileClipper.clippingSettings.profile.enabled)
            this.profileClipper.pickClipMarker(this.measurementSettings.markerColor, this.measurementSettings.lineColor, this.mouse, this.camera);
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
        this.clearMarkerLine();
        const material = new THREE.LineBasicMaterial({ 
            color: this.measurementSettings.lineColor
        });
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const line = new THREE.Line( geometry, material );

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
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
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
        markerInfoDiv.innerHTML = `(${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)})</br>${type}`;
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

    #pickPoint() {
        let intersections = this.#getIntersectedObjectsFromEmitedRay();

        if (intersections.length) {
            let intersectedPoint = intersections[0].object.geometry.attributes.position;
            let intersetedPointIndex = intersections[0].index;
            this.pickedPoints.push(new THREE.Vector3().fromBufferAttribute(intersectedPoint, intersetedPointIndex));
            this.scene.add(this.#createSphere(this.pickedPoints.at(-1)));
            this.scene.add(this.#createLine(this.pickedPoints));
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
                      reader.readAsText( e.dataTransfer.files[0]);    
                    }
                });  
            
    }
    renderData() {
        for (let [type, obj] of Object.entries(this.objects)) {
            const raw = this.data.filter((item) => {
                return item[0] === obj.level;
            });
            if (raw.length === 0) continue;

            const dataBuffer = [];
            for (let i = 1; i < raw.length; i++) dataBuffer.push(raw[i][1], raw[i][2], raw[i][3]);

            obj.positions = dataBuffer.flat(3);

            obj.geometry = new THREE.BufferGeometry();
            obj.geometry.setAttribute("position", new THREE.Float32BufferAttribute(obj.positions, 3));
            // obj.material = new THREE.PointsMaterial({ size: obj.size, name: obj.level,color: obj.color,});
            obj.material = new CustomShaderMaterial({
                baseMaterial: TYPES.POINTS,
                // Our Custom vertex shader
                vShader: vShader,
                fShader: fShader,
                uniforms: {
                    color1: {
                        value: new THREE.Color(this.gradient.color1),
                    },
                    color2: {
                        value: new THREE.Color(this.gradient.color2),
                    },
                    color3: {
                        value: new THREE.Color(this.gradient.color3),
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
                    color: {
                        value: new THREE.Color(obj.color),
                    }
                },
                passthrough: {
                    size: obj.size,
                },
            })
            obj.points = new THREE.Points(obj.geometry, obj.material);
            obj.points.name = obj.title;
            
            obj.geometry.rotateX(-1.5);
            // obj.geometry.translate(-1, -2, 11);

            this.scene.add(obj.points);
        }
    }
    resetScene(){
        for (let [type, obj] of Object.entries(this.objects)) {
            if (obj.positions) obj.positions = [];
            if (obj.points) this.scene.remove( obj.points );
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        }   
    }
    parseData(text) {
        let tmp = text.split("\n");
        this.data = [];
        this.data = tmp.map((item) => {
            return item.split(" ");
        });
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
            if(item[0]>2 && item[0]<6) continue;
            x.push(item[1]);
            y.push(item[2]);
            z.push(item[3]);
        }

        meanX = this.arrAvg(x);
        meanY = this.arrAvg(y);
        meanZ = this.arrAvg(z);
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
}
window.app = new App();
console.log(app)
