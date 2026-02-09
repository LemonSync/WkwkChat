<template>

  <div class="device-frame">
    <header class="chat-header">
      <div class="header-avatar">
        <img class="imgHeader" src="../assets/img/logo.png" alt="WkwkChat Logo" />
      </div>
      <div class="header-info">
        <h2>WkwkChat</h2>
        <span>Chat Web Karya Anak SMK Negeri 9 Medan</span>
      </div>
    </header>
    
    <div class="view-section">
      <div class="chat-body">

        <div class="message bot d-1">Halo! Selamat datang.</div>
        <div class="message bot d-2">Silakan pilih menu untuk memulai.</div>
        
        <div class="message bot d-3" style="background: transparent; padding: 0; box-shadow: none">
          <div style="display: flex; gap: 10px">
            <abbr title="Login Cuy !!">
            <router-link to="/login" class="nav-chip">
              Login
            </router-link>
            </abbr>
            <abbr title="Belum Punya Akun ? Daftar Dulu Gih !!">
            <router-link to="/register" class="nav-chip">
              Daftar
            </router-link>
            </abbr>
          </div>
        </div>

        <router-view />
      </div>
    </div>
  </div>
</template>
