const apiKey = "0dfb3c4c83ebea6ae11754971709ddea53";
const bbox = "102,20,107.5,23.5";
mapboxgl.accessToken = 'pk.eyJ1IjoidGF4aTI0aC1vbmxpbmUiLCJhIjoiY21kcm5xeWk2MGw1NDJxb25zY3V4eHd4MCJ9.K4wVs6Xwelw6Ic6mXK1FPg';

let map = new mapboxgl.Map({
  container: 'map', style: 'mapbox://styles/mapbox/streets-v11',
  center: [105.854, 21.028], zoom: 12
});
map.addControl(new mapboxgl.NavigationControl());

let startCoords=null,endCoords=null,startMarker=null,endMarker=null;
const routeInfoDiv = document.getElementById('route-info');

// ==================== Autocomplete ====================
function setupAutocomplete(inputId,suggestionsId,onSelect){
  const input=document.getElementById(inputId);
  const suggestionsBox=document.getElementById(suggestionsId);
  input.addEventListener("input",async()=>{
    const text=input.value.trim();
    if(text.length<2){ suggestionsBox.innerHTML=""; return; }
    try{
      const res=await fetch(`https://maps.track-asia.com/api/v1/autocomplete?lang=vi&size=5&text=${encodeURIComponent(text)}&key=${apiKey}&bbox=${bbox}`);
      const data=await res.json();
      suggestionsBox.innerHTML="";
      if(data.features){ data.features.forEach(place=>{
        const div=document.createElement("div");
        div.textContent=place.properties.label;
        div.onclick=()=>{ 
          input.value=place.properties.label; 
          suggestionsBox.innerHTML=""; 
          onSelect(place.geometry.coordinates,place.properties.label); 
        };
        suggestionsBox.appendChild(div);
      });}
    }catch(err){ suggestionsBox.innerHTML="<div style='color:red'>Không thể lấy gợi ý</div>"; }
  });
  document.addEventListener("click",(e)=>{ if(!suggestionsBox.contains(e.target)&&e.target!==input) suggestionsBox.innerHTML=""; });
}

// ==================== Reverse Geocode ====================
async function reverseGeocode(coords){
  try{
    const res=await fetch(`https://maps.track-asia.com/api/v1/reverse?key=${apiKey}&point.lat=${coords[1]}&point.lon=${coords[0]}&lang=vi`);
    const data=await res.json();
    if(data.features && data.features.length>0) return data.features[0].properties.label;
  }catch{}
  return `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`;
}

// ==================== Select Start / End ====================
function selectStart(coords,label){
  startCoords=coords;
  if(startMarker) startMarker.setLngLat(coords); else startMarker=new mapboxgl.Marker({color:'green'}).setLngLat(coords).addTo(map);
  updateRoute();
}
function selectEnd(coords,label){
  endCoords=coords;
  if(endMarker) endMarker.setLngLat(coords); else endMarker=new mapboxgl.Marker({color:'red'}).setLngLat(coords).addTo(map);
  updateRoute();
}

// ==================== Night Surcharge ====================
const datetimeInput=document.getElementById('datetime');
const nightCheckbox=document.getElementById('night-surcharge');
const nightStatus=document.getElementById('night-surcharge-status');

function updateNightSurcharge(){
  const val = datetimeInput.value;
  if(!val){ 
    nightCheckbox.checked = false; 
    nightStatus.style.display = 'none'; 
    return; 
  }

  // Lấy giờ trực tiếp từ input datetime-local
  const timePart = val.split("T")[1]; // "HH:MM"
  const hours = parseInt(timePart.split(":")[0], 10);

  const night = (hours >= 22 || hours < 5);
  nightCheckbox.checked = night;
  nightStatus.style.display = night ? 'inline' : 'none';

  if (night) {
    nightStatus.textContent = "✓ CÓ";
    nightStatus.style.color = "green";
  } else {
    nightStatus.textContent = "KHÔNG";
    nightStatus.style.color = "red";
  }
}

