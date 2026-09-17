'use strict';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Format an ISO date string (YYYY-MM-DD) into "02 Juni 2009".
function formatTanggal(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Combine tempat + tanggal lahir into "Makassar, 02 Juni 2009".
function formatTTL(tempat, tanggal) {
  const t = tempat ? tempat.trim() : '';
  const d = tanggal ? formatTanggal(tanggal) : '';
  if (t && d) return `${t}, ${d}`;
  return t || d || '-';
}

// Format a number into Indonesian Rupiah, e.g. 15000 -> "Rp 15.000".
function formatRupiah(value) {
  const n = Number(value) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

// Return "MM" and "YYYY" pieces for a month filter, plus a readable label.
function periodeLabel(bulan, tahun) {
  if (bulan && tahun) return `${MONTHS[Number(bulan) - 1]} ${tahun}`;
  if (tahun) return `Tahun ${tahun}`;
  if (bulan) return MONTHS[Number(bulan) - 1];
  return 'Semua Periode';
}

// Parse a JSON-array string (kelas/jabatan) into a clean array of strings.
function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  try {
    const arr = JSON.parse(value);
    if (Array.isArray(arr)) return arr.map((v) => String(v).trim()).filter(Boolean);
  } catch (_) {
    // Fallback for legacy plain/comma-separated values.
    return String(value).split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

// Join a JSON-array string into a readable "A, B, C" label.
function formatList(value) {
  const arr = parseList(value);
  return arr.length ? arr.join(', ') : '-';
}

// Return the last item of a JSON-array string (e.g. kelas/jabatan terakhir).
function formatLast(value) {
  const arr = parseList(value);
  return arr.length ? arr[arr.length - 1] : '-';
}

// Format a single date or an inclusive date range into readable Indonesian text,
// e.g. "02 Juni 2009" or "02 Juni 2009 s.d. 05 Juni 2009".
function formatRentang(mulai, selesai) {
  if (!mulai) return '-';
  if (!selesai || selesai === mulai) return formatTanggal(mulai);
  return `${formatTanggal(mulai)} s.d. ${formatTanggal(selesai)}`;
}

module.exports = { MONTHS, formatTanggal, formatTTL, formatRupiah, periodeLabel, parseList, formatList, formatLast, formatRentang };
