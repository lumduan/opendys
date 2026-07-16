# Deploying opendys on AWS EC2 behind a Cloudflare Tunnel (no public IPv4)

How opendys runs in production on a small EC2 instance with **no public IPv4 address** — inbound comes
through a **Cloudflare Tunnel**, and all continuous outbound traffic uses **IPv6**.

## Why this shape

- **Inbound:** `cloudflared` opens an *outbound* connection to Cloudflare's edge, so the origin needs
  **no open ports and no public IP**. Requests flow `Browser → Cloudflare → tunnel → localhost:8080`.
- **Outbound:** the only continuous egress is the tunnel and — if cloud OCR/ASR is enabled — the Typhoon
  API. Both are reachable over **IPv6**, so a free **egress-only internet gateway** covers them: no NAT
  gateway, and no public-IPv4 hourly charge.
- **The one IPv4-only dependency is pulling the image** (`ghcr.io` has no AAAA record). Handle it by
  attaching a **temporary Elastic IP** during install/updates only, then releasing it.

```
Browser ──HTTPS──> Cloudflare edge ──tunnel (IPv6)──> cloudflared ──http://localhost:8080──> nginx (opendys)
                                                                                     │ OCR/ASR (IPv6)
                                                                          egress-only IGW ──> api.opentyphoon.ai
```

> ⚠️ **nginx resolver (important on IPv6-only hosts):** the Typhoon upstream is dual-stack, but nginx
> defaults to IPv4-only resolution. On a host with **IPv6-only egress** you must set
> `NGINX_RESOLVER_FLAGS=ipv4=off ipv6=on` (available since v1.7.4) or cloud OCR/ASR stalls on the
> unreachable A record. On IPv4 / dual-stack hosts, leave the default (`ipv6=off`).

## One-time AWS setup

Create these in your VPC/region using a **dedicated** subnet so you don't touch defaults or other
workloads:

- A **dual-stack subnet** — an IPv4 CIDR (for the private IP + a temporary EIP) **and** an IPv6 `/64`;
  `MapPublicIpOnLaunch=false`, `AssignIpv6AddressOnCreation=true`. (If the VPC's IPv6 `/56` is already
  fully used by another subnet, associate a **second** Amazon-provided `/56` and carve the `/64` from it
  — additive and non-disruptive.)
- An **egress-only internet gateway**; route table: `::/0 → egress-only IGW` and `0.0.0.0/0 → IGW`
  (the IPv4 route is dormant unless an EIP is attached).
- A **security group with no inbound rules** (default egress allow-all is fine).
- An **IAM instance role** with the managed policy `AmazonSSMManagedInstanceCore` (keyless SSM access).

Launch a **t3.micro** (Amazon Linux 2023) with `--no-associate-public-ip-address`, IPv6 auto-assigned,
the SSM instance profile, IMDSv2 required, and an encrypted gp3 root volume.

## Install (during a temporary EIP window)

1. **Attach an Elastic IP** — provides IPv4 for the image pull and lets the SSM agent register.
2. **Connect** via SSM Session Manager (AWS Console → EC2 → *Connect* → *Session Manager*). No SSH key,
   no open port. *(SSM works while the EIP is attached; it also works long-term only if SSM is reachable
   over IPv6 in your region.)*
3. On the box:
   ```bash
   sudo dnf install -y docker && sudo systemctl enable --now docker

   # optional: 2 GB swap (t3.micro has 1 GB RAM)
   sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none && sudo chmod 600 /swapfile \
     && sudo mkswap /swapfile && sudo swapon /swapfile \
     && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

   # persist config + secrets so restarts and updates need no re-entry
   # (chmod 600; do NOT quote the resolver value — docker --env-file keeps the whole value incl. the space)
   sudo mkdir -p /opt/opendys
   sudo tee /opt/opendys/.env >/dev/null <<'EOF'
   TYPHOON_API=your-typhoon-key
   TUNNEL_TOKEN=your-cloudflare-tunnel-token
   NGINX_RESOLVER_FLAGS=ipv4=off ipv6=on
   EOF
   sudo chmod 600 /opt/opendys/.env

   # app (nginx :8080) + cloudflared, both on host networking so they egress over the host's IPv6
   sudo docker run -d --name opendys     --restart unless-stopped --network host \
     --env-file /opt/opendys/.env ghcr.io/lumduan/opendys:latest
   sudo docker run -d --name cloudflared --restart unless-stopped --network host \
     --env-file /opt/opendys/.env cloudflare/cloudflared:latest tunnel --no-autoupdate run
   ```
