#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const ZIP_PATH = process.argv[2] || path.join('/tmp', 'wilayah_indonesia', 'db_wilayah_bps.sql.zip');
const SQL_NAME = 'db_wilayah_bps.sql';

const tables = {
  m_provinsi: ['id', 'kode_bps', 'nama_bps', 'kode_dagri', 'nama_dagri', 'created_at', 'updated_at'],
  m_kabupaten: ['id', 'id_prov', 'kode_bps', 'nama_bps', 'kode_dagri', 'kode_dagri2', 'nama_dagri', 'tipe', 'created_at', 'updated_at'],
  m_kecamatan: ['id', 'id_prov', 'id_kab', 'kode_bps', 'nama_bps', 'kode_dagri', 'kode_dagri2', 'nama_dagri', 'created_at', 'updated_at'],
  m_kelurahan: ['id', 'id_prov', 'id_kab', 'id_kec', 'kode_bps', 'nama_bps', 'kode_dagri', 'kode_dagri2', 'nama_dagri', 'tipe', 'created_at', 'updated_at'],
};

function readSqlFromZip(zipPath) {
  return execFileSync('unzip', ['-p', zipPath, SQL_NAME], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function splitTuples(valuesSql) {
  const tuples = [];
  let current = [];
  let field = '';
  let inString = false;
  let inTuple = false;

  for (let i = 0; i < valuesSql.length; i += 1) {
    const char = valuesSql[i];
    const next = valuesSql[i + 1];

    if (!inTuple) {
      if (char === '(') {
        inTuple = true;
        current = [];
        field = '';
      }
      continue;
    }

    if (inString) {
      if (char === '\\' && next !== undefined) {
        field += next;
        i += 1;
      } else if (char === "'" && next === "'") {
        field += "'";
        i += 1;
      } else if (char === "'") {
        inString = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "'") {
      inString = true;
    } else if (char === ',') {
      current.push(normalizeField(field));
      field = '';
    } else if (char === ')') {
      current.push(normalizeField(field));
      tuples.push(current);
      inTuple = false;
      field = '';
    } else {
      field += char;
    }
  }

  return tuples;
}

function normalizeField(value) {
  const trimmed = value.trim();
  if (trimmed.toUpperCase() === 'NULL') return '';
  return trimmed;
}

function rowsForTable(sql, tableName) {
  const rows = [];
  const pattern = new RegExp(`INSERT INTO \`${tableName}\` VALUES\\s*([\\s\\S]*?);`, 'g');
  let match;

  while ((match = pattern.exec(sql)) !== null) {
    for (const tuple of splitTuples(match[1])) {
      rows.push(Object.fromEntries(tables[tableName].map((column, index) => [column, tuple[index] || ''])));
    }
  }

  return rows;
}

function csvEscape(value) {
  const stringValue = String(value ?? '');
  if (/[",\n\r]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
}

function writeCsv(filename, headers, rows) {
  const output = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n') + '\n';

  fs.writeFileSync(path.join(DATA_DIR, filename), output, 'utf8');
}

function sortById(a, b) {
  return a.id.localeCompare(b.id, 'en', { numeric: true });
}

function uniqueById(rows, label) {
  const seen = new Map();
  let duplicates = 0;

  for (const row of rows) {
    if (seen.has(row.id)) {
      duplicates += 1;
      continue;
    }

    seen.set(row.id, row);
  }

  if (duplicates > 0) {
    console.warn(`Skipped ${duplicates} duplicate ${label} rows by id`);
  }

  return [...seen.values()];
}

if (!fs.existsSync(ZIP_PATH)) {
  console.error(`Source zip not found: ${ZIP_PATH}`);
  process.exit(1);
}

console.log(`Reading ${ZIP_PATH}`);
const sql = readSqlFromZip(ZIP_PATH);

const provincesRaw = rowsForTable(sql, 'm_provinsi');
const regenciesRaw = rowsForTable(sql, 'm_kabupaten');
const districtsRaw = rowsForTable(sql, 'm_kecamatan');
const villagesRaw = rowsForTable(sql, 'm_kelurahan');

const provinceByInternalId = new Map(provincesRaw.map((row) => [row.id, row.kode_bps]));
const regencyByInternalId = new Map(regenciesRaw.map((row) => [row.id, row.kode_bps]));
const districtByInternalId = new Map(districtsRaw.map((row) => [row.id, row.kode_bps]));

const provinces = uniqueById(provincesRaw.map((row) => ({
  id: row.kode_bps,
  name: row.nama_bps || row.nama_dagri,
})), 'province').sort(sortById);

const regencies = uniqueById(regenciesRaw.map((row) => ({
  id: row.kode_bps,
  province_id: provinceByInternalId.get(row.id_prov) || row.kode_bps.slice(0, 2),
  name: row.nama_dagri || row.nama_bps,
})), 'regency').sort(sortById);

const districts = uniqueById(districtsRaw.map((row) => ({
  id: row.kode_bps,
  regency_id: regencyByInternalId.get(row.id_kab) || row.kode_bps.slice(0, 4),
  name: row.nama_bps || row.nama_dagri,
})), 'district').sort(sortById);

const villages = uniqueById(villagesRaw.map((row) => ({
  id: row.kode_bps,
  district_id: districtByInternalId.get(row.id_kec) || row.kode_bps.slice(0, 7),
  name: row.nama_bps || row.nama_dagri,
})), 'village').sort(sortById);

writeCsv('provinces.csv', ['id', 'name'], provinces);
writeCsv('regencies.csv', ['id', 'province_id', 'name'], regencies);
writeCsv('districts.csv', ['id', 'regency_id', 'name'], districts);
writeCsv('villages.csv', ['id', 'district_id', 'name'], villages);

console.log(`Wrote ${provinces.length} provinces`);
console.log(`Wrote ${regencies.length} regencies`);
console.log(`Wrote ${districts.length} districts`);
console.log(`Wrote ${villages.length} villages`);
