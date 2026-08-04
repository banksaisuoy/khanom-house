#!/bin/bash
# Keep-alive watchdog for the Next.js dev server.
# Restarts the server if it dies. Runs every 5 seconds.
cd /home/z/my-project

while true; do
  if ! curl -s -m 3 http://localhost:3000/ -o /dev/null 2>/dev/null; then
    echo "[$(date)] Server down — restarting..." >> /tmp/keep-alive.log
    pkill -9 -f "next dev" 2>/dev/null
    sleep 2
    nohup npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
    # Wait for startup
    for i in $(seq 1 20); do
      if curl -s -m 3 http://localhost:3000/ -o /dev/null 2>/dev/null; then
        echo "[$(date)] Server up after ${i}s" >> /tmp/keep-alive.log
        break
      fi
      sleep 1
    done
    # Warmup the storefront route so first preview load is fast
    curl -s -m 20 http://localhost:3000/ -o /dev/null 2>/dev/null
  fi
  sleep 5
done
