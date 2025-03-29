<!-- src/lib/components/SatelliteGlobe.svelte -->
<!-- Renders an interactive 3D globe displaying satellite positions and orbits using Three.js and satellite.js. -->
<!-- Includes filtering controls and hover/click interactions. -->

<!-- context="module" allows exporting types and interfaces -->
<script context="module" lang="ts">
	// Import types only for type checking, avoiding runtime dependency unless needed.
	import type * as THREE_TYPES from 'three';
	import type * as SATELLITE_TYPES from 'satellite.js';
	// Import types defined in other local modules.
	import type { SatelliteDetails } from '$lib/satellite-info';

	// Define the possible orbit classifications based on calculated parameters.
	export type OrbitClassification = 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'SSO' | 'Unknown';

	// Interface defining the structure for each satellite object managed by this component.
	export interface SatelliteObject {
		name: string; // Satellite name from TLE data
		satrec: SATELLITE_TYPES.SatRec; // The satellite record object from satellite.js, used for propagation
		mesh: THREE_TYPES.Mesh; // The Three.js mesh representing the satellite visually
		defaultColor: number; // The default color hex code for the satellite mesh
		trackLine?: THREE_TYPES.Line; // Optional Three.js line representing the recent/upcoming orbit track
		details: SatelliteDetails; // Additional details (type, description) from satellite-info.ts
		orbitType: OrbitClassification; // Classified orbit type (LEO, MEO, etc.)
		isVisible: boolean; // Flag indicating if the satellite should be visible based on filters
		currentLatRad?: number; // Current calculated latitude in radians (updated continuously)
		currentLonRad?: number; // Current calculated longitude in radians (updated continuously)
	}

	// Re-export filter types defined in SatelliteFilter.svelte for use within this component
	export type { OrbitFilter, TypeFilter } from './SatelliteFilter.svelte';
</script>

