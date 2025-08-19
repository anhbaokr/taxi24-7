const chatBox = document.getElementById('chatBox');
const input = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

// Thời gian chờ giữa các request (ms)
const RATE_LIMIT_DELAY = 2000; // 2 giây
let canSend = true;

async function sendMessage() {
  const message = input.value.trim();
  if (!message || !canSend) return;

  // Hiển thị tin nhắn người dùng
  chatBox.innerHTML += `<div class="message user"><b>Bạn:</b> ${message}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
  input.value = '';

  // Tạm khóa nút gửi để tránh gửi quá nhanh
  canSend = false;
  sendBtn.disabled = true;
  setTimeout(() => { canSend = true; sendBtn.disabled = false; }, RATE_LIMIT_DELAY);

  // Gửi request đến API OpenAI
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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" // <-- Thay YOUR_API_KEY bằng key thật, giữ "Bearer "
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }]
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const botReply = data.choices[0].message.content;

    // Hiển thị phản hồi từ ChatGPT
    chatBox.innerHTML += `<div class="message bot"><b>GPT:</b> ${botReply}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    // Xử lý lỗi 429 hoặc lỗi khác
    chatBox.innerHTML += `<div class="message bot" style="color:red;"><b>GPT:</b> Lỗi: ${err.message}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Sự kiện click và Enter
sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keydown', e => { if(e.key === 'Enter') sendMessage(); });
