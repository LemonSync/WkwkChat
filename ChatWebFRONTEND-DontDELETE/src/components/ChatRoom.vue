<template>
  <div class="chat-room">
    <header class="chat-header">
      <h2>💬 Chat Room</h2>
      <button @click="logout">Logout</button>
    </header>

    <div v-if="role === 'creator'" class="create-room">
      <input v-model="newRoomId" placeholder="New Room ID" />
      <button @click="createRoom">Create Room</button>
    </div>

    <div class="join-room">
      <input v-model="roomId" placeholder="Room ID" />
      <button @click="joinRoom">Join</button>
    </div>

    <p class="status" v-if="status">{{ status }}</p>

    <div class="chat-box">
      <div v-for="(m, i) in messages" :key="i" :class="['chat-message', m.system && 'system']">
        <b v-if="!m.system">{{ m.user }}:</b>
        <span>{{ m.text }}</span>
      </div>
    </div>

    <div class="chat-input">
      <input v-model="text" placeholder="Ketik pesan..." @keyup.enter="sendMessage" />
      <button @click="sendMessage">Kirim</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import { jwtDecode } from 'jwt-decode'

const router = useRouter()
const token = localStorage.getItem('token')

if (!token) {
  router.replace('/')
}

let user = null
let role = null

try {
  user = jwtDecode(token)
  role = user.role
} catch {
  localStorage.removeItem('token')
  router.replace('/')
}

const roomId = ref('')
const newRoomId = ref('')
const text = ref('')
const messages = ref([])
const status = ref('')

let socket = null

function createRoom() {
  if (!newRoomId.value) return
  socket.emit('create-room', newRoomId.value)
}

function joinRoom() {
  if (!roomId.value) return
  messages.value = []
  socket.emit('join-room', roomId.value)
}

function sendMessage() {
  if (!roomId.value || !text.value) return

  socket.emit('send-message', {
    roomId: roomId.value,
    message: text.value,
  })

  text.value = ''
}

function logout() {
  if (socket) socket.disconnect()
  localStorage.removeItem('token')
  router.replace('/')
}

onMounted(() => {
  socket = io('', {
    auth: { token },
  })

  socket.on('room-created', (id) => {
    status.value = `Room ${id} berhasil dibuat ✅`
    roomId.value = id
  })

  socket.on('joined', (id) => {
    status.value = `Joined room ${id} 📥`
  })

  socket.on('message', (msg) => {
    messages.value.push({
      user: msg.user,
      text: msg.text,
    })
  })

  socket.on('system', (msg) => {
    messages.value.push({
      system: true,
      text: msg.text,
    })
  })

  socket.on('error', (msg) => {
    status.value = `❌ ${msg}`
  })

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err.message)
    logout()
  })

  status.value = `Login sebagai ${user.username} (${role})`
})

onBeforeUnmount(() => {
  if (socket) socket.disconnect()
})
</script>

<style scoped>
.chat-room {
  max-width: 600px;
  margin: auto;
  padding: 20px;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-room,
.join-room,
.chat-input {
  display: flex;
  gap: 8px;
  margin: 10px 0;
}

.chat-box {
  border: 1px solid #ddd;
  height: 300px;
  overflow-y: auto;
  padding: 10px;
  margin-bottom: 10px;
}

.chat-message {
  margin-bottom: 6px;
}

.chat-message.system {
  color: #888;
  font-style: italic;
}

.status {
  margin: 8px 0;
  font-size: 14px;
  color: #555;
}
</style>
