// src/lib/types/index.ts
import type { LatLngExpression } from 'leaflet';

export interface Coordinates {
    latitude: number;
    longitude: number;
}

// Тип для ответа от API wheretheiss.at
export interface IssPosition {
    name: string;
    id: number;
    latitude: number;
    longitude: number;
    altitude: number;
    velocity: number;
    visibility: 'eclipsed' | 'daylight';
    footprint: number;
    timestamp: number;
    daynum: number;
    solar_lat: number;
    solar_lon: number;
    units: string;
}

// Можно добавить другие типы по мере необходимости