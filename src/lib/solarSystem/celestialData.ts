// src/lib/solarSystem/celestialData.ts

// Интерфейс с orbitalRadius и orbitalSpeed
export interface CelestialBodyData {
	name: string;
	radius: number;
	textureFile: string;
	orbitalRadius: number; // Средний радиус орбиты (в единицах сцены)
	orbitalSpeed: number;  // Угловая скорость (радианы / условное "время")
    parentBody?: string;
	rotationSpeed: number;
	isStar?: boolean;
	ringData?: { innerRadius: number; outerRadius: number; textureFile: string };
    tilt?: number;
}

// Константы
export const SUN_RADIUS = 2;
export const BASE_PLANET_SIZE = 0.4;
export const BASE_ORBITAL_RADIUS = 5;
export const ORBITAL_RADIUS_STEP = 3;
export const BASE_ORBITAL_SPEED = 0.005;
export const BASE_ROTATION_SPEED = 0.01;

// Данные с параметрами симуляции
export const solarSystemData: CelestialBodyData[] = [
    { name: 'Sun', radius: SUN_RADIUS, textureFile: 'textures/sun.jpg', orbitalRadius: 0, orbitalSpeed: 0, rotationSpeed: BASE_ROTATION_SPEED * 0.1, isStar: true },
    { name: 'Mercury', radius: BASE_PLANET_SIZE * 0.38, textureFile: 'textures/mercury.jpg', orbitalRadius: BASE_ORBITAL_RADIUS + ORBITAL_RADIUS_STEP * 0, orbitalSpeed: BASE_ORBITAL_SPEED * 4.15, rotationSpeed: BASE_ROTATION_SPEED * 0.1 },
    { name: 'Venus', radius: BASE_PLANET_SIZE * 0.95, textureFile: 'textures/venus.jpg', orbitalRadius: BASE_ORBITAL_RADIUS + ORBITAL_RADIUS_STEP * 1, orbitalSpeed: BASE_ORBITAL_SPEED * 1.62, rotationSpeed: BASE_ROTATION_SPEED * -0.08 },
    { name: 'Earth', radius: BASE_PLANET_SIZE * 1.0, textureFile: 'textures/earth_day.jpg', orbitalRadius: BASE_ORBITAL_RADIUS + ORBITAL_RADIUS_STEP * 2, orbitalSpeed: BASE_ORBITAL_SPEED * 1.0, rotationSpeed: BASE_ROTATION_SPEED * 1.0, tilt: 0.41 },
    { name: 'Moon', radius: BASE_PLANET_SIZE * 0.27, textureFile: 'textures/moon.jpg', parentBody: 'Earth', orbitalRadius: 1.2, orbitalSpeed: BASE_ORBITAL_SPEED * 13.0, rotationSpeed: BASE_ROTATION_SPEED * 0.5 },
    { name: 'Mars', radius: BASE_PLANET_SIZE * 0.53, textureFile: 'textures/mars.jpg', orbitalRadius: BASE_ORBITAL_RADIUS + ORBITAL_RADIUS_STEP * 3, orbitalSpeed: BASE_ORBITAL_SPEED * 0.53, rotationSpeed: BASE_ROTATION_SPEED * 1.03 },
    { name: 'Jupiter', radius: BASE_PLANET_SIZE * 3.5, textureFile: 'textures/jupiter.jpg', orbitalRadius: BASE_ORBITAL_RADIUS + ORBITAL_RADIUS_STEP * 5, orbitalSpeed: BASE_ORBITAL_SPEED * 0.084, rotationSpeed: BASE_ROTATION_SPEED * 2.4 },
    { name: 'Saturn', radius: BASE_PLANET_SIZE * 3.0, textureFile: 'textures/saturn.jpg', orbitalRadius: BASE_ORBITAL_RADIUS + ORBITAL_RADIUS_STEP * 7, orbitalSpeed: BASE_ORBITAL_SPEED * 0.034, rotationSpeed: BASE_ROTATION_SPEED * 2.3, tilt: 0.47, ringData: { innerRadius: BASE_PLANET_SIZE * 3.0 * 1.1, outerRadius: BASE_PLANET_SIZE * 3.0 * 2.5, textureFile: 'textures/saturn_ring.png' }},
    { name: 'Uranus', radius: BASE_PLANET_SIZE * 1.5, textureFile: 'textures/uranus.jpg', orbitalRadius: BASE_ORBITAL_RADIUS + ORBITAL_RADIUS_STEP * 9, orbitalSpeed: BASE_ORBITAL_SPEED * 0.012, rotationSpeed: BASE_ROTATION_SPEED * -1.4, tilt: 1.7 },
    { name: 'Neptune', radius: BASE_PLANET_SIZE * 1.4, textureFile: 'textures/neptune.jpg', orbitalRadius: BASE_ORBITAL_RADIUS + ORBITAL_RADIUS_STEP * 11, orbitalSpeed: BASE_ORBITAL_SPEED * 0.006, rotationSpeed: BASE_ROTATION_SPEED * 1.5 }
];