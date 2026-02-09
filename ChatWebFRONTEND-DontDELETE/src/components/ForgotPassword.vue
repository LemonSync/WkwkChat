<template>
  <form v-if="step === 'phone'" @submit.prevent="sendOtp" style="display: flex; flex-direction: column; gap: 16px">
    <div class="message bot d-4">Masukkan Nomor Kamu Untuk Verifikasi Kembali dan Reset Password</div>
    <div class="message user d-5">
      <div class="phoneInput">
        <span class="awalanNomor">+62</span>
          <input
            class="chat-input"
            v-model="phone"
            type="tel"
            placeholder="81234567890"
            autocomplete="tel"
            required
          />
      </div>
    </div>
    <div class="message bot d-6">Masukkan Kode Captcha yang Ada Pada Gambar Berikut:
      <div style="display: block; gap: 8px; align-items: center;">
        <img 
          :src="captchaUrl" 
          alt="Captcha" 
          class="captchaImg"
          @click="refreshCaptcha" 
          title="Klik untuk ganti gambar"
        />
      </div>
    </div>
    <div class="message bot d-7">Klik Gambar Untuk Ganti Kode</div>
    <div class="message user d-8" style="display: flex; flex-direction: column; gap: 8px;">
      <input
        class="chat-input"
        v-model="captchaInput"
        placeholder="Masukkan Kode Captcha"
        required
      />
    </div>
    <div class="message bot d-6">OTP Akan Dikirim Ke Nomor Ini Via WhatsApp</div>
    <button :disabled="loading" type="submit" class="nav-chip" style="width: 50%; margin-left: 50%">
      {{ loading ? 'Mengirim OTP...' : 'Kirim OTP' }}
    </button>
    </form>

    <form v-if="step === 'otp'" @submit.prevent="verifyOtp" style="display: flex; flex-direction: column; gap: 16px">
      <div class="message bot d-1">Masukkan OTP</div>
      <div class="message user d-2">
      <abbr title="Cek WhatsApp Kamu :)">
        <input
        class="chat-input"
        v-model="otp"
        placeholder="Masukkan OTP"
        maxlength="6"
        required />
      </abbr>
    </div>
    <button :disabled="loading" type="submit" class="nav-chip" style="width: 50%; margin-left: 50%">
      {{ loading ? 'Memverifikasi...' : 'Verifikasi OTP' }}
    </button>
    </form>

    <form v-if="step === 'reset'" @submit.prevent="resetPassword" style="display: flex; flex-direction: column; gap: 16px">
       <div class="message bot d-1">Masukkan Password Baru</div>
       <div class="message user d-2">
        <input
          class="chat-input"
          v-model="newPassword"
          type="password"
          placeholder="Password baru"
          required
        />
      </div>
      <button :disabled="loading" type="submit" class="nav-chip" style="width: 50%; margin-left: 50%">
        {{ loading ? 'Menyimpan...' : 'Reset Password' }}
      </button>
    </form>

    <div v-if="error" class="message bot d-1" style="color: red">
    {{ error }}
  </div>
  <div v-if="success" class="message bot d-1" style="color: green">{{ success }}</div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from 'vue-router'
import isNumeric from 'validator/lib/isNumeric';
const router = useRouter()

const API = "";
const step = ref("phone");
const phone = ref("");
const otp = ref("");
const newPassword = ref("");
const loading = ref(false);
const error = ref("");
const success = ref("");
const captchaInput = ref('')
const captchaUrl = ref('')

function normalizePhone(input) {
  
  if (!isNumeric(input)) {
    throw new Error("Nomor telepon hanya boleh mengandung angka");
  }
  let p = input.trim().replace(/\D/g, '');
  if (p.startsWith("+62")) return p.slice(1);
  if (p.startsWith("62")) return p;
  if (p.startsWith("0")) return "62" + p.slice(1);
  return "62" + p;
}

function refreshCaptcha() {
  captchaUrl.value = `${API}/api/captcha?t=${Date.now()}`
  captchaInput.value = ''
}

async function sendOtp() {

  loading.value = true;
  error.value = "";
  const normalizedPhone = normalizePhone(phone.value);
  console.log(normalizedPhone);


  try {
    const res = await fetch(`${API}/api/reset/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({
        phone: normalizedPhone,
        captcha: captchaInput.value
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    step.value = "otp";
  } catch (err) {
    error.value = err.message;
    refreshCaptcha()
  } finally {
    loading.value = false;
  }
}

async function verifyOtp() {
  loading.value = true;
  error.value = "";

  try {
    const res = await fetch(`${API}/api/reset/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: normalizePhone(phone.value),
        code: otp.value,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.valid)
      throw new Error("OTP salah atau kadaluarsa");

    step.value = "reset";
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function resetPassword() {
  loading.value = true;
  error.value = "";

  try {
    const res = await fetch(`${API}/api/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: normalizePhone(phone.value),
        code: otp.value,
        newPassword: newPassword.value,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    success.value = "✅ Password berhasil direset";
    setTimeout(() => {
    router.push('/login');
  }, 2000);
    otp.value = "";
    newPassword.value = "";
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  refreshCaptcha()
})
</script>
