name: 🐛 Bug Report
description: Laporkan bug atau error
title: "[BUG] "
labels: ["bug"]
assignees:
  - LemonSync

body:
  - type: markdown
    attributes:
      value: |
        Terima kasih sudah melaporkan bug 🙏  
        Mohon isi dengan jelas agar cepat diperbaiki.

  - type: input
    id: environment
    attributes:
      label: Environment
      description: OS / Browser / Node version
      placeholder: "Windows 10, Chrome 120, Node 18"
    validations:
      required: true

  - type: textarea
    id: bug_description
    attributes:
      label: Deskripsi Bug
      description: Jelaskan bug yang terjadi
      placeholder: "Saat klik tombol submit, aplikasi crash..."
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Langkah Reproduksi
      placeholder: |
        1. Buka halaman ...
        2. Klik ...
        3. Terjadi error
    validations:
      required: true
