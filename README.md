# API Wilayah Indonesia (Self-hosted)

Static REST API data wilayah Indonesia yang bisa kamu host sendiri di GitHub Pages.

## Cara Kerja

1. Edit file CSV di folder `/data`
2. Push ke branch `main`
3. GitHub Actions otomatis generate JSON dan deploy ke GitHub Pages
4. API siap diakses di `https://<username>.github.io/<repo-name>/`

## Setup Awal

### 1. Fork / Clone repo ini ke akun kamu

### 2. Enable GitHub Pages
- Pergi ke **Settings → Pages**
- Source: **Deploy from a branch**
- Branch: `gh-pages`, direktori: `/root`
- Klik Save

### 3. Aktifkan Actions
- Pergi ke tab **Actions**
- Klik "I understand my workflows, go ahead and enable them"

### 4. Trigger build pertama
Lakukan push kecil ke file CSV, atau trigger manual via **Actions → Generate & Deploy API → Run workflow**

---

## Edit Data

Semua data ada di folder `/data` dalam format CSV:

| File | Isi |
|------|-----|
| `data/provinces.csv` | Daftar provinsi |
| `data/regencies.csv` | Daftar kabupaten/kota |
| `data/districts.csv` | Daftar kecamatan |
| `data/villages.csv` | Daftar kelurahan/desa |

Format kolom mengikuti struktur ID Kemendagri (BPS):
- Provinsi: 2 digit (misal `31`)
- Kab/Kota: 4 digit (misal `3171`)
- Kecamatan: 7 digit (misal `3171010`)
- Kelurahan: 10 digit (misal `3171010001`)

---

## Endpoints

Base URL: `https://<username>.github.io/<repo-name>`

```
GET /provinces.json                        → semua provinsi
GET /province/{id}.json                    → detail provinsi
GET /regencies/{province_id}.json          → kab/kota by provinsi
GET /regency/{id}.json                     → detail kab/kota
GET /districts/{regency_id}.json           → kecamatan by kab/kota
GET /district/{id}.json                    → detail kecamatan
GET /villages/{district_id}.json           → kelurahan by kecamatan
GET /village/{id}.json                     → detail kelurahan
```

---

## Generate Lokal

```bash
node scripts/generate.js
```

Output masuk ke folder `/api`.

---

## Generate Ulang

Tiap push ke `main` yang mengubah file di `/data` atau `/scripts` akan otomatis trigger CI/CD.
Bisa juga trigger manual: **Actions → Generate & Deploy API → Run workflow**.
