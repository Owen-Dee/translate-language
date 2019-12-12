// VPN 代理（需要本地 VPN 软件支持）

const proxy = {
    host: '127.0.0.1',
    port: '1087',
    headers: {
        'User-Agent': 'Node'
    }
};

module.exports.proxy = proxy;
