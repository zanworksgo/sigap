'use strict';

// Daftar kepanitiaan yang punya arsip surat masuk & keluar tersendiri
// (terpisah dari surat pengurus). Menambah satu baris di sini otomatis
// membuat halaman, route, folder arsip, dan menu sidebar untuk kepanitiaan baru.
const KEPANITIAAN = [
    { key: 'pasmansa-cup', slug: 'pasmansa-cup', label: 'Pasmansa Cup', short: 'Pasmansa Cup', icon: 'award' },
    { key: 'spartacus', slug: 'spartacus', label: 'Spartacus', short: 'Spartacus', icon: 'award' }
];

module.exports = KEPANITIAAN;
