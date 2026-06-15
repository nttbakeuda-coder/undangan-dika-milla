# Undangan Pernikahan — Dika & Milla

Undangan pernikahan digital (statis) untuk **Milla & Dika**, Minggu 15 November 2026, Ende, NTT.

Dibangun dengan HTML, CSS, dan JavaScript murni (tanpa framework) sehingga bisa langsung di-deploy sebagai situs statis di Vercel.

## Struktur

```
.
├── index.html        # halaman utama undangan
├── style.css         # gaya/tema
├── app.js            # interaksi (countdown, RSVP, musik, dll)
├── marry-me.mp3      # musik latar
├── floral/
│   ├── arch.png      # ornamen bunga (atas)
│   └── band.png      # ornamen bunga (bawah)
└── photos/           # foto mempelai & galeri (opsional)
    └── .gitkeep
```

## Foto (opsional)

Aplikasi otomatis menyembunyikan foto yang belum ada. Untuk menampilkan foto, letakkan file berikut di folder `photos/`:

- `milla.jpg`, `dika.jpg` — foto kedua mempelai
- `gallery-1.jpg` … `gallery-6.jpg` — foto galeri

## Nama tamu di undangan

Tambahkan parameter `?kepada=` pada URL, contoh:

```
https://undangan-dika-milla.vercel.app/?kepada=Bapak%20Budi
```

## Deploy ke Vercel

Repository ini adalah situs statis. Cukup hubungkan repo GitHub ke Vercel — tidak perlu build command maupun output directory khusus (root sebagai output).
