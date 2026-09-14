const map = L.map('map').setView([-2.5489, 118.0149], 5);

const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' });
const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '&copy; OpenTopoMap' });

standardLayer.addTo(map);

let earthquakeLayer = L.layerGroup().addTo(map);
let tsunamiZoneLayer = L.layerGroup().addTo(map);
let shelterLayer = L.layerGroup().addTo(map);
let userLayer = L.layerGroup().addTo(map);

const safeShelters = [
    { name: "Shelter Gedung Tinggi A", lat: -6.1754, lng: 106.8272, elev: "+15m", status: "Aman" },
    { name: "Bukit Evakuasi B", lat: -6.5971, lng: 106.7996, elev: "+30m", status: "Aman" },
    { name: "Gedung Parkir Sentral C", lat: -6.2146, lng: 106.8451, elev: "+20m", status: "Penuh" }
];

let currentUserLat = null;
let currentUserLng = null;
let currentEqLat = null;
let currentEqLng = null;

const translations = {
    id: {
        title: "GeoSafe - Sistem Peringatan Dini & Evakuasi Bencana",
        headerMain: "⚠️ GeoSafe Tsunami Early Warning System",
        headerSub: "Sistem Pemantauan Gempa, Zona Tsunami, dan Jalur Evakuasi Aman",
        sosTitle: "🚨 Darurat & Kirim Koordinat",
        btnCall: "📞 Darurat (112)",
        btnShare: "📍 Bagikan Lokasi Saya",
        eqCard: "Status Gempa Terkini",
        refresh: "🔄 Segarkan",
        labelLoc: "Lokasi:",
        labelMag: "Magnitudo:",
        labelDepth: "Kedalaman:",
        labelStatus: "Potensi Tsunami:",
        tsuCard: "Estimasi Waktu Gelombang (ETA)",
        etaDesc: "Perhitungan jarak dari pusat gempa ke posisi Anda.",
        weatherCard: "🌤️ Kondisi Cuaca & Risiko Evakuasi",
        guideCard: "🛡️ Panduan Saat Gempa Terjadi",
        guideText: "1. <strong>Merunduk (Drop):</strong> Turunkan tubuh ke lantai.<br>2. <strong>Lindungi (Cover):</strong> Berlindung di bawah meja.<br>3. <strong>Pegang (Hold On):</strong> Pegangan pada kaki meja.",
        shelterCard: "Rekomendasi Titik Aman Terdekat",
        aftershockCard: "📉 Riwayat Gempa Susulan (24 Jam)",
        footerText: "&copy; 2026 GeoSafe App. Didukung oleh Data BMKG Real-Time & OpenStreetMap.",
        navBtn: "🗺️ Rute Google Maps"
    },
    en: {
        title: "GeoSafe - Early Warning & Disaster Evacuation System",
        headerMain: "⚠️ GeoSafe Tsunami Early Warning System",
        headerSub: "Earthquake Monitoring, Tsunami Zone, and Safe Evacuation Routes",
        sosTitle: "🚨 Emergency & Share Coordinates",
        btnCall: "📞 Emergency (112)",
        btnShare: "📍 Share My Location",
        eqCard: "Latest Earthquake Status",
        refresh: "🔄 Refresh",
        labelLoc: "Location:",
        labelMag: "Magnitude:",
        labelDepth: "Depth:",
        labelStatus: "Tsunami Potential:",
        tsuCard: "Wave Arrival Time Estimation (ETA)",
        etaDesc: "Distance calculation from epicenter to your position.",
        weatherCard: "🌤️ Weather Conditions & Evacuation Risks",
        guideCard: "🛡️ Earthquake Safety Guide",
        guideText: "1. <strong>Drop:</strong> Get down on the floor.<br>2. <strong>Cover:</strong> Take shelter under a sturdy table.<br>3. <strong>Hold On:</strong> Hold onto the furniture.",
        shelterCard: "Nearest Safe Shelters",
        aftershockCard: "📉 Aftershock History (24 Hours)",
        footerText: "&copy; 2026 GeoSafe App. Powered by BMKG Real-Time Data & OpenStreetMap.",
        navBtn: "🗺️ Google Maps Route"
    }
};

let currentLang = 'id';

function switchLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];
    document.getElementById('app-title').innerText = t.title;
    document.getElementById('header-main-title').innerText = t.headerMain;
    document.getElementById('header-sub-title').innerText = t.headerSub;
    document.getElementById('sos-title').innerText = t.sosTitle;
    document.getElementById('btn-call-112').innerText = t.btnCall;
    document.getElementById('btn-share-loc').innerText = t.btnShare;
    document.getElementById('eq-card-title').innerText = t.eqCard;
    document.getElementById('refresh-btn').innerText = t.refresh;
    document.getElementById('label-loc').innerText = t.labelLoc;
    document.getElementById('label-mag').innerText = t.labelMag;
    document.getElementById('label-depth').innerText = t.labelDepth;
    document.getElementById('label-status').innerText = t.labelStatus;
    document.getElementById('tsu-card-title').innerText = t.tsuCard;
    document.getElementById('eta-desc').innerText = t.etaDesc;
    document.getElementById('weather-card-title').innerText = t.weatherCard;
    document.getElementById('guide-card-title').innerText = t.guideCard;
    document.getElementById('guide-list-content').innerHTML = `<li>${t.guideText}</li>`;
    document.getElementById('shelter-card-title').innerText = t.shelterCard;
    document.getElementById('aftershock-card-title').innerText = t.aftershockCard;
    document.getElementById('footer-text').innerHTML = t.footerText;
}

function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('theme-toggle');
    if (body.classList.contains('light-mode')) {
        body.classList.replace('light-mode', 'dark-mode');
        btn.innerText = "☀️";
        map.removeLayer(standardLayer);
        topoLayer.addTo(map);
    } else {
        body.classList.replace('dark-mode', 'light-mode');
        btn.innerText = "🌙";
        map.removeLayer(topoLayer);
        standardLayer.addTo(map);
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function calculateTsunamiETA(eqLat, eqLng, userLat, userLng) {
    if (!eqLat || !userLat) return;
    const distKm = calculateDistance(eqLat, eqLng, userLat, userLng);
    const tsunamiSpeedKmH = 700; 
    const timeHours = distKm / tsunamiSpeedKmH;
    const timeMinutes = Math.round(timeHours * 60);

    const etaEl = document.getElementById('tsunami-eta');
    if (timeMinutes <= 1) {
        etaEl.innerText = currentLang === 'id' ? "< 1 Menit" : "< 1 Minute";
    } else {
        etaEl.innerText = `~${timeMinutes} ${currentLang === 'id' ? 'Menit' : 'Minutes'}`;
    }
}

function shareSosLocation() {
    if (currentUserLat && currentUserLng) {
        const text = currentLang === 'id' 
            ? `🚨 DARURAT / EMERGENCY!\nSaya butuh evakuasi segera akibat gempa.\nLokasi saya: https://www.google.com/maps?q=${currentUserLat},${currentUserLng}`
            : `🚨 EMERGENCY!\nI need immediate evacuation due to the earthquake.\nMy location: https://www.google.com/maps?q=${currentUserLat},${currentUserLng}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
        alert(currentLang === 'id' ? "GPS belum mendeteksi lokasi Anda." : "GPS has not detected your location yet.");
    }
}

async function fetchWeatherRisk(lat, lon) {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m`);
        const data = await response.json();
        
        const temp = data.current.temperature_2m;
        const precip = data.current.precipitation;
        const wind = data.current.wind_speed_10m;

        document.getElementById('w-temp').innerText = `${temp} °C (Angin: ${wind} km/h)`;
        
        const condEl = document.getElementById('w-cond');
        const riskEl = document.getElementById('w-risk');

        let condText = "Cerah / Normal";
        let isRisky = false;

        if (precip > 2.0) {
            condText = currentLang === 'id' ? "🌧️ Hujan Lebat Terdeteksi" : "🌧️ Heavy Rain Detected";
            isRisky = true;
        } else if (wind > 35) {
            condText = currentLang === 'id' ? "💨 Angin Kencang / Badai" : "💨 Strong Wind / Storm";
            isRisky = true;
        } else {
            condText = currentLang === 'id' ? "☀️ Kondisi Cuaca Stabil" : "☀️ Stable Weather Conditions";
        }

        condEl.innerText = condText;

        if (isRisky) {
            riskEl.innerText = currentLang === 'id' ? "⚠️ Waspada Risiko Longsor/Banjir Susulan!" : "⚠️ Warning: Landslide/Flood Risk!";
            riskEl.className = "status-danger";
        } else {
            riskEl.innerText = currentLang === 'id' ? "Aman untuk evakuasi" : "Safe for evacuation";
            riskEl.className = "status-safe";
        }

    } catch (error) {
        console.error("Gagal memuat data cuaca:", error);
        document.getElementById('w-cond').innerText = currentLang === 'id' ? "Gagal memuat cuaca" : "Failed to load weather";
    }
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentUserLat = position.coords.latitude;
                currentUserLng = position.coords.longitude;

                userLayer.clearLayers();
                const userIcon = L.divIcon({ className: 'custom-user-marker', html: '📍', iconSize: [30, 30] });

                L.marker([currentUserLat, currentUserLng], { icon: userIcon })
                    .bindPopup(currentLang === 'id' ? "<b>Lokasi Anda Saat Ini</b>" : "<b>Your Current Location</b>")
                    .addTo(userLayer)
                    .openPopup();

                map.setView([currentUserLat, currentUserLng], 12);
                updateSheltersWithDistance(currentUserLat, currentUserLng);
                if (currentEqLat) calculateTsunamiETA(currentEqLat, currentEqLng, currentUserLat, currentUserLng);
                
                fetchWeatherRisk(currentUserLat, currentUserLng);
            },
            (error) => { renderShelters(safeShelters); }
        );
    } else { renderShelters(safeShelters); }
}

