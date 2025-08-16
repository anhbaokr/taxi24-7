"use strict";

const apiKey = "0dfb3c4c83ebea6ae11754971709ddea53";
let startCoords = null, endCoords = null;
const routeInfoDiv = document.getElementById('route-info');

// ==================== Khởi tạo Track-Asia Map ====================
const map = new trackasiagl.Map({
    container: "map",
    center: [105.854, 21.028],
    zoom: 12,
    minZoom: 1,
    maxZoom: 20,
    style: `https://maps.track-asia.vn/styles/v1/streets.json?key=${apiKey}`
});

map.addControl(new trackasiagl.NavigationControl(), 'bottom-right');
map.addControl(new trackasiagl.ScaleControl());
map.addControl(new trackasiagl.FullscreenControl(), 'top-right');

// ==================== GeolocateControl mặc định trên bản đồ ====================
const geolocateControl = new trackasiagl.GeolocateControl({ trackUserLocation: true });
map.addControl(geolocateControl, 'bottom-right');

geolocateControl.on('geolocate', async (event) => {
    const coords = [event.coords.longitude, event.coords.latitude];
    const label = await reverseGeocode(coords);
    selectStart(coords, label); // Ghim marker và điền input điểm đi
    map.flyTo({ center: coords, zoom: 14 });
});



// ==================== Setup TrackAsiaDirections Plugin ====================
const customStyles = [
    {
        'id': 'directions-route-line-alt',
        'type': 'line',
        'source': 'directions',
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint': { 'line-color': '#bbb', 'line-width': 5 },
        'filter': ['all', ['in', '$type', 'LineString'], ['in', 'route', 'alternate']]
    },
    {
        'id': 'directions-route-line-casing',
        'type': 'line',
        'source': 'directions',
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint': { 'line-color': '#2d5f99', 'line-width': 5 },
        'filter': ['all', ['in', '$type', 'LineString'], ['in', 'route', 'selected']]
    },
    {
        'id': 'directions-route-line',
        'type': 'line',
        'source': 'directions',
        'layout': { 'line-cap': 'round', 'line-join': 'round' },
        'paint': {
            'line-color': { 'property': 'congestion', 'type': 'categorical',
                            'default': '#4882c5',
                            'stops': [
                                ['unknown', '#4882c5'],
                                ['low', '#4882c5'],
                                ['moderate', '#f09a46'],
                                ['heavy', '#e34341'],
                                ['severe', '#8b2342']
                            ]},
            'line-width': 5
        },
        'filter': ['all', ['in', '$type', 'LineString'], ['in', 'route', 'selected']]
    }
];

const directions = new TrackAsiaDirections({
    api: 'https://maps.track-asia.com/route/v1/',
    apiKey: apiKey,
    unit: 'metric',
    profile: 'car',
    controls: {inputs: false, instructions: false},
    interactive: true,
    instructions: true,
    styles: customStyles
});
map.addControl(directions, 'top-left');

// Thay đổi style bản đồ từ menu
document.getElementById('style-select').addEventListener('change', (e) => {
    map.setStyle(e.target.value);
});

// ==================== Fit map to two points ====================
function fitMapToPoints() {
    if(startCoords && endCoords){
        const bounds = new trackasiagl.LngLatBounds();
        bounds.extend(startCoords);
        bounds.extend(endCoords);
        map.fitBounds(bounds, { padding: 80 });
    }
}

