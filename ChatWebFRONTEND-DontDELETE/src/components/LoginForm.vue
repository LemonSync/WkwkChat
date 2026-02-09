<template>
  <form @submit.prevent="handleLogin" style="display: flex; flex-direction: column; gap: 16px">
    <div class="message bot d-4">Masukkan Nomor Kamu Untuk Login:</div>
    <div class="message user d-5">
      <div class="phoneInput">
        <span class="awalanNomor">+62</span>
        <abbr title="Masukkan Nomormu Cuy">
          <input
            class="chat-input"
            v-model="phone"
            type="tel"
            placeholder="81234567890"
            autocomplete="tel"
            required
          />
        </abbr>
      </div>
    </div>

    <div class="message bot d-6">
      Masukkan Password Kamu:
      <abbr title="Kau Lupa Password ?">
        <router-link to="/forgot" class="forgot-password"><br />Lupa Password ? </router-link>
      </abbr>
    </div>

    <div class="message user d-7">
      <abbr title="Masukin Password Kamu Gih !!">
        <input
          v-model="password"
          class="chat-input"
          type="password"
          placeholder="Masukkan Password"
          autocomplete="current-password"
          required
        />
      </abbr>
    </div>

    <button type="submit" class="nav-chip" :disabled="loading" style="width: 50%; margin-left: 50%">
      {{ loading ? 'Memproses...' : 'Login' }}
    </button>
    <div v-if="error" class="message bot d-1" style="color: red">
    {{ error }}<br /><br />
    <span
      v-html="
        error.includes('mengandung')
          ? '<span style=\'color: #2d3436\'>Silahkan Input Nomor Telepon Kamu Dengan Format <s>+62</s>8217xxxxx</span>'
          : '<span style=\'color: #2d3436\'>Silakan Hubungi <a href=\'wa.me\' target=\'_blank\'>082172175234</a></span>'
      "
    >
    </span>
  </div>
    <div v-if="success" class="message bot d-1" style="color: green">✅ Login berhasil</div>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import isNumeric from 'validator/lib/isNumeric';

const router = useRouter()
const API = ''

const phone = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

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

async function handleLogin() {
  loading.value = true
  error.value = ''
  success.value = false

  try {
    const res = await fetch(`${API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: normalizePhone(phone.value),
        password: password.value,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    localStorage.setItem('token', data.token)

    success.value = true
    router.replace('/chat')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