// ==================== Update Route & Price ====================
function updateRoute(){
  if(!startCoords||!endCoords){ 
    routeInfoDiv.textContent=""; 
    if(map.getLayer('route')){ map.removeLayer('route'); map.removeSource('route'); } 
    return; 
  }
  fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`)
    .then(res=>res.json())
    .then(data=>{
      if(!data.routes||data.routes.length===0){ routeInfoDiv.textContent="Không tìm thấy tuyến đường"; return; }
      const route=data.routes[0];
      if(map.getLayer('route')){ map.removeLayer('route'); map.removeSource('route'); }
      map.addSource('route',{type:'geojson',data:{type:'Feature',geometry:route.geometry}});
      map.addLayer({id:'route',type:'line',source:'route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#0074D9','line-width':5}});
      
      // Tính giá
      const distance_km=route.distance/1000;
      const vehicle = document.getElementById('vehicle-type').value;
const basePrices = {'5-chỗ':10000,'7-chỗ':12000,'16-chỗ':20000,'xe-tai':25000};

if(!vehicle){
  routeInfoDiv.innerHTML = `<span style="color:red; font-weight:600;">Chưa chọn loại xe</span>`;
  return;
}

let price = basePrices[vehicle] * distance_km;

if (document.getElementById('round-trip').checked) {
  price *= 1.25; // thêm 25%
}

if (nightCheckbox.checked) {
  price *= 1.2; // thêm 20%
}


      // Hiển thị Quãng đường và Giá với màu vàng + icon tiền
      routeInfoDiv.innerHTML = `
        Quãng đường: <strong>${distance_km.toFixed(2)} km</strong> | 
        Giá: <span style="color:red; font-weight:700;">💰 ${price.toLocaleString()} VND</span>
      `;
    }).catch(()=>{ routeInfoDiv.textContent="Không tìm thấy tuyến đường"; });
}

// ==================== Popup Chọn Điểm Đi / Đến ====================
map.on('click', async (e) => {
  const coords = [e.lngLat.lng, e.lngLat.lat];

  const popupDiv = document.createElement('div');
  popupDiv.style.display = 'flex';
  popupDiv.style.gap = '10px';

  const btnStart = document.createElement('button');
  btnStart.textContent = 'Chọn làm điểm đi';
  Object.assign(btnStart.style, {
    flex: '1', cursor: 'pointer', borderRadius: '6px', border: 'none',
    backgroundColor: '#28a745', color: 'white', padding: '6px 8px', fontWeight: '600',
  });

  const btnEnd = document.createElement('button');
  btnEnd.textContent = 'Chọn làm điểm đến';
  Object.assign(btnEnd.style, {
    flex: '1', cursor: 'pointer', borderRadius: '6px', border: 'none',
    backgroundColor: '#d9534f', color: 'white', padding: '6px 8px', fontWeight: '600',
  });

  popupDiv.appendChild(btnStart);
  popupDiv.appendChild(btnEnd);

  const popup = new mapboxgl.Popup({closeOnClick:true})
    .setLngLat(coords)
    .setDOMContent(popupDiv)
    .addTo(map);

  btnStart.onclick = async () => {
    popup.remove();
    const label = await reverseGeocode(coords);
    document.getElementById('start').value = label;
    selectStart(coords, label);
  };
  btnEnd.onclick = async () => {
    popup.remove();
    const label = await reverseGeocode(coords);
    document.getElementById('end').value = label;
    selectEnd(coords, label);
  };
});

// ==================== Style Select ====================
const styleSelect=document.getElementById('style-select');
styleSelect.addEventListener('change',()=>{ map.setStyle(styleSelect.value); });

// ==================== Setup Autocomplete ====================
setupAutocomplete('start','start-suggestions',selectStart);
setupAutocomplete('end','end-suggestions',selectEnd);

// ==================== Current Location Button ====================
document.getElementById('btn-current-location').addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async pos => {
      const coords = [pos.coords.longitude, pos.coords.latitude];
      const address = await reverseGeocode(coords); // Lấy địa chỉ từ tọa độ

      document.getElementById('start').value = address; // Hiển thị địa chỉ
      selectStart(coords, address); // Gán điểm đi + marker trên bản đồ

      // Thu phóng bản đồ về vị trí hiện tại
      map.flyTo({ center: coords, zoom: 14 });

      // Nếu đã chọn điểm đến thì tính lại tuyến đường luôn
      if (endCoords) {
        calculateRoute();
      }
    }, err => {
      alert("Không lấy được vị trí hiện tại: " + err.message);
    });
  } else {
    alert("Trình duyệt không hỗ trợ định vị.");
  }
});


// ==================== Reverse Button ====================
document.getElementById('btn-reverse-vertical').addEventListener('click',()=>{
  const tempCoords=startCoords, tempValue=document.getElementById('start').value;
  startCoords=endCoords; endCoords=tempCoords;
  document.getElementById('start').value=document.getElementById('end').value;
  document.getElementById('end').value=tempValue;
  if(startCoords) startMarker.setLngLat(startCoords);
  if(endCoords) endMarker.setLngLat(endCoords);
  updateRoute();
});

// ==================== Cập nhật giá ngay khi thay đổi loại xe, 2 chiều, datetime ====================
document.getElementById('vehicle-type').addEventListener('change', updateRoute);
document.getElementById('round-trip').addEventListener('change', updateRoute);
datetimeInput.addEventListener('input', ()=>{
  updateNightSurcharge();
  updateRoute();
});

// ==================== Gửi form lên Google Sheets / Apps Script ====================
const routeForm = document.getElementById('route-form');
const submitBtn = routeForm.querySelector('button[type="submit"]'); // nút gửi

routeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('user-name').value.trim();
  const phone = document.getElementById('user-phone').value.trim();
  const vehicle = document.getElementById('vehicle-type').value;
  const datetime = document.getElementById('datetime').value;
  const origin = document.getElementById('start').value.trim();
  const destination = document.getElementById('end').value.trim();
  const twoWay = document.getElementById('round-trip').checked ? "true" : "false";
  const night = document.getElementById('night-surcharge').checked ? "true" : "false";
  const distanceText = routeInfoDiv.textContent.match(/Quãng đường: ([\d.]+) km/);
  const distance = distanceText ? distanceText[1] : "";
  const priceText = routeInfoDiv.textContent.match(/Giá:.*?([\d,]+)/);
  const price = priceText ? priceText[1].replace(/,/g,"") : "";

  // ===== Kiểm tra nhập đủ thông tin =====
  if (!name || !phone || !vehicle || !datetime || !origin || !destination || !distance || !price) {
    alert("⚠️ Vui lòng nhập đầy đủ thông tin và tính quãng đường trước khi gửi.");
    return;
  }

  // Hiệu ứng loading cho nút gửi
  submitBtn.disabled = true;
  const oldBtnText = submitBtn.textContent;
  submitBtn.textContent = "⏳ Đang gửi...";

  const payload = {
    name, phone, vehicle, datetime, origin, destination,
    twoWay, night, distance, price
  };

  try {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbz0nm7t0oeOQsk8vKVuJObSJCPxVOpF_mdgm9O2aYyh_z2Rjsz7GKt-3WwriGvI_jIqpA/exec';
    const res = await fetch(scriptURL, {
      method: 'POST',
      body: new URLSearchParams(payload)
    });
    const result = await res.json();
    
    if (result.status === "success") {
      submitBtn.textContent = "✅ Đặt xe thành công!";
      setTimeout(() => {
        window.location.reload(); // reload trang sau khi thành công
      }, 2000);
    } else {
      alert("❌ Lỗi gửi thông tin: " + result.message);
      submitBtn.disabled = false;
      submitBtn.textContent = oldBtnText;
    }
  } catch (err) {
    console.error(err);
    alert("❌ Không thể gửi dữ liệu. Kiểm tra kết nối hoặc URL Apps Script.");
    submitBtn.disabled = false;
    submitBtn.textContent = oldBtnText;
  }
});
