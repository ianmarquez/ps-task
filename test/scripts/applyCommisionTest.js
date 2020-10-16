/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { default: Axios } = require('axios');
const sinon = require('sinon');
const { processData } = require('../../scripts/applyCommision');
const { defaultData } = require('../data/applyCommisionTestData');

const TEMP_DIR = 'test/temp/';

describe('processData', function () {
  before(() => {
    const files = fs.readdirSync(TEMP_DIR);
    files.forEach((file) => fs.unlinkSync(path.join(TEMP_DIR, file)));
  });

  it('should return expected result if file is valid', async () => {
    const fileName = 'temp_data.json';
    const filePath = `${TEMP_DIR}${fileName}`;
    fs.writeFileSync(filePath, JSON.stringify(defaultData));
    const results = await processData(filePath);
    expect(results).not.to.be.equal(null);
    expect(results.length).to.be.equal(defaultData.length);
    expect(results[0]).to.be.equal('0.06');
    expect(results[1]).to.be.equal('0.90');
    expect(results[2]).to.be.equal('87.00');
    expect(results[3]).to.be.equal('3.00');
    expect(results[4]).to.be.equal('0.30');
    expect(results[5]).to.be.equal('0.30');
    expect(results[6]).to.be.equal('5.00');
    expect(results[7]).to.be.equal('0.00');
    expect(results[8]).to.be.equal('0.00');
  });

  it('should throw error when file does not exist', async () => {
    const filename = './non_existant_file.json';
    try {
      await processData(filename);
    } catch (err) {
      expect(err.message).to.be.equal('File does not exist');
    }
  });

  it('should throw error when filepath is not supplied', async () => {
    try {
      await processData();
    } catch (err) {
      expect(err.message).to.be.equal('Invalid parameters');
    }
  });

  it('should throw error if file supplied is not a valid JSON', async () => {
    const fileName = 'invalid.txt';
    const filePath = `${TEMP_DIR}${fileName}`;
    fs.writeFileSync(filePath, 'test file');
    try {
      await processData(filePath);
    } catch (err) {
      expect(err.name).to.be.equal('SyntaxError');
    }
  });

  it('should throw error if file is empty', async () => {
    const fileName = 'temp_empty.json';
    const filePath = `${TEMP_DIR}${fileName}`;
    fs.writeFileSync(filePath, '');
    try {
      await processData(filePath);
    } catch (err) {
      expect(err.name).to.be.equal('SyntaxError');
    }
  });

  it('should throw error if file contains empty array', async () => {
    const fileName = 'temp_empty.json';
    const filePath = `${TEMP_DIR}${fileName}`;
    fs.writeFileSync(filePath, '[]');
    try {
      await processData(filePath);
    } catch (err) {
      expect(err.message).to.be.equal('Invalid parameter');
    }
  });

  it('should return 0 if currency is not EUR', async () => {
    const fileContent = {
      date: '2016-02-15',
      user_id: 1,
      user_type: 'natural',
      type: 'cash_out',
      operation: { amount: 300.0, currency: 'USD' },
    };
    const fileName = 'temp_empty.json';
    const filePath = `${TEMP_DIR}${fileName}`;
    fs.writeFileSync(filePath, JSON.stringify([fileContent]));
    const result = await processData(filePath);
    expect(result.length).to.be.equal(1);
    expect(result[0]).to.be.equal('0.00');
  });

  it('should return minAmmount if computed juridical cashout commision is less than min amount', async () => {
    const fileContent = {
      date: '2016-01-06',
      user_id: 2,
      user_type: 'juridical',
      type: 'cash_out',
      operation: { amount: 10.0, currency: 'EUR' },
    };
    const fileName = 'temp_empty.json';
    const filePath = `${TEMP_DIR}${fileName}`;
    fs.writeFileSync(filePath, JSON.stringify([fileContent]));
    const result = await processData(filePath);
    expect(result.length).to.be.equal(1);
    expect(result[0]).to.be.equal('0.50');
  });

  it('should throw error if config server returns error', async () => {
    const sandbox = sinon.createSandbox();
    sandbox.stub(Axios, 'get').throws(new Error('server error'));
    try {
      const fileName = 'temp_data.json';
      const filePath = `${TEMP_DIR}${fileName}`;
      fs.writeFileSync(filePath, JSON.stringify(defaultData));
      await processData(filePath);
    } catch (err) {
      expect(err.message).not.to.be.equal(null);
      expect(err.message).to.be.equal('server error');
    }
  });

  after(() => {
    const files = fs.readdirSync(TEMP_DIR);
    files.forEach((file) => fs.unlinkSync(path.join(TEMP_DIR, file)));
  });
});
