const { default: Axios } = require('axios');
const fs = require('fs');
const _ = require('underscore');
const moment = require('moment');

moment.locale('fr'); // set locale to fr for monday to sunday weeks.

const ROOT_REQUEST_URL = 'http://private-38e18c-uzduotis.apiary-mock.com';

const readFile = (filePath) => {
  if (!filePath) throw new Error('Invalid parameters');
  try {
    const rawData = fs.readFileSync(filePath);
    return JSON.parse(rawData);
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error('File does not exist');
    throw err;
  }
};

const processCashIn = (amount, cashinConfig) => {
  const { percents, max: { amount: maxAmount } } = cashinConfig;
  let commision = (percents / 100) * amount;
  if (commision > maxAmount) commision = maxAmount;
  return parseFloat(commision).toFixed(2);
};

const processCashOutNatural = (amount, date, groups, naturalConfig) => {
  const currentWeek = moment(date).week();
  const index = groups[currentWeek].findIndex((obj) => obj.date === date);
  const totalToDate = groups[currentWeek]
    .slice(0, index)
    .reduce((sum, a) => sum + a.operation.amount, 0);
  const { percents, week_limit: { amount: maxAmount } } = naturalConfig;
  const currentAmount = totalToDate + amount;
  if (currentAmount < maxAmount) return parseFloat(0).toFixed(2);
  const commision = (percents / 100) * (totalToDate >= 1000 ? amount : amount - 1000);
  return parseFloat(commision).toFixed(2);
};

const processCashOutJuridical = (amount, juridicalConfig) => {
  const { percents, min: { amount: minAmmount } } = juridicalConfig;
  let commision = (percents / 100) * amount;
  if (commision < minAmmount) commision = minAmmount;
  return parseFloat(commision).toFixed(2);
};

const computeFees = (transaction, config, naturalData) => {
  const {
    user_id: userId,
    date,
    user_type: userType,
    type,
    operation: {
      amount,
      currency,
    },
  } = transaction;
  if (currency !== 'EUR') return '0.00';
  const { cashin, cashout: { juridical, natural } } = config;
  switch (type) {
    case 'cash_in':
      return processCashIn(amount, cashin);
    case 'cash_out':
      if (userType === 'juridical') return processCashOutJuridical(amount, juridical);
      return processCashOutNatural(amount, date, naturalData[userId], natural);
    default:
      return 0;
  }
};

const getConfig = async (get) => {
  const cashinRequest = await get(`${ROOT_REQUEST_URL}/config/cash-in`);
  const cashoutNaturalRequest = await get(`${ROOT_REQUEST_URL}/config/cash-out/natural`);
  const cashoutJuridicalRequest = await get(`${ROOT_REQUEST_URL}/config/cash-out/juridical`);

  return {
    cashin: cashinRequest.data,
    cashout: {
      natural: cashoutNaturalRequest.data,
      juridical: cashoutJuridicalRequest.data,
    },
  };
};

const applyCommisionFees = async (transactions) => {
  if (transactions.length <= 0) throw new Error('Invalid parameter');
  const config = await getConfig(Axios.get);
  const filtered = {};
  _.chain(transactions)
    .filter((transaction) => transaction.user_type === 'natural' && transaction.type === 'cash_out')
    .groupBy('user_id')
    .each((user, key) => {
      filtered[key] = user.reduce((userTransactions, transaction) => {
        const { date } = transaction;
        const weekNumber = `${moment(date).week()}`;
        if (!userTransactions[weekNumber]) {
          userTransactions[weekNumber] = [];
        }
        userTransactions[weekNumber].push(transaction);
        return userTransactions;
      }, {});
    });
  return transactions.map((item) => computeFees(item, config, filtered));
};

const processData = (path) => applyCommisionFees(readFile(path));

module.exports = { processData };