4. In **Cloudflare Zero Trust → Networks → Tunnels**, add a **Public Hostname** → your domain →
   service **HTTP** → `localhost:8080`. TLS terminates at Cloudflare; enable **HSTS** at the edge
   (the container intentionally serves plain HTTP for the edge to terminate).
5. Verify, then **release the Elastic IP** (release, not just disassociate — an idle EIP still bills).
   [`scripts/verify-deploy.sh`](scripts/verify-deploy.sh) checks reachability, the production build,
   the precache manifest, `sw.js` caching, CSP, `Permissions-Policy` (`camera` / `microphone`), that
   `/api/*` is actually served by the proxy rather than swallowed by the SPA fallback, whether
   `TYPHOON_API` survived the last recreate, SPA fallback, and edge HTML injection. It detects
   whether it's talking to the origin or Cloudflare and adjusts. Non-zero exit on any failure.

   The box is provisioned with **Docker only — there is no repo checkout on it**, so fetch the
   script rather than trying to run it from a working copy. The EIP window is also the only time
   the box has the IPv4 to fetch anything:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/lumduan/opendys/main/scripts/verify-deploy.sh \
     | bash -s http://localhost:8080
   sudo docker logs --tail 15 cloudflared                  # "Registered tunnel connection"
   ```
   **This instance is shared with [smart-hand-math](https://github.com/lumduan/smart-hand-math)**
   on `:8081` (see its `DEPLOY-AWS.md`). It has its own script — run it too. A recreate here
   shouldn't touch it, but a port collision, or the 1 GB box running out of memory and the kernel
   picking a victim, would not show up in a status line:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/lumduan/smart-hand-math/main/scripts/verify-deploy.sh \
     | bash -s http://127.0.0.1:8081
   ```
   Once the tunnel is up, run both against their public URLs from a checkout, anywhere:
   ```bash
   ./scripts/verify-deploy.sh https://opendys.com
   ./scripts/verify-deploy.sh https://handmath.org         # smart-hand-math repo's copy
   ```
   Every check is exercised against a deliberately-broken deployment by
   [`scripts/test-verify-deploy.sh`](scripts/test-verify-deploy.sh) — a check nobody has watched
   fail is not a check.

   **What it cannot tell you:** it reads headers and config only. It cannot prove the PWA works
   (only cutting the network can — `(await caches.keys()).length` must be `> 0`, then reload
   offline), and `capabilities:true` only means the key is *set*, not that `api.opentyphoon.ai` is
   reachable — see the resolver warning above.

## Updating the image

`ghcr.io` is IPv4-only, so updates need a brief EIP window:

1. Attach an Elastic IP.
2. Connect via SSM →
   ```bash
   sudo docker pull ghcr.io/lumduan/opendys:latest
   sudo docker rm -f opendys
   sudo docker run -d --name opendys --restart unless-stopped --network host \
     --env-file /opt/opendys/.env ghcr.io/lumduan/opendys:latest
   ```
   (secrets load from `/opt/opendys/.env` — nothing to retype)
3. Release the Elastic IP.

## Notes

- **Reboots** need no action — `--restart unless-stopped` brings both containers back with their config.
- **Cost:** compute can be **$0** on a Reserved Instance; steady state is essentially the EBS root
  volume (~$0.80/mo for gp3 10 GiB). No public-IPv4 charge, no NAT gateway.
- **Cloud OCR/ASR is optional:** omit `TYPHOON_API` for a fully static, zero-egress deployment
  (`/api/*` then returns `503` / `capabilities:false`, and the box makes no outbound calls at all).
- See [`RELEASING.md`](RELEASING.md) for how the `ghcr.io/lumduan/opendys` image is built and tagged.
