import localization  from '../locale/locale.json';
export class Navigation {
    
    constructor(camera, controls, range, gui) {
        this.camera = camera;
        this.controls = controls;
        this.range = range;
        this.gui = gui;
        this.settings = {
            lang:"ru"
        }
        this.navigationSettings = {
            top: this.setTopView.bind(this),
            bottom: this.setBottomView.bind(this),
            left: this.setLeftView.bind(this),
            right: this.setRightView.bind(this),
            front: this.setFrontView.bind(this),
            back: this.setBackView.bind(this),
        };
    }

    initGUI() {
        this.nav = this.gui.addFolder(this.#getUIstring("navigation", 'Navigation'));
        this.nav.add(this.navigationSettings, 'top').name(this.#getUIstring("nav-top", 'Top'));
        this.nav.add(this.navigationSettings, 'bottom').name(this.#getUIstring("nav-bottom", 'Bottom'));
        this.nav.add(this.navigationSettings, 'left').name(this.#getUIstring("nav-left", 'Left'));
        this.nav.add(this.navigationSettings, 'right').name(this.#getUIstring("nav-right", 'Right'));
        this.nav.add(this.navigationSettings, 'front').name(this.#getUIstring("nav-front", 'Front'));
        this.nav.add(this.navigationSettings, 'back').name(this.#getUIstring("nav-back", 'Back'));
    }

    backToCenter() {
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    setTopView() {
        this.backToCenter();
        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.camera.position.z = this.range;
    }

    setBottomView() {
        this.backToCenter();
        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.camera.position.z = -this.range;
    }

    setRightView() {
        this.backToCenter();
        this.camera.position.x = this.range;
        this.camera.position.y = 0;
        this.camera.position.z = 0;
    }

    setLeftView() {
        this.backToCenter();
        this.camera.position.x = -this.range;
        this.camera.position.y = 0;
        this.camera.position.z = 0;
    }

    setFrontView() {
        this.backToCenter();
        this.camera.position.x = 0;
        this.camera.position.y = this.range;
        this.camera.position.z = 0;
    }

    setBackView() {
        this.backToCenter();
        this.camera.position.x = 0;
        this.camera.position.y = -this.range;
        this.camera.position.z = 0;
    }
    #getUIstring(stringID,fallback){
        let lang = this?.settings?.lang ? this.settings.lang : "en"; 
        let noLangFallback = (Math.random() + 1).toString(36).substring(7);
        return `${localization[lang]["ui"][stringID] || fallback || stringID || `no-locale-${noLangFallback}`}`
    }
    
}
