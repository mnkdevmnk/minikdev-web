#!/usr/bin/env python3
"""
GitHub senkronu: js/github-data.js dosyasını üretir.

Ne yapar:
  - PUBLIC repoların hepsini (ad, açıklama, dil, konu, yıldız, son push, commit sayısı) alır.
  - PRIVATE repoların sadece COMMIT SAYILARINI toplar. Adları, açıklamaları dosyaya YAZILMAZ.
  - Toplam commit = public + private.

Gereken: `gh` kurulu ve `gh auth login` yapılmış olmalı (private sayılar için).

Çalıştır:
  cd ~/KOD_CALISMALARIM/WEB_PORTFOLIO && python3 tools/github-sync.py
"""
import json, re, subprocess, sys, datetime, pathlib

KULLANICI = "mnkdevmnk"
# Hiç sayılmasın / gösterilmesin istediğin repolar (public ya da private)
HARIC = {"desktop-tutorial"}
# Son commit atılan repo sitede (öne çıkan kapağında) gösterilir. Sadece buradaki repoların
# adı yayına çıkar; listede olmayan private repo "gizli" yazılır, adı sızmaz.
SON_COMMIT_TANINAN = {"web-portfolio", "VS_iPad", "vs-ipad", "rihtim", "rihtim-macos",
                      "claude-goz", "esp32-projeler"}

KOK = pathlib.Path(__file__).resolve().parent.parent
CIKTI = KOK / "js" / "github-data.js"


def gh(*args):
    r = subprocess.run(["gh", *args], capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr


def commit_sayisi(repo):
    """Varsayılan daldaki commit sayısı. per_page=1 + Link başlığındaki son sayfa = toplam."""
    kod, out, err = gh("api", "-i", f"repos/{KULLANICI}/{repo}/commits?per_page=1")
    if kod != 0:
        return 0  # boş repo (409) vb.
    bas, _, govde = out.partition("\r\n\r\n") if "\r\n\r\n" in out else out.partition("\n\n")
    m = re.search(r'[?&]page=(\d+)>;\s*rel="last"', bas)
    if m:
        return int(m.group(1))
    try:
        return len(json.loads(govde))
    except Exception:
        return 0


def son_commit(repolar):
    if not repolar:
        return None
    r = max(repolar, key=lambda x: x["pushedAt"] or "")
    return {"repo": r["name"] if r["name"] in SON_COMMIT_TANINAN else "gizli", "pushedAt": r["pushedAt"]}


def main():
    kod, out, err = gh("repo", "list", KULLANICI, "--limit", "200", "--json",
                       "name,visibility,isFork,isArchived,description,primaryLanguage,"
                       "repositoryTopics,stargazerCount,pushedAt,createdAt,homepageUrl,url")
    if kod != 0:
        sys.exit("gh repo list başarısız:\n" + err)
    repolar = [r for r in json.loads(out) if r["name"] not in HARIC and not r["isFork"]]

    public, ozel_commit, ozel_repo = [], 0, 0
    for r in repolar:
        n = commit_sayisi(r["name"])
        if r["visibility"] == "PUBLIC":
            public.append({
                "name": r["name"],
                "description": r["description"] or "",
                "language": (r["primaryLanguage"] or {}).get("name", ""),
                "topics": [t["name"] for t in (r["repositoryTopics"] or [])],
                "stars": r["stargazerCount"],
                "pushedAt": r["pushedAt"],
                "createdAt": r["createdAt"],
                "homepage": r["homepageUrl"] or "",
                "url": r["url"],
                "archived": r["isArchived"],
                "commits": n,
            })
        else:
            ozel_commit += n
            ozel_repo += 1
        print(f"  {r['visibility']:<8} {n:>4}  {r['name'] if r['visibility'] == 'PUBLIC' else '(gizli)'}")

    public.sort(key=lambda x: x["pushedAt"], reverse=True)
    pub_commit = sum(p["commits"] for p in public)
    veri = {
        "user": KULLANICI,
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "totals": {
            "commits": pub_commit + ozel_commit,
            "publicCommits": pub_commit,
            "privateCommits": ozel_commit,
            "publicRepos": len(public),
            "privateRepos": ozel_repo,
        },
        "repos": public,
        "son": son_commit(repolar),
    }
    CIKTI.write_text(
        "/* OTOMATİK ÜRETİLDİ: tools/github-sync.py. Elle düzenleme, betiği tekrar çalıştır. */\n"
        "window.GITHUB = " + json.dumps(veri, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8")
    t = veri["totals"]
    print(f"\n✓ {CIKTI.relative_to(KOK)} yazıldı · {t['commits']} commit "
          f"({t['publicCommits']} public + {t['privateCommits']} private) · "
          f"{t['publicRepos']} public, {t['privateRepos']} private repo")


if __name__ == "__main__":
    main()
