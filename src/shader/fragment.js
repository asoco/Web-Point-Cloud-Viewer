export const fShader = (length) => {return {
    defines: "#define GR_LENGTH " + length,
    header: `
        varying vec2 vUv;
        uniform bool enableGradient;
        uniform vec3 color;
        uniform vec3[GR_LENGTH] colors;
        uniform float[GR_LENGTH] bounds;
        uniform int len;
        uniform bool circle;
        float remap( float minval, float maxval, float curval )
        {
            return ( curval - minval ) / ( maxval - minval );
        } 
    `,
    main: `
        if (circle) {
            float distanceFromCenter = length(2.0 * gl_PointCoord - 1.0);
            if(distanceFromCenter > 1.0) {
                discard;
            }
        }
        vec4 newColor;
        if (enableGradient == true) {
            //vec3 tmp = vec3(mix(color1, color2, vUv.y));
            float u = vUv.y;
            u = clamp(u, 0.0, 1.0);
            for (int i = 0; i < GR_LENGTH - 1; i++) {
                if (u > bounds[i] && u < bounds[i+1])
                    newColor = vec4(mix(colors[i], colors[i+1], remap(bounds[i], bounds[i+1], u)), 1.0);
            }
        }
        else
           newColor = vec4(color, 1.0);   
    `,
}}
