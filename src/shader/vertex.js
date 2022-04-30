export const vShader = {
    defines: ``,
    header: `
        varying vec2 vUv;
        uniform float bboxMin;
        uniform float bboxMax;
    `,
    main: `
        vUv.y = (position.z - bboxMin) / (bboxMax - bboxMin);
        vec3 newPos = position;
    `,
}
