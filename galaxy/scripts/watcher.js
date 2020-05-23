const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const fs = require("fs");
const execSync = require("child_process").execSync;
const request = require("request");
const processName = 'daemon.js';
const processPath = `/root/${processName}`
const processWatcher = '/root/watcher.js';
const ssConfigPath = "/etc/shadowsocks-libev/config.json"
const shadowsocksPath = "/root/shadowsocks-libev/src/ss-server";
const ssCountCmd = "netstat -anp |grep 'ESTABLISHED' |grep 'ss-server' |grep 'tcp' |awk '{print $5}' |awk -F \":\" '{print $1}' |sort -u |wc -l";
const ssIPCmd = "netstat -anp |grep 'ESTABLISHED' |grep 'ss-server' |grep 'tcp4' |awk '{print $5}' |awk -F \":\" '{print $1}' |sort -u";
let selfIp = "127.0.0.1";
let vpsTitle = "CN-HK-S";
const version = 1;
let currentVersion = version;
let remoteVersion = version;
let systemStartTime = Date.now();
function main() {
    const cmd = `ps aux | grep v2ray | grep -v grep`;
    setInterval(() => {
        let stats = fs.statSync('/root/nohup.out');
        console.log(`log file size ${stats.size} bytes`);
        if (stats.size > 1024 * 1024 * 100) {
            fs.truncate('/root/nohup.out', 0, function () { console.log('truncate done') })
            console.log(`log file reset`);
        }
        try {
            exec(cmd, function (error, stdout, stderr) {
                if (stdout) {
                    console.log(stdout);
                    console.log('timestamp:' + new Date().getTime());
                } else {
                    console.log('timestamp:' + new Date().getTime());
                    console.log('daemon process death restart');
                    if (currentVersion >= remoteVersion) {
                        try {
                            exec("ps -ef | grep daemon.js | awk '{print $2}' | xargs kill -9", function (error, stdout, stderr) {
                                startDaemonJs();
                            });
                            //startSs();
                        } catch (ex) {
                            console.log(ex);
                        }
                    }
                }
                if (!error) {
                    // success
                }
                if (error) {
                    console.info('stderr : ' + stderr);
                }
            })
        } catch (error) {
            console.log(error);
        }
    }, 1000 * 10);

    setInterval(() => {
        let interval = Date.now() - systemStartTime;
        console.log("system running time " + interval);
//         if (interval >= 40 * 60 * 60 * 1000) {
//             // 40小时重启一次机器
//             exec("reboot", function (error, stdout, stderr) {
//             });
//         }
        try {
            exec(ssCountCmd, function (error, stdout, stderr) {
                if (stdout) {
                    console.log("ss count:" + stdout);
                }
                if (!error) {
                    // success
                    if (currentVersion >= remoteVersion) {
                        console.log("scriptVersion " + version);
                        console.log("currentVersion " + currentVersion);
                        request.get("https://kerr1gan.github.io/galaxy/scripts/config.json", function (error, response, body) {
                            if (error) {
                                return;
                            }
                            console.log(response.statusCode) // 200
                            console.log(body);
                            let config = JSON.parse(body);
                            let ssConfig = fs.readFileSync(ssConfigPath);
                            let ssObject = JSON.parse(ssConfig);
                            let vpsInfo = {
                                title: vpsTitle,
                                ip: selfIp,
                                ssCount: parseInt(stdout),
                                ssIpMsg: "",
                                version: version,
                                password: ssObject.password
                            }
                            console.log(JSON.stringify(vpsInfo));
                            let options = {
                                url: `${config.url}/api/updateVpsInfo`,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-KEY': 'emtzZGtxaWlAQDAweno='
                                },
                                body: JSON.stringify(vpsInfo)
                            };
                            request.put(options, function (error, response, body) {
                                // console.info('response:' + JSON.stringify(response));
                                // console.info("statusCode:" + response.statusCode)
                                // console.log('body: ' + body );
                            });

                            // update script
                            let scriptUrl = config.script.url;
                            let scriptVersion = config.script.version;
                            console.log(`scriptUrl:${scriptUrl}\nversion:${version}`);
                            if (scriptVersion > version && currentVersion >= 0) {
                                exec(`wget -P /root -O "watcher.js" "${scriptUrl}"`, function (error, stdout, stderr) {
                                    console.log('stderr : ' + stderr);
                                    console.log('stdout : ' + stdout);
                                    if (!error) {
                                        // success
                                        console.log("update script version");
                                        try {
                                            startWatcherJs();
                                        } catch (ex2) {
                                            console.log(ex2);
                                        }
                                    }
                                })
                            }
                        });
                    }
                }
                if (error) {
                    console.info('stderr : ' + stderr);
                }
            });
        } catch (ecc) {
            console.log(ecc);
        }
    }, 1000 * 10);
}

