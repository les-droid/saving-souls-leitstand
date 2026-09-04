# Schnitt 11 – Listener installieren (Aufgabe für Claude Code, einmalig)

Ziel: Der Leitstand-Listener läuft dauerhaft auf diesem Rechner und nimmt Claude-Aufgaben aus dem Board entgegen.

1. `mkdir -p ~/saving-souls-listener` und alle Dateien aus `schnitt11/` dieses Repos dorthin kopieren
   (listener.mjs, package.json, .env.example, com.dropout.saving-souls-listener.plist).
2. Falls `schnitt11/.env` im Repo liegt: nach `~/saving-souls-listener/.env` kopieren, dann aus dem Repo entfernen
   (`git rm schnitt11/.env`, Commit "[leitstand] .env lokal übernommen") — der Key darf nicht im Repo bleiben.
   Sonst `.env` aus `.env.example` anlegen und `REPO_DIR` auf den absoluten Pfad dieses Repos setzen.
3. `cd ~/saving-souls-listener && npm install`
4. In der plist die Pfade anpassen: node-Pfad = `which node`, Home-Verzeichnis = `$HOME`.
5. `cp com.dropout.saving-souls-listener.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/com.dropout.saving-souls-listener.plist`
6. Prüfen: `sleep 5 && tail -20 ~/saving-souls-listener/listener.log` muss "Realtime: SUBSCRIBED" und "Listener bereit" zeigen.
7. Ergebnis (ok / Fehlermeldung) in `schnitt11/INSTALL-STATUS.md` schreiben und committen.
8. Diese Datei danach in `schnitt11/BOOTSTRAP.erledigt.md` umbenennen und committen, damit sie nicht erneut ausgeführt wird.