<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	// Import necessary libraries
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Camera controls
	import * as satellite from 'satellite.js'; // Satellite position calculation library
	import { getSatelliteDetails } from '$lib/satellite-info'; // Function to get satellite details
	import SatelliteFilter, { type OrbitFilter, type TypeFilter } from './SatelliteFilter.svelte'; // Import the filter component itself and its types

	// --- Props ---
	export let radiationRiskLevel: string = 'None';

	// --- State Variables ---
	let isLoadingTLE = true;
	let tleError: string | null = null;
	let hoveredSatelliteName: string | null = null;
	let labelInfo: { name: string; x: number; y: number } | null = null;
	let isFullscreen = false;
	let currentOrbitFilter: OrbitFilter = 'ALL';
	let currentTypeFilter: TypeFilter = 'ALL';

	// DOM element bindings
	let container: HTMLDivElement;
	let uiContainer: HTMLDivElement;

	// --- Constants ---
	const EARTH_RADIUS_SCENE = 5;
	const REAL_EARTH_RADIUS_KM = 6371;
	const SCALE_FACTOR = REAL_EARTH_RADIUS_KM / EARTH_RADIUS_SCENE;
	const DEFAULT_COLOR_ISS = 0xffaa00;
	const DEFAULT_COLOR_OTHER = 0x00aaff;
	const HAZARD_COLOR = 0xff00ff;
	const TRACK_COLOR = 0x888888;

	// --- Data Types ---
	interface FetchedTleData {
		name: string;
		tle1: string;
		tle2: string;
	}

	// --- Local State ---
	let localSatelliteObjects: SatelliteObject[] = [];

	// --- Event Dispatcher ---
	const dispatch = createEventDispatcher<{ satelliteclick: SatelliteObject }>();

	// --- Functions ---

	/** Fetches TLE data from the internal API endpoint (/api/tle). */
	async function loadTLEData(): Promise<FetchedTleData[]> {
		console.log('[SatelliteGlobe] Fetching TLE from API...');
		isLoadingTLE = true;
		tleError = null;
		try {
			const apiUrl = '/api/tle?t=' + Date.now();
			const response = await fetch(apiUrl);
			if (!response.ok) {
				let errorMsg = `Failed to fetch TLE: ${response.status} ${response.statusText}`;
				try {
					const errorData = await response.json();
					errorMsg = errorData.message || errorMsg;
				} catch {}
				throw new Error(errorMsg);
			}
			const data: FetchedTleData[] = await response.json();
			if (!Array.isArray(data)) {
				throw new Error('Invalid TLE data format received from API. Expected an array.');
			}
			console.log(
				`[SatelliteGlobe] TLE data fetched successfully: ${data.length} records received (before parsing limit).`
			);
			return data;
		} catch (error: any) {
			console.error('[SatelliteGlobe] Error fetching TLE data:', error);
			tleError = error.message || 'Unknown error fetching TLE.';
			isLoadingTLE = false;
			throw error;
		}
	}

	/** Calculates points along the satellite's orbit track. */
	function calculateTrackPoints(satrec: satellite.SatRec, startTime: Date): THREE.Vector3[] {
		const points: THREE.Vector3[] = [];
		const minutesBefore = 45;
		const minutesAfter = 45;
		const stepSeconds = 60;
		const startTimeMs = startTime.getTime();
		for (let i = -minutesBefore * (60 / stepSeconds); i <= minutesAfter * (60 / stepSeconds); i++) {
			const trackTime = new Date(startTimeMs + i * stepSeconds * 1000);
			try {
				const gmst = satellite.gstime(trackTime);
				const posVel = satellite.propagate(satrec, trackTime);
				const posEci = posVel.position as satellite.EciVec3<number>;
				if (posEci) {
					const geo = satellite.eciToGeodetic(posEci, gmst);
					const r = EARTH_RADIUS_SCENE + geo.height / SCALE_FACTOR;
					const x = r * Math.cos(geo.latitude) * Math.cos(geo.longitude);
					const y = r * Math.sin(geo.latitude);
					const z = -r * Math.cos(geo.latitude) * Math.sin(geo.longitude);
					points.push(new THREE.Vector3(x, y, z));
				}
			} catch (e) {}
		}
		return points;
	}

	/** Classifies the satellite's orbit based on its orbital parameters. */
	function classifyOrbit(satrec: satellite.SatRec): OrbitClassification {
		const meanMotionRadPerMin = satrec.no;
		const eccentricity = satrec.ecco;
		const inclinationDeg = satrec.inclo * (180 / Math.PI);
		if (meanMotionRadPerMin <= 0) return 'Unknown';
		const periodMinutes = (2 * Math.PI) / meanMotionRadPerMin;
		const mu = 398600.4418;
		const meanMotionRadPerSec = meanMotionRadPerMin / 60;
		const semiMajorAxisKm = Math.cbrt(mu / (meanMotionRadPerSec * meanMotionRadPerSec));
		const altitudeKm = semiMajorAxisKm - REAL_EARTH_RADIUS_KM;
		if (isNaN(periodMinutes) || isNaN(altitudeKm)) return 'Unknown';
		if (eccentricity > 0.25) {
			return 'HEO';
		} else if (Math.abs(periodMinutes - 1436.1) < 30 && eccentricity < 0.1 && inclinationDeg < 5) {
			return 'GEO';
		} else if (altitudeKm < 2000 && Math.abs(inclinationDeg - 98) < 5) {
			return 'SSO';
		} else if (altitudeKm < 2000) {
			return 'LEO';
		} else if (altitudeKm >= 2000 && altitudeKm < 35700) {
			return 'MEO';
		} else if (altitudeKm >= 35700) {
			return 'MEO';
		} else {
			return 'Unknown';
		}
	}

	/** Applies the current filters to the list of satellites. */
	function applyFilters(satellites: SatelliteObject[], orbitF: OrbitFilter, typeF: TypeFilter) {
		if (!satellites || satellites.length === 0) return;
		satellites.forEach((sat) => {
			let orbitMatch = false;
			let typeMatch = false;
			if (orbitF === 'ALL') {
				orbitMatch = true;
			} else if (orbitF === 'OTHER') {
				orbitMatch = sat.orbitType === 'Unknown';
			} else {
				orbitMatch = sat.orbitType === orbitF;
			}
			if (typeF === 'ALL') {
				typeMatch = true;
			} else if (typeF === 'ISS') {
				typeMatch = sat.details.type === 'ISS';
			} else if (typeF === 'OBSERVATION') {
				typeMatch = sat.details.type === 'Earth Observation';
			} else if (typeF === 'CAMERA') {
				typeMatch = !!sat.details.hasCamera;
			}
			sat.isVisible = orbitMatch && typeMatch;
			const meshMaterial = sat.mesh.material as THREE.MeshBasicMaterial;
			const trackMaterial = sat.trackLine?.material as THREE.LineBasicMaterial;
			const targetMeshOpacity = sat.isVisible ? 1.0 : 0.0;
			const targetTrackOpacity = sat.isVisible ? 0.4 : 0.0;
			const lerpFactor = 0.1;
			if (meshMaterial) {
				meshMaterial.transparent = true;
				meshMaterial.opacity = THREE.MathUtils.lerp(
					meshMaterial.opacity,
					targetMeshOpacity,
					lerpFactor
				);
				sat.mesh.visible = meshMaterial.opacity > 0.01;
			}
			if (trackMaterial && sat.trackLine) {
				trackMaterial.transparent = true;
				trackMaterial.opacity = THREE.MathUtils.lerp(
					trackMaterial.opacity,
					targetTrackOpacity,
					lerpFactor
				);
				sat.trackLine.visible = trackMaterial.opacity > 0.01;
			}
		});
	}

	/** Event handler for filter changes from the SatelliteFilter component. */
	function handleFilterUpdateFromComponent(
		event: CustomEvent<{ orbit: OrbitFilter; type: TypeFilter }>
	) {
		currentOrbitFilter = event.detail.orbit;
		currentTypeFilter = event.detail.type;
		hoveredSatelliteName = null;
		labelInfo = null;
		console.log(
			`[SatelliteGlobe] Filters updated: Orbit=${currentOrbitFilter}, Type=${currentTypeFilter}`
		);
	}

	/** Error handler for Fullscreen API requests */
	function handleFSError(err: Error) {
		console.error(`Fullscreen Error: ${err.message} (${err.name})`);
		isFullscreen = false;
	}

	/** Toggles fullscreen mode for the uiContainer element */
	function toggleFullscreen() {
		if (!uiContainer || !document) return;
		const doc = document as Document & {
			webkitExitFullscreen?: () => Promise<void>;
			mozCancelFullScreen?: () => Promise<void>;
			msExitFullscreen?: () => Promise<void>;
			webkitFullscreenElement?: Element | null;
			mozFullScreenElement?: Element | null;
			msFullscreenElement?: Element | null;
		};
		const cont = uiContainer as HTMLDivElement & {
			webkitRequestFullscreen?: () => Promise<void>;
			mozRequestFullScreen?: () => Promise<void>;
			msRequestFullscreen?: () => Promise<void>;
		};
		const isCurrentlyFullscreen = !!(
			doc.fullscreenElement ||
			doc.webkitFullscreenElement ||
			doc.mozFullScreenElement ||
			doc.msFullscreenElement
		);
		if (!isCurrentlyFullscreen) {
			if (cont.requestFullscreen) {
				cont.requestFullscreen().catch(handleFSError);
			} else if (cont.mozRequestFullScreen) {
				cont.mozRequestFullScreen().catch(handleFSError);
			} else if (cont.webkitRequestFullscreen) {
				cont.webkitRequestFullscreen().catch(handleFSError);
			} else if (cont.msRequestFullscreen) {
				cont.msRequestFullscreen().catch(handleFSError);
			}
		} else {
			if (doc.exitFullscreen) {
				doc.exitFullscreen().catch(handleFSError);
			} else if (doc.mozCancelFullScreen) {
				doc.mozCancelFullScreen().catch(handleFSError);
			} else if (doc.webkitExitFullscreen) {
				doc.webkitExitFullscreen().catch(handleFSError);
			} else if (doc.msExitFullscreen) {
				doc.msExitFullscreen().catch(handleFSError);
			}
		}
	}

	// --- A11y Fix: Placeholder Keydown Handler ---
	function handleContainerKeydown(event: KeyboardEvent) {
		// Placeholder to satisfy a11y rules. Full keyboard nav is complex.
		if (event.key === 'Enter' || event.key === ' ') {
			console.log(
				'[SatelliteGlobe] Container focused and Enter/Space pressed (keyboard interaction placeholder).'
			);
			// Future enhancement: trigger action based on a focused satellite concept
		}
	}
	// --- End A11y Fix ---

	// --- Lifecycle Hooks ---
	$: if (localSatelliteObjects && localSatelliteObjects.length > 0 && !isLoadingTLE) {
		applyFilters(localSatelliteObjects, currentOrbitFilter, currentTypeFilter);
	}

	onMount(() => {
		if (!container) {
			console.error('[SatelliteGlobe] Init error: Canvas container element not found.');
			isLoadingTLE = false;
			tleError = 'Initialization Error: DOM container not ready.';
			return;
		}
		if (!uiContainer) {
			console.error('[SatelliteGlobe] Init error: UI container element not found.');
			isLoadingTLE = false;
			tleError = 'Initialization Error: UI container not ready.';
			return;
		}

		let isMounted = true;
		let animationFrameId: number;
		let rendererInstance: THREE.WebGLRenderer | null = null;
		let sceneInstance: THREE.Scene | null = null;
		let cameraInstance: THREE.PerspectiveCamera | null = null;
		let controlsInstance: OrbitControls | null = null;
		let localSatelliteMeshes: THREE.Mesh[] = [];
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();
		const labelPositionVector = new THREE.Vector3();

		function disposeObject(obj: any) {
			if (!obj) return;
			if (obj.geometry?.dispose) obj.geometry.dispose();
			if (obj.material) {
				if (Array.isArray(obj.material)) {
					obj.material.forEach((material: any) => disposeMaterial(material));
				} else {
					disposeMaterial(obj.material);
				}
			}
		}
		function disposeMaterial(material: any) {
			if (!material) return;
			if (material.map?.dispose) material.map.dispose();
			if (material.dispose) material.dispose();
		}

		function updateSatellitePositions(currentTime: Date) {
			if (!isMounted || !localSatelliteObjects || localSatelliteObjects.length === 0) return;
			const gmst = satellite.gstime(currentTime);
			const highLatitudeThresholdRad = 50 * (Math.PI / 180);
			const isHazardCondition = ['High', 'Severe', 'Extreme'].includes(radiationRiskLevel);
			localSatelliteObjects.forEach((sat) => {
				if (!sat.isVisible || !sat.mesh.visible) {
					return;
				}
				try {
					const posVel = satellite.propagate(sat.satrec, currentTime);
					const posEci = posVel.position as satellite.EciVec3<number>;
					if (!posEci) return;
					const geo = satellite.eciToGeodetic(posEci, gmst);
					sat.currentLatRad = geo.latitude;
					sat.currentLonRad = geo.longitude;
					const r = EARTH_RADIUS_SCENE + geo.height / SCALE_FACTOR;
					const x = r * Math.cos(geo.latitude) * Math.cos(geo.longitude);
					const y = r * Math.sin(geo.latitude);
					const z = -r * Math.cos(geo.latitude) * Math.sin(geo.longitude);
					sat.mesh.position.set(x, y, z);
					let targetColor = sat.defaultColor;
					if (isHazardCondition && Math.abs(geo.latitude) > highLatitudeThresholdRad) {
						targetColor = HAZARD_COLOR;
					}
					const material = sat.mesh.material as THREE.MeshBasicMaterial;
					if (material?.color && material.color.getHex() !== targetColor) {
						material.color.setHex(targetColor);
					}
				} catch (error: any) {
					if (error.message && error.message.toLowerCase().includes('decay')) {
						if (sat.mesh.visible || sat.isVisible)
							console.warn(`Satellite ${sat.name} (ID: ${sat.satrec.satnum}) likely decayed.`);
						sat.mesh.visible = false;
						if (sat.trackLine) sat.trackLine.visible = false;
						sat.isVisible = false;
					} else {
						console.error(`Error propagating satellite ${sat.name}:`, error);
						sat.mesh.visible = false;
						if (sat.trackLine) sat.trackLine.visible = false;
						sat.isVisible = false;
					}
				}
			});
		}

		function animate() {
			if (!isMounted || !rendererInstance || !sceneInstance || !cameraInstance) {
				if (animationFrameId) cancelAnimationFrame(animationFrameId);
				animationFrameId = 0;
				return;
			}
			animationFrameId = requestAnimationFrame(animate);
			applyFilters(localSatelliteObjects, currentOrbitFilter, currentTypeFilter);
			updateSatellitePositions(new Date());
			controlsInstance?.update();
			if (hoveredSatelliteName && container && cameraInstance) {
				const satObject = localSatelliteObjects.find((s) => s.name === hoveredSatelliteName);
				if (satObject?.isVisible && satObject.mesh.visible) {
					labelPositionVector.copy(satObject.mesh.position);
					labelPositionVector.project(cameraInstance);
					if (labelPositionVector.z < 1) {
						const sx = ((labelPositionVector.x + 1) / 2) * container.clientWidth;
						const sy = ((-labelPositionVector.y + 1) / 2) * container.clientHeight;
						labelInfo = { name: hoveredSatelliteName, x: sx, y: sy };
					} else {
						labelInfo = null;
					}
				} else {
					labelInfo = null;
				}
			} else {
				labelInfo = null;
			}
			rendererInstance.render(sceneInstance, cameraInstance);
		}

		function handleResize() {
			if (!isMounted || !container || !rendererInstance || !cameraInstance) return;
			const width = container.clientWidth;
			const height = container.clientHeight;
			if (width > 0 && height > 0) {
				cameraInstance.aspect = width / height;
				cameraInstance.updateProjectionMatrix();
				rendererInstance.setSize(width, height);
			}
		}

		function onMouseMove(event: MouseEvent) {
			if (!isMounted || !container || !cameraInstance) return;
			const rect = container.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouse, cameraInstance);
			const visibleMeshes = localSatelliteMeshes.filter((m) => m.visible);
			const intersects = raycaster.intersectObjects(visibleMeshes);
			if (intersects.length > 0 && intersects[0].object instanceof THREE.Mesh) {
				const mesh = intersects[0].object;
				const sat = localSatelliteObjects.find((s) => s.mesh === mesh);
				hoveredSatelliteName = sat ? sat.name : null;
			} else {
				hoveredSatelliteName = null;
			}
		}

		function onMouseLeave() {
			hoveredSatelliteName = null;
			labelInfo = null;
		}

		function onClick(event: MouseEvent) {
			if (!isMounted || !container || !cameraInstance) return;
			const rect = container.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouse, cameraInstance);
			const visibleMeshes = localSatelliteMeshes.filter((m) => m.visible);
			const intersects = raycaster.intersectObjects(visibleMeshes);
			if (intersects.length > 0 && intersects[0].object instanceof THREE.Mesh) {
				const mesh = intersects[0].object;
				const clickedSat = localSatelliteObjects.find((s) => s.mesh === mesh);
				if (clickedSat) {
					console.log('[SatelliteGlobe] Satellite clicked:', clickedSat.name);
					dispatch('satelliteclick', { ...clickedSat });
				}
			}
		}

		function handleFullscreenChange() {
			const doc = document as Document & {
				webkitFullscreenElement?: Element;
				mozFullScreenElement?: Element;
				msFullscreenElement?: Element;
			};
			isFullscreen = !!(
				doc.fullscreenElement === uiContainer ||
				doc.webkitFullscreenElement === uiContainer ||
				doc.mozFullScreenElement === uiContainer ||
				doc.msFullscreenElement === uiContainer
			);
			console.log('[SatelliteGlobe] Fullscreen state changed:', isFullscreen);
			setTimeout(handleResize, 150);
		}

		const init = async () => {
			try {
				const fetchedTLEs = await loadTLEData();
				if (!isMounted || !container) return;
				if (fetchedTLEs.length === 0 && !tleError) {
					console.warn('[SatelliteGlobe] No TLE data loaded or parsed.');
					tleError = 'No satellite data available.';
				}
				if (tleError) {
					isLoadingTLE = false;
					return;
				}

				sceneInstance = new THREE.Scene();
				cameraInstance = new THREE.PerspectiveCamera(
					75,
					container.clientWidth / container.clientHeight,
					0.1,
					1000
				);
				cameraInstance.position.z = EARTH_RADIUS_SCENE * 3;
				rendererInstance = new THREE.WebGLRenderer({
					antialias: true,
					powerPreference: 'high-performance'
				});
				rendererInstance.setSize(container.clientWidth, container.clientHeight);
				rendererInstance.setPixelRatio(window.devicePixelRatio);
				while (container.firstChild) {
					container.removeChild(container.firstChild);
				}
				container.appendChild(rendererInstance.domElement);
				const ambientLight = new THREE.AmbientLight(0x808080);
				sceneInstance.add(ambientLight);
				const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
				directionalLight.position.set(5, 5, 5);
				sceneInstance.add(directionalLight);
				const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS_SCENE, 64, 32);
				const textureLoader = new THREE.TextureLoader();
				const earthMaterial = new THREE.MeshPhongMaterial({
					map: textureLoader.load('/textures/earth_daymap.jpg', undefined, undefined, (err) => {
						console.error('FATAL: Failed to load earth texture!', err);
						if (isMounted) tleError = 'Critical Error: Could not load Earth texture.';
						isLoadingTLE = false;
					}),
					specular: 0x111111,
					shininess: 5
				});
				const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
				sceneInstance.add(earthMesh);
				controlsInstance = new OrbitControls(cameraInstance, rendererInstance.domElement);
				controlsInstance.enableDamping = true;
				controlsInstance.dampingFactor = 0.05;
				controlsInstance.minDistance = EARTH_RADIUS_SCENE * 1.1;
				controlsInstance.maxDistance = EARTH_RADIUS_SCENE * 15;
				controlsInstance.rotateSpeed = 0.5;
				controlsInstance.zoomSpeed = 0.8;
				controlsInstance.panSpeed = 0.5;

				localSatelliteObjects = [];
				localSatelliteMeshes = [];
				const initializationTime = new Date();
				fetchedTLEs.forEach((tle) => {
					try {
						// --- ADDED GUARD for Runtime Error ---
						if (
							!tle ||
							typeof tle.name !== 'string' ||
							typeof tle.tle1 !== 'string' ||
							typeof tle.tle2 !== 'string'
						) {
							console.warn('[SatelliteGlobe Init] Skipping invalid/incomplete TLE entry:', tle);
							return; // Skip this iteration
						}
						// --- END GUARD ---

						const satrec = satellite.twoline2satrec(tle.tle1, tle.tle2);
						const satGeometry = new THREE.SphereGeometry(0.08, 6, 6);
						const satColor = tle.name.includes('ISS') ? DEFAULT_COLOR_ISS : DEFAULT_COLOR_OTHER;
						const satMaterial = new THREE.MeshBasicMaterial({
							color: satColor,
							transparent: true,
							opacity: 1
						});
						const satMesh = new THREE.Mesh(satGeometry, satMaterial);
						const noradId = tle.tle1.substring(2, 7).trim();
						const details = getSatelliteDetails(noradId);
						const orbitType = classifyOrbit(satrec);
						let trackLine: THREE.Line | undefined;
						const trackPoints = calculateTrackPoints(satrec, initializationTime);
						if (trackPoints.length > 1 && sceneInstance) {
							const trackGeometry = new THREE.BufferGeometry().setFromPoints(trackPoints);
							const trackMaterial = new THREE.LineBasicMaterial({
								color: TRACK_COLOR,
								transparent: true,
								opacity: 0.4
							});
							trackLine = new THREE.Line(trackGeometry, trackMaterial);
							sceneInstance.add(trackLine);
						}
						localSatelliteObjects.push({
							name: tle.name,
							satrec,
							mesh: satMesh,
							defaultColor: satColor,
							trackLine: trackLine,
							details: details,
							orbitType: orbitType,
							isVisible: true
						});
						localSatelliteMeshes.push(satMesh);
						sceneInstance?.add(satMesh);
					} catch (e) {
						console.error(`Error initializing satellite ${tle?.name || 'UNKNOWN'}:`, e);
					}
				});
				applyFilters(localSatelliteObjects, currentOrbitFilter, currentTypeFilter);
				isLoadingTLE = false;
				console.log('[SatelliteGlobe] Initialization complete. Starting animation loop.');
				animate();
				window.addEventListener('resize', handleResize);
				container.addEventListener('mousemove', onMouseMove);
				container.addEventListener('mouseleave', onMouseLeave);
				container.addEventListener('click', onClick);
				document.addEventListener('fullscreenchange', handleFullscreenChange);
				document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
				document.addEventListener('mozfullscreenchange', handleFullscreenChange);
				document.addEventListener('MSFullscreenChange', handleFullscreenChange);
			} catch (error) {
				console.error('[SatelliteGlobe] Initialization failed:', error);
				if (!tleError) tleError = 'Failed to initialize 3D scene due to an unexpected error.';
				isLoadingTLE = false;
			}
		};

		init();

		const cleanup = () => {
			isMounted = false;
			console.log('[SatelliteGlobe] Cleanup: Component destroying...');
			if (animationFrameId) cancelAnimationFrame(animationFrameId);
			window.removeEventListener('resize', handleResize);
			if (container) {
				container.removeEventListener('mousemove', onMouseMove);
				container.removeEventListener('mouseleave', onMouseLeave);
				container.removeEventListener('click', onClick);
			}
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
			document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
			controlsInstance?.dispose();
			sceneInstance?.traverse((object) => disposeObject(object));
			sceneInstance?.clear();
			rendererInstance?.dispose();
			if (container && rendererInstance?.domElement?.parentNode === container) {
				container.removeChild(rendererInstance.domElement);
			}
			console.log('[SatelliteGlobe] Cleanup complete.');
			rendererInstance = null;
			sceneInstance = null;
			cameraInstance = null;
			controlsInstance = null;
			localSatelliteObjects = [];
			localSatelliteMeshes = [];
		};
		return cleanup;
	}); // End of onMount
