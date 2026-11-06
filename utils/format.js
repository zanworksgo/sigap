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
  const t = tempat ? titleCase(tempat) : '';
  const d = tanggal ? formatTanggal(tanggal) : '';
  if (t && d) return `${t}, ${d}`;
  return t || d || '-';
}

// Display helpers: names are shown fully uppercase, places/addresses in Title Case.
function toUpper(value) {
  return value ? String(value).toUpperCase() : '';
}

function titleCase(value) {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/(^|[\s'\-.\/(])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}

// Build an ISO date (YYYY-MM-DD) from day/month/year, or null if out of range.
function isoFrom(year, month, day) {
  const yy = Number(year);
  const mm = Number(month);
  const dd = Number(day);
  if (!yy || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

// Parse a loosely-typed date into ISO (YYYY-MM-DD). Accepts "27 September 2004",
// "27/09/2004", "27-09-2004", "27.09.2004", and ISO "2004-09-27". Returns null
// when it cannot be understood.
function parseDateLoose(value) {
  const s = (value || '').trim();
  if (!s) return null;
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return isoFrom(m[1], m[2], m[3]);
  if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/))) return isoFrom(m[3], m[2], m[1]);
  if ((m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/))) {
    const mi = MONTHS.findIndex((name) => name.toLowerCase() === m[2].toLowerCase());
    if (mi !== -1) return isoFrom(m[3], mi + 1, m[1]);
  }
  return null;
}

// Split a combined "Tempat, Tanggal Lahir" string (e.g. pasted from a Google
// Form) into { tempat_lahir, tanggal_lahir }. The date is taken after the last
// comma and normalised to ISO when possible; unparseable dates are kept as-is.
function parseTTL(raw) {
  const s = (raw || '').trim();
  if (!s) return { tempat_lahir: null, tanggal_lahir: null };
  const idx = s.lastIndexOf(',');
  if (idx === -1) {
    const iso = parseDateLoose(s);
    return iso ? { tempat_lahir: null, tanggal_lahir: iso } : { tempat_lahir: s, tanggal_lahir: null };
  }
  const tempat = s.slice(0, idx).trim() || null;
  const datePart = s.slice(idx + 1).trim();
  const iso = parseDateLoose(datePart);
  return { tempat_lahir: tempat, tanggal_lahir: iso || (datePart || null) };
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

module.exports = { MONTHS, formatTanggal, formatTTL, parseTTL, parseDateLoose, toUpper, titleCase, formatRupiah, periodeLabel, parseList, formatList, formatLast, formatRentang };
