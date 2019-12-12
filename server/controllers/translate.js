const translate = require('../services/translate');
const tunnel = require('tunnel');
const { proxy } = require('../config');

module.exports = {
    async translate(ctx) {
        const {text, to} = ctx.request.body;
        const ret = {};
        const keys = Object.keys(text);
        let count = 0;
        for (const key of keys) {
            try {
                const response = await translate(
                    text[key],
                    {
                        from: 'auto',
                        to,
                    },
                    {
                        agent: tunnel.httpsOverHttp({
                            proxy,
                        }),
                    }
                );
                ret[key] = response.text;
            } catch (err) {
                console.log(err);
                count += 1;
                ret[key] = '';
            }
        }
        if (count >= keys / 4) {
            throw new Error('服务器机翻错误率过高，请重试！');
        } else {
            ctx.body = ret;
        }
    }
};
