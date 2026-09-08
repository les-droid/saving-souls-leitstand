#!/usr/bin/env bash
# Saving Souls – Leitstand-Listener auf einem Linux-VPS (Debian/Ubuntu) einrichten.
# Idempotent: kann mehrfach laufen. Als root oder mit sudo ausführen.
#
#   curl -fsSL https://raw.githubusercontent.com/les-droid/saving-souls-gedaechtnis/main/schnitt11/vps/install.sh | sudo bash
# (privates Repo → stattdessen: Datei per scp hochladen oder Inhalt einfügen)
#
# Danach die drei Schritte ausführen, die das Script am Ende anzeigt (Deploy-Key, Claude-Token, Supabase-Key).
set -euo pipefail

USER_NAME=leitstand
HOME_DIR=/home/$USER_NAME
REPO_SSH=git@github.com:les-droid/saving-souls-gedaechtnis.git
REPO_DIR=$HOME_DIR/saving-souls-gedaechtnis
APP_DIR=$HOME_DIR/saving-souls-listener
ZIEL=${ZIEL:-vps}

echo "== Pakete"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates gnupg ripgrep >/dev/null
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "   node $(node -v), npm $(npm -v)"

echo "== Benutzer $USER_NAME"
id -u $USER_NAME >/dev/null 2>&1 || useradd -m -s /bin/bash $USER_NAME

echo "== Claude Code"
npm install -g @anthropic-ai/claude-code >/dev/null 2>&1 || npm install -g @anthropic-ai/claude-code
echo "   $(claude --version 2>/dev/null || echo 'claude installiert')"

echo "== SSH-Deploy-Key für GitHub"
sudo -u $USER_NAME bash -c "
  mkdir -p $HOME_DIR/.ssh && chmod 700 $HOME_DIR/.ssh
  [ -f $HOME_DIR/.ssh/id_ed25519 ] || ssh-keygen -q -t ed25519 -N '' -C 'leitstand-vps' -f $HOME_DIR/.ssh/id_ed25519
  grep -q github.com $HOME_DIR/.ssh/known_hosts 2>/dev/null || ssh-keyscan -t ed25519 github.com >> $HOME_DIR/.ssh/known_hosts 2>/dev/null
  git config --global user.name 'Claude VPS' ; git config --global user.email 'leitstand-vps@dropout-films.de'
"

echo "== Listener-Ordner"
sudo -u $USER_NAME mkdir -p $APP_DIR
if [ ! -f $APP_DIR/.env ]; then
  sudo -u $USER_NAME bash -c "cat > $APP_DIR/.env <<EOF
SUPABASE_URL=https://yfkckqbrksivksotopfo.supabase.co
SUPABASE_SERVICE_KEY=
REPO_DIR=$REPO_DIR
ZIEL=$ZIEL
CLAUDE_BIN=claude
CLAUDE_ARGS=--permission-mode acceptEdits
TIMEOUT_MIN=45
POLL_SEC=30
GIT_PUSH=true
EOF
chmod 600 $APP_DIR/.env"
fi

echo "== systemd-Dienst"
cat > /etc/systemd/system/saving-souls-listener.service <<EOF
[Unit]
Description=Saving Souls Leitstand-Listener ($ZIEL)
After=network-online.target
Wants=network-online.target

[Service]
User=$USER_NAME
WorkingDirectory=$APP_DIR
EnvironmentFile=-$HOME_DIR/.claude-token.env
ExecStart=/usr/bin/node $APP_DIR/listener.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable saving-souls-listener >/dev/null 2>&1 || true

cat <<EOF

================================================================
Grundinstallation fertig. Jetzt drei Schritte von Hand:

1) DEPLOY-KEY bei GitHub eintragen (Repo saving-souls-gedaechtnis → Settings → Deploy keys → Add,
   Haken "Allow write access"). Öffentlicher Schlüssel:

$(cat $HOME_DIR/.ssh/id_ed25519.pub)

   Danach als $USER_NAME das Repo holen und die Listener-Dateien kopieren:
     sudo -iu $USER_NAME bash -c 'git clone $REPO_SSH $REPO_DIR && cp $REPO_DIR/schnitt11/{listener.mjs,package.json} $APP_DIR/ && cd $APP_DIR && npm install --silent'

2) CLAUDE ANMELDEN (einmalig, über ein anderes Gerät mit Browser):
     sudo -iu $USER_NAME claude setup-token
   Den angezeigten Link im Browser öffnen, bestätigen, Code zurück ins Terminal. Das Token danach ablegen:
     sudo -iu $USER_NAME bash -c 'read -s -p "Token: " T; echo; printf "CLAUDE_CODE_OAUTH_TOKEN=%s\n" "\$T" > ~/.claude-token.env; chmod 600 ~/.claude-token.env'

3) SUPABASE-KEY (eigener Secret-Key, Name "$ZIEL": Dashboard → Project Settings → API Keys → Create new API key → Secret):
     sudo -iu $USER_NAME bash -c 'read -s -p "sb_secret-Key: " K; echo; sed -i -E "s|^SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=\$K|" $APP_DIR/.env'

Dann starten und prüfen:
     sudo systemctl restart saving-souls-listener && sleep 6 && sudo journalctl -u saving-souls-listener -n 5 --no-pager
   Es müssen "Realtime: SUBSCRIBED" und "Listener bereit" erscheinen.
================================================================
EOF
