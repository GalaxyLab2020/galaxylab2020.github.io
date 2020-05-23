const fs = require('fs');
const child_process = require('child_process');

const shadowsocksPath = "/root/shadowsocks-libev/src/ss-server";
const RESTART_INTERVAL_TIME = 1000 * 60 * 60;
const START_DELAY_TIME = 1000 * 1;
const domain = "";
const supportSS = false;
const supportV2ray = true;

let ssProcess;
let v2RayProcess;
function main() {
    console.log(`-c /etc/shadowsocks-libev/config.json -p 443 --plugin /usr/bin/v2ray-plugin --plugin-opts "server;tls;fast-open;host=${domain};loglevel=none"`.split(' '));
    startSs();
    setInterval(function () {
        if (ssProcess != null) {
            ssProcess.kill('SIGINT');
        }
        if (v2RayProcess != null) {
            v2RayProcess.kill('SIGINT');
        }
        setTimeout(() => {
            startSs();
        }, START_DELAY_TIME);
    }, RESTART_INTERVAL_TIME);


    process.on('SIGINT', onExit);
    process.on('exit', onExit);
}

function onExit() {
    console.log('Process Exit');
    if (ssProcess != null) {
        ssProcess.kill('SIGINT');
    }
    if (v2RayProcess != null) {
        v2RayProcess.kill('SIGINT');
    }
    process.exit(0)
}

function startSs() {
    if (supportSS) {
        ssProcess = child_process.spawn(`${shadowsocksPath}`, `-c /etc/shadowsocks-libev/config.json -u`.split(' '));
        ssProcess.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
            console.log('\n');
        });
        ssProcess.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
            console.log('\n');
        });
        ssProcess.on('close', function (code) {
            console.log('子进程已退出，退出码 ' + code);
        });
    }

    if (supportV2ray) {
        v2RayProcess = child_process.spawn(`/bin/sh`,
            ['-c', `${shadowsocksPath} -c /etc/shadowsocks-libev/config.json -p 443 -u --plugin /usr/bin/v2ray-plugin --plugin-opts "server;fast-open;"`],
        );
        v2RayProcess.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
            console.log('\n');
        });
        v2RayProcess.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
            console.log('\n');
        });
        v2RayProcess.on('close', function (code) {
            console.log('子进程已退出，退出码 ' + code);
        });
    }
}
main();
