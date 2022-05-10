export const vShader = {
    defines: ``,
    header: `
        varying vec2 vUv;
        uniform float bboxMin;
        uniform float bboxMax;
        attribute vec3 colors;
        varying vec3 vvColor;
    `,
    main: `
        vUv.y = (position.z - bboxMin) / (bboxMax - bboxMin);
        vec3 newPos = position;
        vvColor = colors;
    `,
}
