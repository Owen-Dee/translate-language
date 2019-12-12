const router = require('koa-router')();
const translate = require('../controllers/translate');

const routes = router.post('/trans', translate.translate);

module.exports = routes;
