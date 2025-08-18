const GAS_URL = "https://script.google.com/macros/s/AKfycbynzu9A2tDqXsY9pIKZoQVxNc1R1YTb2py4mG_DcmHdFMs2xh82isnnEzvwKB28DwSKgg/exec"; // Thay URL Web App của bạn

function toggleForms() {
  const regBox = document.getElementById("registerBox");
  const logBox = document.getElementById("loginBox");
  regBox.style.display = regBox.style.display === "none" ? "block" : "none";
  logBox.style.display = logBox.style.display === "none" ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", function(){
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const status = document.getElementById("status");

  // Đăng ký
  registerForm.addEventListener("submit", async function(e){
    e.preventDefault();

    const username = document.getElementById("regUser").value.trim();
    const password = document.getElementById("regPass").value;
    const password2 = document.getElementById("regPass2").value;
    const phone = document.getElementById("regPhone").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const country = document.getElementById("regCountry").value.trim();

    if(password !== password2){
      status.innerHTML = "<span class='error'>Password không trùng khớp</span>";
      return;
    }

    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({action:"register", username, password, phone, email, country})
      });
      const data = await res.json();
      status.innerText = data.msg;
    } catch(err) {
      status.innerHTML = "<span class='error'>Lỗi kết nối Web App</span>";
      console.error(err);
    }
  });

  // Đăng nhập
  loginForm.addEventListener("submit", async function(e){
    e.preventDefault();

    const username = document.getElementById("logUser").value.trim();
    const password = document.getElementById("logPass").value;

    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({action:"login", username, password})
      });
      const data = await res.json();
      status.innerText = data.msg;
    } catch(err) {
      status.innerHTML = "<span class='error'>Lỗi kết nối Web App</span>";
      console.error(err);
    }
  });
});