function updateSheltersWithDistance(userLat, userLng) {
    const sheltersWithDist = safeShelters.map(shelter => {
        return { ...shelter, distance: calculateDistance(userLat, userLng, shelter.lat, shelter.lng) };
    });
    sheltersWithDist.sort((a, b) => a.distance - b.distance);

    const shelterListEl = document.getElementById('shelter-list');
    shelterListEl.innerHTML = '';
    shelterLayer.clearLayers();
    const t = translations[currentLang];

    sheltersWithDist.forEach((shelter, index) => {
        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}&travelmode=walking`;
        const isFull = shelter.status === "Penuh";

        const li = document.createElement('li');
        li.className = 'shelter-item';
        li.innerHTML = `
            <div class="shelter-info-text">
                ${index === 0 ? '⭐' : '🟢'} <strong>${shelter.name}</strong> 
                ${isFull ? '<span class="shelter-badge">PENUH</span>' : ''}<br>
                <small>Jarak: ${shelter.distance.toFixed(2)} km | Elevasi: ${shelter.elev}</small>
            </div>
            <a href="${gmapsUrl}" target="_blank" class="btn-nav">${t.navBtn}</a>
        `;
        shelterListEl.appendChild(li);

        const shelterIcon = L.divIcon({ className: 'custom-shelter-marker', html: isFull ? '🔴' : (index === 0 ? '⭐' : '🟢'), iconSize: [25, 25] });
        L.marker([shelter.lat, shelter.lng], { icon: shelterIcon })
            .bindPopup(`<b>${shelter.name}</b><br>Status: ${shelter.status}<br>Jarak: ${shelter.distance.toFixed(2)} km<br>Elevasi: ${shelter.elev}`)
            .addTo(shelterLayer);
    });
}

function renderShelters(shelters) {
    const shelterListEl = document.getElementById('shelter-list');
    shelterListEl.innerHTML = '';
    const t = translations[currentLang];
    shelters.forEach(shelter => {
        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}`;
        const li = document.createElement('li');
        li.className = 'shelter-item';
        li.innerHTML = `
            <div class="shelter-info-text">
                🟢 <strong>${shelter.name}</strong><br><small>Elevasi: ${shelter.elev}</small>
            </div>
            <a href="${gmapsUrl}" target="_blank" class="btn-nav">${t.navBtn}</a>
        `;
        shelterListEl.appendChild(li);
        L.marker([shelter.lat, shelter.lng]).bindPopup(`<b>${shelter.name}</b><br>Elevasi: ${shelter.elev}`).addTo(shelterLayer);
    });
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

