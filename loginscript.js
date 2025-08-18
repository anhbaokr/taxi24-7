
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

  // Xử lý đăng ký
  registerForm.addEventListener("submit", function(e){
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

    google.script.run.withSuccessHandler(function(res){
      status.innerText = res.msg;
    }).registerUser({username,password,phone,email,country});
  });

  // Xử lý đăng nhập
  loginForm.addEventListener("submit", function(e){
    e.preventDefault();
    const username = document.getElementById("logUser").value.trim();
    const password = document.getElementById("logPass").value;

    google.script.run.withSuccessHandler(function(res){
      status.innerText = res.msg;
    }).loginUser({username,password});
  });
});