// ==================== Autocomplete ====================
function setupAutocomplete(inputId, suggestionsId, onSelect) {
    const input = document.getElementById(inputId);
    const suggestionsBox = document.getElementById(suggestionsId);

    input.addEventListener("input", async () => {
        const text = input.value.trim();
        if (text.length < 2) { suggestionsBox.innerHTML = ""; return; }

        try {
            const res = await fetch(`https://maps.track-asia.com/api/v1/autocomplete?lang=vi&size=5&text=${encodeURIComponent(text)}&key=${apiKey}`);
            const data = await res.json();
            suggestionsBox.innerHTML = "";
            if (data.features) {
                data.features.forEach(place => {
                    const div = document.createElement("div");
                    div.textContent = place.properties.label;
                    div.onclick = () => {
                        input.value = place.properties.label;
                        suggestionsBox.innerHTML = "";
                        onSelect(place.geometry.coordinates, place.properties.label);
                        fitMapToPoints();
                    };
                    suggestionsBox.appendChild(div);
                });
            }
        } catch {
            suggestionsBox.innerHTML = "<div style='color:red'>Không thể lấy gợi ý</div>";
        }
    });

    document.addEventListener("click", (e) => {
        if (!suggestionsBox.contains(e.target) && e.target !== input) suggestionsBox.innerHTML = "";
    });
}

// ==================== Reverse Geocode ====================
async function reverseGeocode(coords) {
    try {
        const res = await fetch(`https://maps.track-asia.com/api/v1/reverse?key=${apiKey}&point.lat=${coords[1]}&point.lon=${coords[0]}&lang=vi`);
        const data = await res.json();
        if (data.features && data.features.length > 0) return data.features[0].properties.label;
    } catch { }
    return `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`;
}

// ==================== Chọn Start / End ====================
let startMarker = null, endMarker = null;

function createCircleMarker(color, coords){
    const el = document.createElement('div');
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.backgroundColor = color;
    el.style.border = '3px solid white';
    el.style.borderRadius = '50%';
    el.style.boxSizing = 'border-box';
    return new trackasiagl.Marker({ element: el }).setLngLat(coords).addTo(map);
}

function selectStart(coords, label) {
    startCoords = coords;
    document.getElementById('start').value = label;

    if(startMarker) startMarker.remove();
    startMarker = createCircleMarker('green', coords);

    if(endCoords) directions.setDestination(endCoords);
    directions.setOrigin(coords);
    drawRouteAndComputePrice();
    fitMapToPoints();
}

function selectEnd(coords, label) {
    endCoords = coords;
    document.getElementById('end').value = label;

    if(endMarker) endMarker.remove();
    endMarker = createCircleMarker('red', coords);

    if(startCoords) directions.setOrigin(startCoords);
    directions.setDestination(coords);
    drawRouteAndComputePrice();
    fitMapToPoints();
}

// ==================== Night Surcharge ====================
const datetimeInput = document.getElementById('datetime');
const nightCheckbox = document.getElementById('night-surcharge');
const nightStatus = document.getElementById('night-surcharge-status');

function updateNightSurcharge() {
    const val = datetimeInput.value;
    if (!val) {
        nightCheckbox.checked = false;
        nightStatus.style.display = 'none';
        return;
    }
    const timePart = val.split("T")[1];
    const hours = parseInt(timePart.split(":")[0], 10);
    const night = (hours >= 22 || hours < 5);
    nightCheckbox.checked = night;
    nightStatus.style.display = 'inline';
    nightStatus.textContent = night ? "✓ CÓ" : "KHÔNG";
    nightStatus.style.color = night ? "green" : "red";
}
datetimeInput.addEventListener('input', ()=>{
    updateNightSurcharge();
    drawRouteAndComputePrice();
});


