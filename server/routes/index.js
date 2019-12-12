/**
 * 整合所有子路由
 */

const router = require('koa-router')();

const translate = require('./translate');

router.use('/api', translate.routes(), translate.allowedMethods());

module.exports = router;
