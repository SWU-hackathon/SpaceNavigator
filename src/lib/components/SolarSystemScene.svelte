<script lang="ts">
	import { onMount, onDestroy, beforeUpdate } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import type { CelestialBodyData } from '$lib/solarSystem/celestialData';

	// Props
	export let simulationTime: Date;
	export let celestialData: CelestialBodyData[];
	export let enableRotation: boolean = true;

	// Three.js variables
	let canvasElement: HTMLCanvasElement;
	let renderer: THREE.WebGLRenderer;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let controls: OrbitControls;
	let animationFrameId: number;
	let textureLoader: THREE.TextureLoader;
	let celestialBodies: { [name: string]: THREE.Object3D } = {};
    let orbitLines: THREE.Line[] = []; // Храним линии орбит для очистки

    // Функция создания тел (остается та же)
	function createCelestialBody(data: CelestialBodyData): THREE.Object3D {
		const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
		let material: THREE.Material;
		const texturePath = data.textureFile.startsWith('/') ? data.textureFile : `/${data.textureFile}`;
		const texture = textureLoader.load(texturePath);
		texture.colorSpace = THREE.SRGBColorSpace;

		if (data.isStar) {
			material = new THREE.MeshBasicMaterial({ map: texture, fog: false });
		} else {
			material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0.1 });
		}
		const mesh = new THREE.Mesh(geometry, material);
		mesh.name = data.name;
		if (data.tilt) mesh.rotation.z = data.tilt;

		if (data.ringData) {
            const ringGeometry = new THREE.RingGeometry(data.ringData.innerRadius, data.ringData.outerRadius, 64);
            ringGeometry.rotateX(-Math.PI / 2);
            const ringTexturePath = data.ringData.textureFile.startsWith('/') ? data.ringData.textureFile : `/${data.ringData.textureFile}`;
            const ringTexture = textureLoader.load(ringTexturePath);
            ringTexture.colorSpace = THREE.SRGBColorSpace;
            const ringMaterial = new THREE.MeshBasicMaterial({ map: ringTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.75, alphaTest: 0.05 });
            const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            mesh.add(ringMesh);
        }
		return mesh;
	}

    // Функция создания линии орбиты (остается та же)
    function createOrbitLine(radius: number): THREE.Line {
        const orbitPoints = [];
        const segments = 128;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            orbitPoints.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
        }
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        return orbitLine;
    }

    // Функция обновления позиций на основе симуляции
    function updateBodyPositionsSimulated(simTime: Date) {
        const timeFactor = simTime.getTime() * 0.000001; // Масштаб времени

        celestialData.forEach(data => {
            const body = celestialBodies[data.name];
            if (!body) return;

            if (!data.isStar) {
                const angle = timeFactor * data.orbitalSpeed * 500; // Угол на орбите

                if (!data.parentBody) { // Планеты вокруг Солнца
                    body.position.x = Math.cos(angle) * data.orbitalRadius;
                    body.position.z = Math.sin(angle) * data.orbitalRadius;
                    body.position.y = 0;
                } else { // Луны вокруг родителя
                    const parent = celestialBodies[data.parentBody];
                    if (parent) {
                        const moonAngle = timeFactor * data.orbitalSpeed * 500;
                        const x_offset = Math.cos(moonAngle) * data.orbitalRadius;
                        const z_offset = Math.sin(moonAngle) * data.orbitalRadius;
                        body.position.set(
                            parent.position.x + x_offset,
                            parent.position.y,
                            parent.position.z + z_offset
                        );
                    }
                }
            }
        });
    }

	// onMount (создание сцены, объектов, линий орбит)
	onMount(() => {
        if (!canvasElement) return;

        // Настройка сцены, камеры, рендерера, света, controls
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x00000a);
        const { clientWidth, clientHeight } = canvasElement.parentElement || { clientWidth: window.innerWidth, clientHeight: window.innerHeight };
        camera = new THREE.PerspectiveCamera(60, clientWidth / clientHeight, 0.1, 1000);
        camera.position.set(0, 25, 50);
        camera.lookAt(scene.position);
        renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
        renderer.setSize(clientWidth, clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        textureLoader = new THREE.TextureLoader();
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffeedd, 3, 1000);
        scene.add(pointLight);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2;
        controls.maxDistance = 300;

        // Создаем объекты и линии орбит
        celestialData.forEach(data => {
            const bodyMesh = createCelestialBody(data);
            celestialBodies[data.name] = bodyMesh;

            if (!data.parentBody) {
                 scene.add(bodyMesh);
                 if (data.orbitalRadius > 0) {
                     const orbitLine = createOrbitLine(data.orbitalRadius);
                     orbitLines.push(orbitLine); // Сохраняем для очистки
                     scene.add(orbitLine);
                 }
            } else {
                const parent = celestialBodies[data.parentBody];
                if(parent) parent.add(bodyMesh);
                else console.warn(`Parent body ${data.parentBody} not found for moon ${data.name}`);
            }
        });

        // Первоначальное обновление позиций
        updateBodyPositionsSimulated(simulationTime);

        // Обработчик ресайза
        const handleResize = () => {
             if (!camera || !renderer || !canvasElement.parentElement) return;
            const { clientWidth, clientHeight } = canvasElement.parentElement;
            camera.aspect = clientWidth / clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(clientWidth, clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
        };
        window.addEventListener('resize', handleResize);

        // Анимационный цикл
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            if (enableRotation) { // Осевое вращение
                celestialData.forEach(data => {
                    const body = celestialBodies[data.name];
                    if (body) body.rotation.y += data.rotationSpeed * 0.05;
                });
            }
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Очистка
        return () => {
            console.log('Cleaning up SolarSystemScene...');
			window.removeEventListener('resize', handleResize);
			cancelAnimationFrame(animationFrameId);
			controls.dispose();
            scene.traverse((object) => { /* ... полная очистка геометрий/материалов ... */ });
            // Очистка линий орбит
            orbitLines.forEach(line => {
                if (line.geometry) line.geometry.dispose();
                // Исправленная очистка материала линии
                if (line.material && !Array.isArray(line.material)) {
                    line.material.dispose();
                }
            });
            orbitLines = [];
            celestialBodies = {};
			if (renderer) renderer.dispose();
        };
	});

    // Реактивное обновление позиций
    beforeUpdate(() => {
        if (scene && celestialBodies && Object.keys(celestialBodies).length > 0) {
             updateBodyPositionsSimulated(simulationTime); // Используем симуляцию
        }
    });

</script>

<canvas bind:this={canvasElement} id="solar-system-canvas"></canvas>

<style>
	#solar-system-canvas { display: block; width: 100%; height: 100%; background-color: #000; }
</style>