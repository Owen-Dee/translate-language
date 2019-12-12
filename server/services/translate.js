const querystring = require('querystring');

const got = require('got');
const { get: getToken } = require('../utils/token');
const languages = require('../utils/language');

async function translate(text, opts, gotopts) {
    opts = opts || {};
    gotopts = gotopts || {};
    let e;
    [opts.from, opts.to].forEach(function (lang) {
        if (lang && !languages.isSupported(lang)) {
            e = new Error();
            e.code = 400;
            e.message = 'The language \'' + lang + '\' is not supported';
        }
    });
    if (e) {
        throw e;
    }

    opts.from = opts.from || 'auto';
    opts.to = opts.to || 'en';
    opts.tld = opts.tld || 'com';

    opts.from = languages.getCode(opts.from);
    opts.to = languages.getCode(opts.to);

    let url = 'https://translate.google.' + opts.tld + '/translate_a/single';

    try {
        const token = await getToken(text, {tld: opts.tld}, gotopts);
        const data = {
            // client: opts.client || 't',
            client: 'webapp',
            // client: opts.client || 'gtx',
            sl: opts.from,
            tl: opts.to,
            // hl: opts.to,
            hl: opts.to,
            dt: ['at', 'bd', 'ex', 'ld', 'md', 'qca', 'rw', 'rm', 'ss', 't'],
            ie: 'UTF-8',
            oe: 'UTF-8',
            pc: 1,
            otf: 1,
            ssel: 0,
            tsel: 4, // 0
            kc: 4, // 7
            q: text
        };
        data[token.name] = token.value;

        url = url + '?' + querystring.stringify(data);
        const res = await got(url, gotopts);
        console.log(res);
        const result = {
            text: '',
            pronunciation: '',
            from: {
                language: {
                    didYouMean: false,
                    iso: ''
                },
                text: {
                    autoCorrected: false,
                    value: '',
                    didYouMean: false
                }
            },
            raw: ''
        };

        if (opts.raw) {
            result.raw = res.body;
        }

        const body = JSON.parse(res.body);
        body[0].forEach(function (obj) {
            if (obj[0]) {
                result.text += obj[0];
            }
            if (obj[2]) {
                result.pronunciation += obj[2];
            }
        });

        if (body[2] === body[8][0][0]) {
            result.from.language.iso = body[2];
        } else {
            result.from.language.didYouMean = true;
            result.from.language.iso = body[8][0][0];
        }

        if (body[7] && body[7][0]) {
            let str = body[7][0];

            str = str.replace(/<b><i>/g, '[');
            str = str.replace(/<\/i><\/b>/g, ']');

            result.from.text.value = str;

            if (body[7][5] === true) {
                result.from.text.autoCorrected = true;
            } else {
                result.from.text.didYouMean = true;
            }
        }

        return result;
    } catch (err) {
        err.message += `\nUrl: ${url}`;
        if (err.statusCode !== undefined && err.statusCode !== 200) {
            err.code = 'BAD_REQUEST';
        } else {
            err.code = 'BAD_NETWORK';
        }
        throw err;
    }
}

module.exports = translate;
module.exports.languages = languages;
