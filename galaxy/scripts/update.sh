#!/bin/bash
#curl --silent --location https://kerr1gan.github.io/galaxy/scripts/update.sh | bash
touch "/root/ssConfig.json"
cat>"/root/ssConfig.json"<<EOF
{
  "host": "",
  "title": "",
  "msg": "message"
}
EOF
