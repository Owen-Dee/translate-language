const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const routers = require('./routes/index');
const cors = require('@koa/cors');
const app = new Koa();

app.use(bodyParser());
app.use(cors());
app.use(routers.routes()).use(routers.allowedMethods());
app.listen(3010);
console.log('Translate server start!');
