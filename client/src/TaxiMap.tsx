import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from './api';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface TaxiLocation {
  id: number;
  taxiId: number;
  latitude: number;
  longitude: number;
  recordedAt: string;
}

function FitBoundsToRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
}

function TaxiMap() {
  const [selectedTaxiId, setSelectedTaxiId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const { data: taxis, isLoading, error } = useQuery<TaxiLocation[]>({
    queryKey: ['taxis-latest'],
    queryFn: async () => {
      const response = await api.get('/trajectories/latest');
      return response.data;
    },
  });

  const { data: route } = useQuery<TaxiLocation[]>({
    queryKey: ['trajectory', selectedTaxiId],
    queryFn: async () => {
      const response = await api.get(`/trajectories/${selectedTaxiId}`);
      return response.data;
    },
    enabled: selectedTaxiId !== null,
  });

  if (isLoading) return <p style={{ padding: '2rem', color: '#e5e1e4' }}>Cargando flota...</p>;
  if (error) return <p style={{ padding: '2rem', color: '#e5e1e4' }}>Error al cargar los taxis 😕</p>;

  const center: [number, number] = [39.9, 116.4];
  const routePositions: [number, number][] =
    route?.map((point) => [point.longitude, point.latitude]) ?? [];

  const selectedTaxi = taxis?.find((t) => t.taxiId === selectedTaxiId);

  const filteredTaxis = taxis?.filter((t) =>
    t.taxiId.toString().includes(search.trim())
  );

  return (
    <div className="dashboard-layout">
      {/* Barra lateral */}
      <div
        className="sidebar glass-panel"
        style={{
          padding: '1.5rem 1.2rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(86,67,52,0.3)',
        }}
      >
        {/* Header de la marca */}
        <div style={{ marginBottom: '1.5rem',textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              background: 'linear-gradient(90deg, #60a5fa, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
            }}
          >
            🚕 Fleet Command
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
            High-Performance Fleet · Beijing
          </p>
        </div>

        {/* Buscador (filtra por ID real) */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por # de taxi..."
          style={{
            width: '100%',
            padding: '0.6rem 0.9rem',
            marginBottom: '1.2rem',
            borderRadius: '6px',
            border: '1px solid rgba(86,67,52,0.4)',
            background: 'rgba(53,52,55,0.4)',
            color: '#e5e1e4',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />

        <p
          className="mono"
          style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.8rem' }}
        >
          Unidades ({filteredTaxis?.length ?? 0})
        </p>

        {/* Lista de taxis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {filteredTaxis?.map((taxi) => (
            <div
              key={taxi.taxiId}
              onClick={() => setSelectedTaxiId(taxi.taxiId)}
              className={`taxi-item ${selectedTaxiId === taxi.taxiId ? 'selected' : ''}`}
              style={{ padding: '0.7rem 0.9rem', borderRadius: '6px' }}
            >
              <span
                className={selectedTaxiId === taxi.taxiId ? 'pulse-dot' : ''}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: selectedTaxiId === taxi.taxiId ? '#c084fc' : '#4b5563',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: selectedTaxiId === taxi.taxiId ? 700 : 500 }}>
                Taxi #{taxi.taxiId}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mapa */}
      <div className="map-container">
        <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {taxis?.map((taxi) => (
            <Marker
              key={taxi.taxiId}
              position={[taxi.longitude, taxi.latitude]}
              eventHandlers={{ click: () => setSelectedTaxiId(taxi.taxiId) }}
            >
              <Popup>
                Taxi #{taxi.taxiId}<br />
                Última actualización: {new Date(taxi.recordedAt).toLocaleString()}
              </Popup>
            </Marker>
          ))}
          {routePositions.length > 0 && (
            <Polyline positions={routePositions} color="#c084fc" weight={3} />
          )}
          <FitBoundsToRoute positions={routePositions} />
        </MapContainer>

        {/* Tarjeta flotante de detalle (datos REALES del taxi seleccionado) */}
        {selectedTaxi && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              bottom: '24px',
              left: '24px',
              width: '280px',
              borderRadius: '12px',
              padding: '1.2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              zIndex: 1000,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c084fc' }} />
                  <span className="mono" style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    En línea
                  </span>
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Taxi #{selectedTaxi.taxiId}</h3>
              </div>
              <button
                onClick={() => setSelectedTaxiId(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <Row label="Latitud" value={selectedTaxi.longitude.toFixed(5)} />
              <Row label="Longitud" value={selectedTaxi.latitude.toFixed(5)} />
              <Row label="Última señal" value={new Date(selectedTaxi.recordedAt).toLocaleString()} />
              <Row label="Puntos de ruta" value={`${route?.length ?? '...'}`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(86,67,52,0.2)' }}>
      <span style={{ color: '#9ca3af' }}>{label}</span>
      <span className="mono" style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default TaxiMap;