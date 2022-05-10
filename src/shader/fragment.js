export const fShader = (length) => {return {
    defines: "#define GR_LENGTH " + length,
    header: `
        varying vec2 vUv;
        uniform bool enableGradient;
        uniform vec3 colorBase;
        uniform vec3[GR_LENGTH] colorsGradient;
        uniform float[GR_LENGTH] bounds;
        uniform int len;
        uniform bool circle;
        uniform float type;
        varying vec3 vvColor;
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
                    newColor = vec4(mix(colorsGradient[i], colorsGradient[i+1], remap(bounds[i], bounds[i+1], u)), 1.0);
            }
        }
        else if(type == 1.0)
           newColor = vec4(colorBase, 1.0);  
        else
            newColor = vec4(vvColor, 1.0); 
    `,
}}
