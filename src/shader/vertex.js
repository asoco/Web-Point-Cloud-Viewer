export const vShader = {
    defines: ``,
    header: `
        varying vec2 vUv;
        uniform float bboxMin;
        uniform float bboxMax;
    `,
    main: `
        vUv.y = (position.y - bboxMin) / (bboxMax - bboxMin);
        vec3 newPos = position;
    `,
}
