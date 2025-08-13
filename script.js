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
  const val=datetimeInput.value;
  if(!val){ nightCheckbox.checked=false; nightStatus.style.display='none'; return; }
  const hours=new Date(val).getHours();
  const night=(hours>=22||hours<5);
  nightCheckbox.checked=night;
  nightStatus.style.display=night?'inline':'none';
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

let price = basePrices[vehicle]*distance_km;
if(document.getElementById('round-trip').checked) price*=2;
if(nightCheckbox.checked) price*=1.2;

      if(document.getElementById('round-trip').checked) price*=2;
      if(nightCheckbox.checked) price*=1.2;

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
document.getElementById('btn-current-location').addEventListener('click',()=>{
  navigator.geolocation.getCurrentPosition(pos=>{
    const coords=[pos.coords.longitude,pos.coords.latitude];
    selectStart(coords,"Vị trí hiện tại");
    document.getElementById('start').value="Vị trí hiện tại";
  });
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
