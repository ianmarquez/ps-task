const [,, inputfilePath] = process.argv;
const chalk = require('chalk');
const { processData } = require('./scripts/applyCommision');

(async () => {
  const res = await processData(inputfilePath);
  res.forEach((item) => console.log(chalk.yellowBright(item)));
  process.exit();
})();
