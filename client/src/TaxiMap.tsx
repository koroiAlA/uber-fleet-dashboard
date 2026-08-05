import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "./api";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
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
// Componente auxiliar: mueve el mapa automáticamente hacia la ruta seleccionada
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

  // Últimas ubicaciones (para los pines)
  const { data: taxis, isLoading, error } = useQuery<TaxiLocation[]>({
    queryKey: ["taxis-latest"],
    queryFn: async () => {
      const response = await api.get("/trajectories/latest");
      return response.data;
    },
  });

  // Recorrido completo del taxi seleccionado
  const { data: route } = useQuery<TaxiLocation[]>({
    queryKey: ["trajectory", selectedTaxiId],
    queryFn: async () => {
      const response = await api.get(`/trajectories/${selectedTaxiId}`);
      return response.data;
    },
    enabled: selectedTaxiId !== null, // solo se ejecuta si hay un taxi seleccionado
  });

  if (isLoading) return <p>Cargando taxis...</p>;
  if (error) return <p>Error al cargar los taxis 😕</p>;

  const center: [number, number] = [39.9, 116.4];
  const routePositions: [number, number][] =
    route?.map((point) => [point.longitude, point.latitude]) ?? [];

  return (
    <div className="dashboard-layout">
      {/* Barra lateral */}
      <div
        className="sidebar"
        style={{
          padding: "1.2rem",
          overflowY: "auto",
          background: "linear-gradient(180deg, #0f0f14, #1a1a24)",
          color: "#eee",
          borderRight: "1px solid #2a2a35",
        }}
      >
        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            marginBottom: "1.5rem",
            background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px",
            textAlign: "center",
          }}
        >
          🚕 Flota ({taxis?.length})
        </h2>
        {taxis?.map((taxi) => (
          <div
            key={taxi.taxiId}
            onClick={() => setSelectedTaxiId(taxi.taxiId)}
            className={`taxi-item ${
              selectedTaxiId === taxi.taxiId ? "selected" : ""
            }`}
            style={{
              padding: "0.7rem 0.9rem",
              marginBottom: "0.5rem",
              borderRadius: "8px",
              background:
                selectedTaxiId === taxi.taxiId ? undefined : "#1a1a24",
              fontWeight: selectedTaxiId === taxi.taxiId ? 600 : 400,
            }}
          >
            🚖 Taxi #{taxi.taxiId}
          </div>
        ))}
      </div>

      {/* Mapa */}
      <div className="map-container">
        <MapContainer
          center={center}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {taxis?.map((taxi) => (
            <Marker
              key={taxi.taxiId}
              position={[taxi.longitude, taxi.latitude]}
              eventHandlers={{ click: () => setSelectedTaxiId(taxi.taxiId) }}
            >
              <Popup>
                Taxi #{taxi.taxiId}
                <br />
                Última actualización:{" "}
                {new Date(taxi.recordedAt).toLocaleString()}
              </Popup>
            </Marker>
          ))}
          {routePositions.length > 0 && (
            <Polyline positions={routePositions} color="#2563eb" weight={3} />
          )}
          {routePositions.length > 0 && (
            <Polyline positions={routePositions} color="#2563eb" weight={3} />
          )}
          <FitBoundsToRoute positions={routePositions} />
        </MapContainer>
      </div>
    </div>
  );
}

export default TaxiMap;
