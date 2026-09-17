'use strict';

const { makeTransaksiRouter } = require('./keuanganFactory');
module.exports = makeTransaksiRouter('Pemasukan', 'pemasukan', 'pemasukan');
