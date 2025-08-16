// ==================== Gán giá trị mặc định cho datetime-local ====================
window.addEventListener('DOMContentLoaded', ()=>{
    const dtInput = document.getElementById('datetime');
    const timePlaceholder = document.querySelector('.input-datetime .time-placeholder');

    // Gán giá trị mặc định nếu input trống
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
    const datetimeInput = dtInput; // chỉ định lại cho dễ đọc

    // Khi người dùng thay đổi giá trị
    datetimeInput.addEventListener('input', () => {
        if(datetimeInput.value) timePlaceholder.classList.add('has-value');
        else timePlaceholder.classList.remove('has-value');

        updateNightSurcharge();
        drawRouteAndComputePrice();
    });

    // Khi mất focus, nếu không có giá trị thì hiện nhãn lại
    datetimeInput.addEventListener('blur', () => {
        if(!datetimeInput.value) timePlaceholder.classList.remove('has-value');
    });

    // Khởi tạo trạng thái placeholder ngay lúc load
    if(datetimeInput.value) timePlaceholder.classList.add('has-value');
    else timePlaceholder.classList.remove('has-value');
});
