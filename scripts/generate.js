#!/usr/bin/env node

/**
 * Static API Generator - Wilayah Indonesia
 * 
 * Reads CSV files from /data and generates JSON endpoints into /api
 * Output structure mirrors emsifa/api-wilayah-indonesia format
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const API_DIR = path.join(ROOT, 'api');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCSV(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    // Handle commas inside quoted fields
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else current += char;
    }
    values.push(current.trim());
    
    return headers.reduce((obj, h, i) => {
      obj[h] = values[i] ?? '';
      return obj;
    }, {});
  }).filter(row => row.id); // skip empty rows
}

function writeJSON(filepath, data) {
  const dir = path.dirname(filepath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// ─── Load Data ───────────────────────────────────────────────────────────────

console.log('📂 Loading CSV data...');
const provinces  = parseCSV(path.join(DATA_DIR, 'provinces.csv'));
const regencies  = parseCSV(path.join(DATA_DIR, 'regencies.csv'));
const districts  = parseCSV(path.join(DATA_DIR, 'districts.csv'));
const villages   = parseCSV(path.join(DATA_DIR, 'villages.csv'));

console.log(`   ${provinces.length} provinces`);
console.log(`   ${regencies.length} regencies`);
console.log(`   ${districts.length} districts`);
console.log(`   ${villages.length} villages`);

// ─── Generate ─────────────────────────────────────────────────────────────────

console.log('\n⚙️  Generating API endpoints...');
ensureDir(API_DIR);

// 1. /api/provinces.json
writeJSON(path.join(API_DIR, 'provinces.json'), provinces);
console.log('   ✓ provinces.json');

// 2. /api/province/{id}.json
ensureDir(path.join(API_DIR, 'province'));
for (const p of provinces) {
  writeJSON(path.join(API_DIR, 'province', `${p.id}.json`), p);
}
console.log(`   ✓ province/{id}.json (${provinces.length} files)`);

// 3. /api/regencies/{province_id}.json
ensureDir(path.join(API_DIR, 'regencies'));
const regenciesByProvince = {};
for (const r of regencies) {
  if (!regenciesByProvince[r.province_id]) regenciesByProvince[r.province_id] = [];
  regenciesByProvince[r.province_id].push(r);
}
for (const [pid, list] of Object.entries(regenciesByProvince)) {
  writeJSON(path.join(API_DIR, 'regencies', `${pid}.json`), list);
}
console.log(`   ✓ regencies/{province_id}.json (${Object.keys(regenciesByProvince).length} files)`);

// 4. /api/regency/{id}.json
ensureDir(path.join(API_DIR, 'regency'));
for (const r of regencies) {
  writeJSON(path.join(API_DIR, 'regency', `${r.id}.json`), r);
}
console.log(`   ✓ regency/{id}.json (${regencies.length} files)`);

// 5. /api/districts/{regency_id}.json
ensureDir(path.join(API_DIR, 'districts'));
const districtsByRegency = {};
for (const d of districts) {
  if (!districtsByRegency[d.regency_id]) districtsByRegency[d.regency_id] = [];
  districtsByRegency[d.regency_id].push(d);
}
for (const [rid, list] of Object.entries(districtsByRegency)) {
  writeJSON(path.join(API_DIR, 'districts', `${rid}.json`), list);
}
console.log(`   ✓ districts/{regency_id}.json (${Object.keys(districtsByRegency).length} files)`);

// 6. /api/district/{id}.json
ensureDir(path.join(API_DIR, 'district'));
for (const d of districts) {
  writeJSON(path.join(API_DIR, 'district', `${d.id}.json`), d);
}
console.log(`   ✓ district/{id}.json (${districts.length} files)`);

// 7. /api/villages/{district_id}.json
ensureDir(path.join(API_DIR, 'villages'));
const villagesByDistrict = {};
for (const v of villages) {
  if (!villagesByDistrict[v.district_id]) villagesByDistrict[v.district_id] = [];
  villagesByDistrict[v.district_id].push(v);
}
for (const [did, list] of Object.entries(villagesByDistrict)) {
  writeJSON(path.join(API_DIR, 'villages', `${did}.json`), list);
}
console.log(`   ✓ villages/{district_id}.json (${Object.keys(villagesByDistrict).length} files)`);

// 8. /api/village/{id}.json
ensureDir(path.join(API_DIR, 'village'));
for (const v of villages) {
  writeJSON(path.join(API_DIR, 'village', `${v.id}.json`), v);
}
console.log(`   ✓ village/{id}.json (${villages.length} files)`);

// ─── Summary ─────────────────────────────────────────────────────────────────

const totalFiles = 1 + provinces.length + Object.keys(regenciesByProvince).length + regencies.length
  + Object.keys(districtsByRegency).length + districts.length
  + Object.keys(villagesByDistrict).length + villages.length;

console.log(`\n✅ Done! ${totalFiles} JSON files generated in /api`);
