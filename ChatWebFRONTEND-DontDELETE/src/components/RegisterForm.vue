<template>
  <form
    v-if="step === 'phone'"
    @submit.prevent="sendOtp"
    style="display: flex; flex-direction: column; gap: 16px"
  >
    <div class="message bot d-4">Masukkan Nomor Kamu Untuk Mendaftar:</div>
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

    <div class="message bot d-9">OTP Akan Dikirim Ke Nomor Ini Via WhatsApp</div>
    <button :disabled="loading" type="submit" class="nav-chip" style="width: 50%; margin-left: 50%">
      {{ loading ? 'Mengirim OTP...' : 'Kirim OTP' }}
    </button>
  </form>

  <form
    v-if="step === 'otp'"
    @submit.prevent="verifyOtp"
    style="display: flex; flex-direction: column; gap: 16px"
  >
    <div class="message bot d-4">Masukkan OTP</div>
    <div class="message user d-5">
      <abbr title="Cek WhatsApp Kamu :)">
        <input class="chat-input" v-model="otp" placeholder="Masukkan OTP" maxlength="6" required />
      </abbr>
    </div>
    <button :disabled="loading" type="submit" class="nav-chip" style="width: 50%; margin-left: 50%">
      {{ loading ? 'Memverifikasi...' : 'Verifikasi OTP' }}
    </button>
  </form>

  <form
    v-if="step === 'register'"
    @submit.prevent="register"
    style="display: flex; flex-direction: column; gap: 16px"
  >
    <div class="message bot d-4">Masukkan Username dan Password</div>
    <div class="message user d-5">
      <input class="chat-input" v-model="username" placeholder="Username" required />
    </div>
    <div class="message user d-5">
      <input
        class="chat-input"
        v-model="password"
        type="password"
        placeholder="Password"
        required
      />
    </div>
    <button :disabled="loading" type="submit" class="nav-chip" style="width: 50%; margin-left: 50%">
      {{ loading ? 'Mendaftarkan...' : 'Daftar' }}
    </button>
  </form>

  <div v-if="error" class="message bot d-1" style="color: red">
    {{ error }}<br /><br />
    <span
      v-html="
        error.includes('terdaftar')
          ? '<span style=\'color: #2d3436\'>Silahkan Login atau Daftar Dengan Nomor Baru.</span>'
          : '<span style=\'color: #2d3436\'>Silakan Hubungi <a href=\'wa.me\' target=\'_blank\'>082172175234</a></span>'
      "
    >
    </span>
  </div>

  <div v-if="success" class="message bot d-1" style="color: green">✅ Pendaftaran berhasil</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

const API = ''

const step = ref('phone')
const phone = ref('')
const otp = ref('')
const username = ref('')
const password = ref('')
const captchaInput = ref('')
const captchaUrl = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

function normalizePhone(input) {
  let p = input.trim().replace(/\D/g, '');
  if (p.startsWith('+62')) return p.slice(1)
  if (p.startsWith('62')) return p
  if (p.startsWith('0')) return '62' + p.slice(1)
  return '62' + p
}

function refreshCaptcha() {
  captchaUrl.value = `${API}/api/captcha?t=${Date.now()}`
  captchaInput.value = ''
}

async function sendOtp() {
  loading.value = true
  error.value = ''
  const normalizedPhone = normalizePhone(phone.value)
  console.log(normalizedPhone)

  try {
    const res = await fetch(`${API}/api/register/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        phone: normalizedPhone,
        captcha: captchaInput.value
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Gagal mengirim OTP')

    step.value = 'otp'
  } catch (err) {
    error.value = err.message
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

async function verifyOtp() {
  loading.value = true
  error.value = ''
  const normalizedPhone = normalizePhone(phone.value)
  console.log(normalizedPhone)

  try {
    const res = await fetch(`${API}/api/register/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: normalizedPhone,
        code: otp.value,
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.valid) {
      throw new Error('OTP salah atau kadaluarsa')
    }

    step.value = 'register'
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function register() {
  loading.value = true
  error.value = ''
  const normalizedPhone = normalizePhone(phone.value)
  console.log(normalizedPhone)

  try {
    const res = await fetch(`${API}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: normalizedPhone,
        code: otp.value,
        username: username.value,
        password: password.value,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Gagal daftar')

    success.value = true
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshCaptcha()
})
</script>
