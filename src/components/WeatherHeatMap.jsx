import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaTemperatureHigh } from "react-icons/fa";
import { WiHumidity } from "react-icons/wi";
import { GiBadBreath } from "react-icons/gi";
import { FaVirusCovid } from "react-icons/fa6";
import { PiWindmillDuotone } from "react-icons/pi";
import { FaWind } from "react-icons/fa";
// Dummy location mapping
const DEVICE_LOCATIONS = {
  '641beb5f32efde72b1c87b2b': { lat: 37.5665, lng: 126.9780 },
  // Add more device coordinates if needed
};
function CustomCanvasOverlay({ points }) {
  const map = useMap();
  useEffect(() => {
    const canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-canvas');
    const overlayPane = map.getPane('overlayPane');
    overlayPane.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    const updateCanvasSize = () => {
      const bounds = map.getSize();
      canvas.width = bounds.x;
      canvas.height = bounds.y;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.zIndex = 100000;
      canvas.style.pointerEvents = 'none';
    };
    const draw = () => {
      updateCanvasSize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = Date.now() / 400;
      const mapOrigin = map.getPixelOrigin();
      for (const p of points) {
        const { lat, lng, intensity } = p;
        const point = map.project([lat, lng], map.getZoom()).subtract(mapOrigin);
        const baseRadius = 180 + 20 * Math.sin(time + lat); // larger radius
        const radius = baseRadius * intensity;
        const grd = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, radius
        );
        // Vivid fire-to-rainbow
        grd.addColorStop(0.2, 'rgba(255, 0, 0, 0.95)');
        grd.addColorStop(0.4, 'rgba(255, 165, 0, 0.85)');
        grd.addColorStop(0.5, 'rgba(255, 255, 0, 0.75)');
        grd.addColorStop(0.7, 'rgba(0, 255, 0, 0.6)');
        grd.addColorStop(0.85, 'rgba(0, 0, 255, 0.2)');
        grd.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.fillStyle = grd;
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();
    const invalidate = () => {
      updateCanvasSize();
    };
    map.on('move resize zoom', invalidate);
    return () => {
      cancelAnimationFrame(animationFrameId);
      map.off('move resize zoom', invalidate);
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [map, points]);
  return null;
}
export default function LiquidHeatmapFromAPI() {
  const [heatPoints, setHeatPoints] = useState([]);
  const [sensorData, setSensorData] = useState([]);

  
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('http://localhost:4000/api/datalogs');
        const data = await res.json();
        console.log('Fetched sensor data:', data);
        setSensorData(data);
        const points = data
          .map((entry) => {
            const loc = DEVICE_LOCATIONS[entry.deviceId];
            if (!loc) return null;
            const intensity = Math.min(entry['pm2.5'] / 100, 1);
            return {
              lat: loc.lat,
              lng: loc.lng,
              intensity,
            };
          })
          .filter(Boolean);
        setHeatPoints(points);
      } catch (err) {
        console.error('Failed to fetch sensor data:', err);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  console.log(sensorData)

  return (
    <div className='w-screen h-full flex justify-center items-center relative'>
      <div className='py-5 px-4 rounded-lg bg-primary opacity-85 text-white absolute top-5 left-2 z-50 backdrop-blur-md text-xl font-pretendard'>Environment Conditions</div>
      {sensorData  && sensorData.map((data,) => (
        <div className='w-3/12 absolute top-5 right-2 z-50 bg-opacity-25 bg-white backdrop-blur-md rounded-md py-5 px-4 shadow-xl flex flex-wrap items-center justify-center'>
          <div className="w-1/2 flex flex-col items-center mt-2">
            <FaTemperatureHigh className='text-5xl text-red-500' />
            <span className='font-bold mt-2 '>Temperature : <span className='text-red-500'>{data.temperature} °C</span></span>
          </div>
          <div className="w-1/2 flex flex-col items-center mt-2">
            <WiHumidity className='text-5xl text-blue-500' />
            <span className='font-bold mt-2'>Humidity : <span className='text-blue-500'>{data.humidity}</span></span>
          </div>
          <div className="w-1/2 flex flex-col items-center mt-2">
            <GiBadBreath className='text-5xl text-green-500' />
            <span className='font-bold mt-2'>pm10 : <span className='text-green-500'>{data.pm10}</span></span>
          </div>
          <div className="w-1/2 flex flex-col items-center mt-2">
            <FaVirusCovid className='text-5xl text-purple-500' />
            <span className='font-bold mt-2'>voc : <span className='text-purple-500'>{data.voc}</span></span>
          </div>
          <div className="w-1/2 flex flex-col items-center mt-2">
            <PiWindmillDuotone className='text-5xl text-yellow-300' />
            <span className='font-bold mt-2'>Wind Angle : <span className='text-yellow-300'>{data.windangle}</span></span>
          </div>
          <div className="w-1/2 flex flex-col items-center mt-2">
            <FaWind className='text-5xl text-gray-500' />
            <span className='font-bold mt-2'>Wind Speed : <span className='text-white'>{data.windspeed}</span></span>
          </div>
          
        </div>))}
    <MapContainer
      center={[37.5665, 126.9780]}
      zoom={8}
      minZoom={2.5}
      maxZoom={18}
      style={{ height: "100vh", width: "100%" }}
      className="z-0 w-screen h-full" zoomControl={false}
      trackResize={true}
      attributionControl={false}
      // maxBounds={[[-85, -180], [85, 180]]}
      maxBounds={[[-85, -180], [85, 180]]}
      maxBoundsViscosity={1.0}
      worldCopyJump={false} // enables world map repetition when panning
      continuousWorld={false} // allows smooth wrap-around
    >
      <TileLayer
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        attribution='&copy; OpenStreetMap contributors'
      />
      <CustomCanvasOverlay points={heatPoints} />
    </MapContainer>
    </div>
  );
}