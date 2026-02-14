import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import {
  useTexture,
} from "@react-three/drei";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const Bitcoin = () => {
  gsap.registerPlugin(useGSAP());
  gsap.registerPlugin(ScrollTrigger);

  useThree(({ camera, scene, gl }) => {
    camera.position.z = 0.5;
    gl.toneMapping = THREE.ReinhardToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  });

  const bitcoinTexture = useTexture("/bitcoin_texture.png");
  bitcoinTexture.colorSpace = THREE.SRGBColorSpace;
  bitcoinTexture.flipY = false;

  const [
    mat1,
    mat2,
    mat3,
    mat4,
    mat5,
    mat6,
    mat7,
    mat8,
    mat9,
    mat10,
    mat11,
    mat12,
    mat13,
    mat14,
    mat15,
    mat16,
    mat17,
    mat18,
    mat19,
    mat20,
  ] = (useTexture([
    "/matcap/mat-1.png",
    "/matcap/mat-2.png",
    "/matcap/mat-3.png",
    "/matcap/mat-4.png",
    "/matcap/mat-5.png",
    "/matcap/mat-6.png",
    "/matcap/mat-7.png",
    "/matcap/mat-8.png",
    "/matcap/mat-9.png",
    "/matcap/mat-10.png",
    "/matcap/mat-11.png",
    "/matcap/mat-12.png",
    "/matcap/mat-13.png",
    "/matcap/mat-14.png",
    "/matcap/mat-15.png",
    "/matcap/mat-16.png",
    "/matcap/mat-17.png",
    "/matcap/mat-18.png",
    "/matcap/mat-19.png",
    "/matcap/mat-20.png"
  ])).map((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });

  // Load custom purple matcap
  const purpleMat = useTexture("/matcap/purple.png");
  purpleMat.colorSpace = THREE.SRGBColorSpace;

  // Load custom gold matcap
  const goldMat = useTexture("/matcap/gold.png");
  goldMat.colorSpace = THREE.SRGBColorSpace;
  
  const material = useRef({
    uMatcap1: {value: mat19},
    uMatcap2: {value: goldMat}, // Use gold as default
    uProgress: {value: 1.0}
  })

  // We use MeshMatcapMaterial but we'll apply the texture to the map property to give it the bitcoin look
  // while mixing matcaps for the lighting/effect.
  // Actually, standard MeshMatcapMaterial doesn't really use 'map' strongly if matcap is present in a way that overrides it easily.
  // Let's stick to the shader modification approach.
  // To make the bitcoin texture visible, we might need to multiply it or just use it as the base color
  // logic in the shader. 
  // For simplicity and "metallic" look, let's use the matcap as the primary driver of "shine" 
  // but we need the bitcoin details.
  // Let's try passing the bitcoin texture as a map.
  
  const coinMaterial = new THREE.MeshMatcapMaterial({
    matcap: goldMat,
    map: bitcoinTexture
  });

  function onBeforeCompile(shader) {
    shader.uniforms.uMatcapTexture1 = material.current.uMatcap1;
    shader.uniforms.uMatcapTexture2 = material.current.uMatcap2;
    shader.uniforms.uProgress = material.current.uProgress;

    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      `
        uniform sampler2D uMatcapTexture1;
        uniform sampler2D uMatcapTexture2;
        uniform float uProgress;

        void main() {
        `,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4 matcapColor = texture2D( matcap, uv );",
      `
          vec4 matcapColor1 = texture2D( uMatcapTexture1, uv );
          vec4 matcapColor2 = texture2D( uMatcapTexture2, uv );
          float transitionFactor  = 0.2;
          
          float progress = smoothstep(uProgress - transitionFactor, uProgress, (vViewPosition.x+vViewPosition.y)*0.5 + 0.5);

          vec4 matcapColor = mix(matcapColor2, matcapColor1, progress );
          
          // Boost brightness
          matcapColor.rgb *= 1.7;
        `,
    );
     // Note: The original shader multiplies matcapColor with diffuseColor (from map).
     // So having map: bitcoinTexture in the material constructor should work to apply the pattern 
     // while the matcap gives it the gold/shiny look.
  }

  coinMaterial.onBeforeCompile = onBeforeCompile;

  const bitcoinRef = useRef();

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#section-1",
        endTrigger: "#section-4",
        start: "top top",
        end: "bottom bottom",
        markers: false,
        scrub: true,
      },
    });

    if (!bitcoinRef.current) return;

    tl.to(bitcoinRef.current.position, {
      z: "-=0.75",
      y: "+=0.1",
    })
      .to(bitcoinRef.current.rotation, {
        x: `+=${Math.PI / 2}`, // Spin on X
        z: `+=${Math.PI / 2}`  // Spin on Z
      })
      .to(
        bitcoinRef.current.rotation,
        {
          y: `-=${Math.PI * 2}`, // Full spin on Y
        },
        "third",
      )
      .to(
        bitcoinRef.current.position,
        {
          x: "-=0.55",
          z: "+=0.55",
          y: "-=0.05",
        },
        "third",
      );
  }, []);

  useEffect(() => {
     const handleMouseEnter = (mat) => {
        material.current.uMatcap1.value = mat;
        gsap.to(material.current.uProgress, {
            value: 0.0,
            duration: 0.33,
            onComplete: () => {
                material.current.uMatcap2.value = material.current.uMatcap1.value;
                material.current.uProgress.value = 1.0;
            }
        });
     };
     
     const handleMouseLeave = () => {
         material.current.uMatcap1.value = mat2;
         gsap.to(material.current.uProgress, {
            value: 0.0,
            duration: 0.33,
            onComplete: () => {
                material.current.uMatcap2.value = material.current.uMatcap1.value;
                material.current.uProgress.value = 1.0;
            }
        });
     };


    const addHoverListener = (selector, mat) => {
        const el = document.querySelector(selector);
        if(el) el.addEventListener("mouseenter", () => handleMouseEnter(mat));
    };


  // ... (existing logs/logic)

    addHoverListener(`.title[img-title="genesis-block"]`, purpleMat);
    addHoverListener(`.title[img-title="smart-contracts"]`, mat8);
    addHoverListener(`.title[img-title="defi-ecosystem"]`, mat9);
    addHoverListener(`.title[img-title="consensus"]`, mat12);
    addHoverListener(`.title[img-title="cryptography"]`, mat10);
    addHoverListener(`.title[img-title="web3-arch"]`, mat8);

    const titles = document.querySelector(`.titles`);
    if(titles) titles.addEventListener("mouseleave", handleMouseLeave);
    
    // Cleanup
    return () => {
        // ideally remove listeners here
    }

  }, [])

  return (
    <>
      <group position={[0.25, -0.55, 0]} rotation={[Math.PI / 2, 0, 0]} ref={bitcoinRef}>
        {/* Coin scaling and geometry */}
        <mesh material={coinMaterial} scale={[0.6, 0.6, 0.6]}>
          <cylinderGeometry args={[1, 1, 0.1, 64]} />
        </mesh>
      </group>
      <directionalLight position={[0, 5, 5]} color={0xffffff} intensity={10} />
    </>
  );
};

export default Bitcoin;
