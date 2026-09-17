'use strict';

const { makeTransaksiRouter } = require('./keuanganFactory');
module.exports = makeTransaksiRouter('Pengeluaran', 'pengeluaran', 'pengeluaran');