// ==================== Tính giá + quãng đường ====================
async function drawRouteAndComputePrice() {
    if (!startCoords || !endCoords) {
        routeInfoDiv.textContent = "";
        return;
    }

    const coordsStr = `${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}`;
    let distance_km = 0, duration_min = 0;
    try {
        const dmUrl = `https://maps.track-asia.com/distance-matrix/v1/car/${coordsStr}?sources=0&destinations=1&annotations=distance,duration&key=${apiKey}`;
        const dmRes = await fetch(dmUrl);
        const dmData = await dmRes.json();
        if (dmData.code === "Ok" && dmData.distances && dmData.durations) {
            distance_km = dmData.distances[0][0]/1000;
            duration_min = Math.round(dmData.durations[0][0]/60);
        }
    } catch (err) { console.error(err); }

    const vehicle = document.getElementById('vehicle-type').value;
    const basePrices = { '5-chỗ': 10000, '7-chỗ': 12000, '16-chỗ': 20000, 'xe-tai': 25000 };

    if(!vehicle){
        routeInfoDiv.innerHTML = `<span style="color:red; font-weight:600;">VUI LÒNG CHỌN LOẠI XE ĐỂ HIỆN THÔNG TIN</span>`;
        return;
    }

    let price = basePrices[vehicle]*distance_km;
    if(document.getElementById('round-trip').checked) price*=1.25;
    if(nightCheckbox.checked) price*=1.2;

    // --- Chỉnh thời gian hiển thị ---
    let hours = Math.floor(duration_min / 60);
    let minutes = duration_min % 60;
    let durationStr = hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;

    routeInfoDiv.innerHTML = `
        Quãng đường: <span style="color:red; font-weight:700;">${distance_km.toFixed(2)} km</span> |
        Thời gian: <span style="color:red; font-weight:700;">${durationStr}</span> | 
        Giá: <span style="color:red; font-weight:700;">💰 ${price.toLocaleString()} VND</span>
    `;
}

// ==================== Popup chọn điểm trên map ====================
map.on('click', async (e) => {
    const coords = [e.lngLat.lng, e.lngLat.lat];

    const popupDiv = document.createElement('div');
    popupDiv.style.display = 'flex';
    popupDiv.style.gap = '10px';

    const btnStart = document.createElement('button');
	btnStart.textContent='Chọn làm điểm đi';
	Object.assign(btnStart.style,{flex:'1',cursor:'pointer',borderRadius:'4px',border:'none',backgroundColor:'#28a745',color:'white',padding:'3px 5px',fontSize:'11px',fontWeight:'600'}); 
    const btnEnd = document.createElement('button');
    btnEnd.textContent='Chọn làm điểm đến';
    Object.assign(btnEnd.style,{flex:'1',cursor:'pointer',borderRadius:'4px',border:'none',backgroundColor:'#d9534f',color:'white',padding:'3px 5px',fontSize:'11px',fontWeight:'600'});

	popupDiv.appendChild(btnStart);
    popupDiv.appendChild(btnEnd);

    const popup = new trackasiagl.Popup({ closeOnClick: true })
        .setLngLat(coords)
        .setDOMContent(popupDiv)
        .addTo(map);

    btnStart.onclick = async () => {
        popup.remove();
        const label = await reverseGeocode(coords);
        selectStart(coords, label);
    };
    btnEnd.onclick = async () => {
        popup.remove();
        const label = await reverseGeocode(coords);
        selectEnd(coords, label);
    };
});

// ==================== Setup Autocomplete ====================
setupAutocomplete('start', 'start-suggestions', selectStart);
setupAutocomplete('end', 'end-suggestions', selectEnd);

// ==================== Nút HTML lấy vị trí hiện tại ====================
document.getElementById('btn-current-location').addEventListener('click', async () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const coords = [pos.coords.longitude, pos.coords.latitude];
            const label = await reverseGeocode(coords);
            selectStart(coords, label); // Ghim marker và điền input điểm đi
            map.flyTo({ center: coords, zoom: 14 });
        }, (err) => {
            alert("Không lấy được vị trí hiện tại: " + err.message);
        });
    } else {
        alert("Trình duyệt không hỗ trợ định vị.");
    }
});


// ==================== Reverse Button ====================
document.getElementById('btn-reverse-vertical').addEventListener('click', ()=>{
    [startCoords, endCoords] = [endCoords, startCoords];
    const startVal = document.getElementById('start').value;
    document.getElementById('start').value = document.getElementById('end').value;
    document.getElementById('end').value = startVal;

    if(startMarker && endMarker){
        startMarker.remove();
        endMarker.remove();
        startMarker = createCircleMarker('green', startCoords);
        endMarker = createCircleMarker('red', endCoords);
    }

    if(startCoords && endCoords){
        directions.setOrigin(startCoords);
        directions.setDestination(endCoords);
    }
    drawRouteAndComputePrice();
    fitMapToPoints();
});

