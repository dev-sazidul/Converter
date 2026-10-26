#!/usr/bin/env bash
# One-time setup on the Oracle Cloud VM. Run as an operator who can use sudo.
# Does not flush firewall rules and does not delete /opt/convarter/data.
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  echo "Run this as the operator account with sudo, not as a root shell." >&2
  exit 1
fi

APP_DIR=/opt/convarter/app
DATA_DIR=/opt/convarter/data
BIN_DIR=/opt/convarter/bin
REPO_URL="${1:-}"

if [ -z "$REPO_URL" ]; then
  echo "Usage: ./deploy/oracle/bootstrap.sh git@github.com:OWNER/Convarter.git" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl git
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

sudo install -d -m 755 /opt/convarter "$BIN_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo git clone "$REPO_URL" "$APP_DIR"
fi
sudo install -d -m 700 "$DATA_DIR" "$DATA_DIR/storage" "$DATA_DIR/certbot" "$DATA_DIR/certbot-www" "$DATA_DIR/meta"
sudo chown 10001:10001 "$DATA_DIR/storage"
sudo chmod 700 "$DATA_DIR/storage"

if ! id deploy >/dev/null 2>&1; then
  sudo adduser --disabled-password --gecos "" deploy
fi

sudo install -m 755 "$APP_DIR/deploy/ssh-dispatch.sh" "$BIN_DIR/ssh-dispatch.sh"
sudo install -m 755 "$APP_DIR/deploy/remote-deploy.sh" "$BIN_DIR/remote-deploy.sh"
sudo install -m 755 "$APP_DIR/deploy/rollback.sh" "$BIN_DIR/rollback.sh"
sudo install -m 755 "$APP_DIR/deploy/verify.sh" "$BIN_DIR/verify.sh"
sudo install -m 755 "$APP_DIR/deploy/logs.sh" "$BIN_DIR/logs.sh"
sudo install -m 644 "$APP_DIR/deploy/lib.sh" "$BIN_DIR/lib.sh"

sudo tee /etc/sudoers.d/convarter-deploy >/dev/null <<EOF
deploy ALL=(root) NOPASSWD: $BIN_DIR/remote-deploy.sh, $BIN_DIR/rollback.sh, $BIN_DIR/verify.sh, $BIN_DIR/logs.sh
EOF
sudo chmod 440 /etc/sudoers.d/convarter-deploy
sudo visudo -cf /etc/sudoers.d/convarter-deploy

sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
if [ ! -f /home/deploy/.ssh/authorized_keys ]; then
  sudo install -m 600 -o deploy -g deploy /dev/null /home/deploy/.ssh/authorized_keys
fi

echo
echo "Append one line to /home/deploy/.ssh/authorized_keys. Replace the key with the GitHub Actions public key:"
echo "restrict,command=\"$BIN_DIR/ssh-dispatch.sh\" ssh-ed25519 AAAA... github-actions"
echo
echo "Copy $APP_DIR/.env.example to $APP_DIR/.env as root and set DOMAIN, HTTP_PORT=80, HTTPS_PORT=443, DATA_DIR=$DATA_DIR, and CERTBOT_EMAIL."
echo "Leave that file on the server. Deploy never overwrites it."
echo
echo "Open Oracle Security List ingress for TCP 80 and 443. On the VM, insert accept rules without flushing:"
echo "  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT"
echo "  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT"
echo "Save them with iptables-persistent or netfilter-persistent. Do not run iptables -F."
echo "Keep SSH password login disabled."
