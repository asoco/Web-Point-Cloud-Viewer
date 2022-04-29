export const fShader = {
    defines: " ",
    header: `
        varying vec2 vUv;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        uniform vec3 color4;
        uniform bool enableGradient;
        uniform vec3 color;
        float remap( float minval, float maxval, float curval )
        {
            return ( curval - minval ) / ( maxval - minval );
        } 
    `,
    main: `
        vec4 newColor;
        if (enableGradient == true) {
            //vec3 tmp = vec3(mix(color1, color2, vUv.y));
            float u = vUv.y;
            u = clamp(u, 0.0, 1.0);
            if (u < 0.5)
                newColor = vec4(mix(color1, color2, remap(0.0, 0.5, u)), 1.0);
            else
                newColor = vec4(mix(color2, color3, remap(0.5, 1.0, u)), 1.0);
        }
        else
           newColor = vec4(color, 1.0);   
    `,
}
