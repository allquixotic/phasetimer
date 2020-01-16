#!/bin/bash
cp schema.yaml /usr/share/nginx/html
curl -X POST \
  https://generator3.swagger.io/api/generate \
  -H 'content-type: application/json' \
  -d '{
  "specURL" : "https://smcnam.me/schema.yaml",
  "lang" : "typescript-fetch",
  "type" : "CLIENT",
  "codegenVersion" : "V2"
}' --output phasetimer-api.zip
unzip -o phasetimer-api.zip
rm -rf git_push.sh .swag* phasetimer-api.zip .gitignore
mkdir -p ../client/src/api
cp *.ts ../client/src/api/