// ==================== Cập nhật giá khi thay đổi ====================
document.getElementById('vehicle-type').addEventListener('change', drawRouteAndComputePrice);
document.getElementById('round-trip').addEventListener('change', drawRouteAndComputePrice);
datetimeInput.addEventListener('input', ()=>{
    updateNightSurcharge();
    drawRouteAndComputePrice();
});

// ==================== Gửi form lên Google Sheets ====================
const routeForm = document.getElementById('route-form');
const submitBtn = routeForm.querySelector('button[type="submit"]');

routeForm.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const name = document.getElementById('user-name').value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    const vehicle = document.getElementById('vehicle-type').value;
    const datetime = document.getElementById('datetime').value;
    const origin = document.getElementById('start').value.trim();
    const destination = document.getElementById('end').value.trim();
    const twoWay = document.getElementById('round-trip').checked ? "true":"false";
    const night = document.getElementById('night-surcharge').checked ? "true":"false";
    const distanceText = routeInfoDiv.textContent.match(/Quãng đường: ([\d.]+) km/);
    const distance = distanceText ? distanceText[1] : "";
    const priceText = routeInfoDiv.textContent.match(/💰 ([\d,]+)/);
    const price = priceText ? priceText[1].replace(/,/g,"") : "";

    if(!name||!phone||!vehicle||!datetime||!origin||!destination||!distance||!price){
        alert("⚠️ Vui lòng nhập đầy đủ thông tin và tính quãng đường trước khi gửi.");
        return;
    }

    submitBtn.disabled=true;
    const oldBtnText=submitBtn.textContent;
    submitBtn.textContent="⏳ Đang gửi...";

    const payload={name,phone,vehicle,datetime,origin,destination,twoWay,night,distance,price};

    try{
        const scriptURL='https://script.google.com/macros/s/AKfycbz0nm7t0oeOQsk8vKVuJObSJCPxVOpF_mdgm9O2aYyh_z2Rjsz7GKt-3WwriGvI_jIqpA/exec';
        const res=await fetch(scriptURL,{method:'POST',body:new URLSearchParams(payload)});
        const result=await res.json();

        if(result.status==="success"){
            submitBtn.textContent="✅ Đặt xe thành công!";
            setTimeout(()=>window.location.reload(),2000);
        } else {
            alert("❌ Lỗi gửi thông tin: "+result.message);
            submitBtn.disabled=false;
            submitBtn.textContent=oldBtnText;
        }
    } catch(err){
        console.error(err);
        alert("❌ Không thể gửi dữ liệu. Kiểm tra kết nối hoặc URL Apps Script.");
        submitBtn.disabled=false;
        submitBtn.textContent=oldBtnText;
    }
});
// ==================== Gán giá trị mặc định cho datetime-local ====================
window.addEventListener('DOMContentLoaded', ()=>{
    const dtInput = document.getElementById('datetime');
    if(!dtInput.value){
        const now = new Date();
        const day = String(now.getDate()).padStart(2,'0');
        const month = String(now.getMonth()+1).padStart(2,'0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2,'0');
        const minutes = String(now.getMinutes()).padStart(2,'0');

        dtInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        updateNightSurcharge(); // cập nhật checkbox giờ ban đêm
    }
// ==================== Placeholder datetime hiển thị/ẩn ====================
    const timePlaceholder = document.querySelector('.input-datetime .time-placeholder');

    dtInput.addEventListener('input', ()=>{
        if(dtInput.value) timePlaceholder.classList.add('has-value');
        else timePlaceholder.classList.remove('has-value');

        updateNightSurcharge();
        drawRouteAndComputePrice();
    });

    // Thêm class .has-value nếu input đã có giá trị mặc định
    if(dtInput.value) timePlaceholder.classList.add('has-value');
});