function updateNetworkStatus() {
    const netEl = document.getElementById('network-status');
    if (navigator.onLine) {
        netEl.className = "net-online";
        netEl.innerText = "🟢 Online";
    } else {
        netEl.className = "net-offline";
        netEl.innerText = "🔴 Offline Mode";
    }
}

async function fetchBMKGEarthquake() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.innerText = "Memuat...";

    try {
        const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json'));
        const data = await response.json();
        
        const gempa = data.Infogempa.gempa;
        const wilayah = gempa.Wilayah;
        const magnitude = gempa.Magnitude;
        const kedalaman = gempa.Kedalaman;
        const potensi = gempa.Potensi;
        
        const koordinat = gempa.Coordinates.split(',');
        currentEqLat = parseFloat(koordinat[0]);
        currentEqLng = parseFloat(koordinat[1]);

        document.getElementById('eq-location').innerText = wilayah;
        document.getElementById('eq-mag').innerText = magnitude + " SR";
        document.getElementById('eq-depth').innerText = kedalaman;

        const statusEl = document.getElementById('eq-status');
        tsunamiZoneLayer.clearLayers();

        // Cek potensi tsunami dari BMKG (atau aktifkan simulasi gelombang berjalan jika ingin dicoba)
        const isTsunamiWarning = potensi.toLowerCase().includes("tsunami");

        if (isTsunamiWarning) {
            statusEl.innerText = currentLang === 'id' ? "BERPOTENSI TSUNAMI!" : "TSUNAMI WARNING!";
            statusEl.className = "status-danger";
        } else {
            statusEl.innerText = currentLang === 'id' ? "Tidak Berpotensi Tsunami" : "No Tsunami Threat";
            statusEl.className = "status-safe";
        }

        // Efek Animasi Gelombang Berjalan (Pulsing Wave) di titik pusat gempa
        const waveIcon = L.divIcon({
            className: 'custom-tsunami-wave',
            iconSize: [60, 60],
            iconAnchor: [30, 30]
        });
        L.marker([currentEqLat, currentEqLng], { icon: waveIcon }).addTo(tsunamiZoneLayer);

        // Lingkaran zona siaga
        L.circle([currentEqLat, currentEqLng], {
            color: isTsunamiWarning ? 'red' : '#3498db',
            fillColor: isTsunamiWarning ? '#f03' : '#3498db',
            fillOpacity: 0.2,
            radius: 40000
        }).addTo(tsunamiZoneLayer);

        earthquakeLayer.clearLayers();
        const eqIcon = L.divIcon({ className: 'custom-eq-marker', html: '🔴', iconSize: [35, 35] });

        L.marker([currentEqLat, currentEqLng], { icon: eqIcon })
            .bindPopup(`<b>Pusat Gempa BMKG</b><br>${wilayah}<br>Mag: ${magnitude} SR<br>Potensi: ${potensi}`)
            .addTo(earthquakeLayer)
            .openPopup();

        map.setView([currentEqLat, currentEqLng], 7);

        if (currentUserLat) {
            calculateTsunamiETA(currentEqLat, currentEqLng, currentUserLat, currentUserLng);
        }

        fetchAftershocks();

    } catch (error) {
        console.error("Gagal ambil data BMKG:", error);
        document.getElementById('eq-location').innerText = "Gagal memuat data live (Offline Cache).";
    } finally {
        if (refreshBtn) refreshBtn.innerText = translations[currentLang].refresh;
    }
}

async function fetchAftershocks() {
    try {
        const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson');
        const eqData = await res.json();
        const listEl = document.getElementById('aftershock-list');
        listEl.innerHTML = '';

        eqData.features.slice(0, 3).forEach(eq => {
            const p = document.createElement('p');
            const timeStr = new Date(eq.properties.time).toLocaleDateString(currentLang === 'id' ? 'id-ID' : 'en-US');
            p.innerHTML = `⚠️ <strong>M ${eq.properties.mag}</strong> - ${eq.properties.place} (${timeStr})`;
            listEl.appendChild(p);
        });
    } catch (e) {
        document.getElementById('aftershock-list').innerHTML = '<p class="sub-text">Riwayat gempa susulan tidak tersedia.</p>';
    }
}

fetchBMKGEarthquake();
getUserLocation();
updateNetworkStatus();