</script>

<!-- HTML Structure -->
<div bind:this={uiContainer} class="relative h-full w-full bg-black">
	<!-- Inner container for Three.js canvas - MODIFIED FOR A11Y -->
	<div
		bind:this={container}
		class="absolute inset-0 z-0 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
		aria-label="Interactive satellite globe"
		role="application"
		tabindex="0"
		on:keydown={handleContainerKeydown}
		aria-hidden="false"
	>
		<!-- Canvas is appended here -->
	</div>

	<!-- Hover Label -->
	{#if labelInfo}
		<div
			class="pointer-events-none absolute whitespace-nowrap rounded bg-black bg-opacity-70 px-2 py-1 text-xs text-white shadow-lg"
			style:left="{labelInfo.x}px"
			style:top="{labelInfo.y}px"
			style="transform: translate(-50%, -130%); z-index: 30;"
		>
			{labelInfo.name}
		</div>
	{/if}

	<!-- Filter Component -->
	<div class="absolute left-4 top-4 z-20 opacity-90 transition-opacity hover:opacity-100">
		<SatelliteFilter on:filterchange={handleFilterUpdateFromComponent} />
	</div>

	<!-- Fullscreen Button -->
	{#if !isLoadingTLE && !tleError}
		<button
			on:click={toggleFullscreen}
			class="absolute bottom-3 right-3 z-20 rounded-md bg-black bg-opacity-40 p-1.5 text-white ring-offset-1 ring-offset-black hover:bg-opacity-60 focus:outline-none focus:ring-2 focus:ring-white"
			aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
			title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
		>
			{#if isFullscreen}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
					class="h-4 w-4"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
					/>
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
					class="h-4 w-4"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m4.5 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15"
					/>
				</svg>
			{/if}
		</button>
	{/if}

	<!-- Loading Indicator Overlay -->
	{#if isLoadingTLE}
		<div
			class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-80 text-white"
		>
			<svg
				class="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			Loading Satellite Data...
		</div>
	{/if}

	<!-- Error Message Overlay -->
	{#if !isLoadingTLE && tleError}
		<div
			class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-red-800 bg-opacity-90 p-4 text-center text-white"
		>
			<strong class="mr-2">Error:</strong>
			{tleError}
		</div>
	{/if}
</div>

<!-- Scoped Styles -->
<style>
	div[bind\:this] {
		width: 100%;
		height: 100%;
		display: block;
	}
	div[bind\:this] :global(canvas) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.absolute {
		position: absolute;
	}
</style>
