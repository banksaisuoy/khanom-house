#!/bin/bash
# Robust dev server keep-alive.
# Restarts the server whenever it dies. Uses setsid for session isolation.
cd /home/z/my-project

while true; do
  # Kill any existing next process first
  pkill -9 -f "next dev" 2>/dev/null
  sleep 1
  
  # Start server with setsid (survives parent exit)
  setsid npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1 < /dev/null &
  
  # Wait for it to be ready
  for i in $(seq 1 30); do
    if curl -s -m 3 http://localhost:3000/ -o /dev/null 2>/dev/null; then
      echo "[$(date)] Server ready after ${i}s" >> /tmp/srv-keep.log
      break
    fi
    sleep 1
  done
  
  # Warmup the storefront so first preview is fast
  curl -s -m 20 http://localhost:3000/ -o /dev/null 2>/dev/null
  
  # Monitor every 3 seconds; restart if dead
  while true; do
    sleep 3
    if ! curl -s -m 3 http://localhost:3000/ -o /dev/null 2>/dev/null; then
      echo "[$(date)] Server died — restarting..." >> /tmp/srv-keep.log
      break
    fi
  done
done