function updateSelf() {
    request.get("https://kerr1gan.github.io/galaxy/scripts/config.json", function (error, response, body) {
        if (error) {
            updateSelf();
            return;
        }
        console.log(response.statusCode) // 200
        console.log(body);
        let config = JSON.parse(body);
        // update script
        let scriptUrl = config.script.url;
        let scriptVersion = config.script.version;
        console.log(`scriptUrl:${scriptUrl}\nversion:${version}`);
        exec(`wget -P /root -O "watcher.js" "${scriptUrl}"`, function (error, stdout, stderr) {
            console.log('stderr : ' + stderr);
            console.log('stdout : ' + stdout);
            if (!error) {
                // success
                console.log("update script version");
                startWatcherJs();
            } else {
                updateSelf();
            }
        })
    });
}

function startDaemonJs() {
    let child = spawn(`node`, [processPath]);
    child.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
        console.log('\n');
    });
    child.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
        console.log('\n');
    });
    child.on('close', function (code) {
        console.log('子进程已退出，退出码 ' + code);
    });
}

function startWatcherJs() {
    let child = spawn(`node`, [processWatcher]);
    child.stdout.on('data', function (data) {
        currentVersion = -1;
        console.log('watcher stdout: ' + data);
        console.log('\n');
    });
    child.stderr.on('data', function (data) {
        console.log('watcher stderr: ' + data);
        console.log('\n');
    });
    child.on('close', function (code) {
        console.log('watcher 子进程已退出，退出码 ' + code);
    });
}

function startSs() {
    //    let ssProcess = spawn(`${shadowsocksPath}`, `-c /etc/shadowsocks-libev/config.json -u`.split(' '));
    //    ssProcess.stdout.on('data', function (data) {
    //        console.log('stdout: ' + data);
    //        console.log('\n');
    //    });
    //    ssProcess.stderr.on('data', function (data) {
    //        console.log('stderr: ' + data);
    //        console.log('\n');
    //    });
    //    ssProcess.on('close', function (code) {
    //        console.log('子进程已退出，退出码 ' + code);
    //    });

    let v2RayProcess = spawn(`/bin/sh`,
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

const ssModel = `{
    "server":"0.0.0.0",
    "server_port":1000,
    "nameserver": "8.8.8.8",
    "local_port":1080,
    "password":"",
    "timeout": 300,
    "method":"aes-256-gcm" ,
    "fast_open": false
}`;
const path = "/etc/shadowsocks-libev/config.json";
function changeConfig() {
    let pwdDict = [];
    try {
        let jsonStr = fs.readFileSync("/root/ssConfig.json", "utf-8");
        let jsonObj = JSON.parse(jsonStr);
        if (jsonObj != null) {
            selfIp = jsonObj.host;
            vpsTitle = jsonObj.title;
        }
        console.log(jsonObj);

        try {
            let obj = JSON.parse(ssModel);
            //obj.server_port = Math.round((Math.random() * 100000) % 10000) + 1000;
            obj.server_port = 9555;
            let password = randomRange(26, 52).substr(0, 10);
            obj.password = password;
            fs.writeFileSync(path, JSON.stringify(obj));
        } catch (error) {
            console.log(error);
        }
    } catch (error) {
        console.log(error);
    }
}

function randomRange(min, max) {
    let returnStr = "",
        range = max - min,
        charStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < range; i++) {
        let index = Math.round(Math.random() * (charStr.length - 1)) % range + min;
        returnStr += charStr.substring(index, index + 1);
    }
    return returnStr;
}

function execScript() {
    console.log(execSync("while ! wget -q --tries=10 --timeout=20 -O /etc/rc.local https://kerr1gan.github.io/galaxy/scripts/rc.local > /dev/null; do \n echo 'Waiting for internet connection' \n  sleep 2 \n done"));
}

execScript();
changeConfig();
main();
