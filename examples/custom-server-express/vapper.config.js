const path = require('path');

module.exports = {
  // default
  fallBackSpa: true,
  port: 4005,
  template: fs.readFileSync(path.resolve('./public/index.ssr.html'), 'utf-8'),
}