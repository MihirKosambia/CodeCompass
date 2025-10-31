import json
import logging
import os
from pathlib import Path
from typing import List, Tuple

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from embedchain import App as EmbedchainApp
from embedchain.loaders.github import GithubLoader

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR / "db"
REPOS_FILE = BASE_DIR / "repos.json"
CONFIG_FILE = BASE_DIR / "embedchain.yaml"

DB_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger("github-chat")

# Initialize a single shared Embedchain app instance from YAML config
try:
    loader = GithubLoader(config={"token": os.getenv("GITHUB_TOKEN")})
    _embed_app = EmbedchainApp.from_config(config_path=str(CONFIG_FILE))
except Exception as e:
    logger.exception("Failed to initialize Embedchain app: %s", e)
    raise


def _normalize_repo(raw: str) -> str:
    """Normalize repo input to the canonical 'owner/repo' form.

    Accepts inputs like:
      - https://github.com/owner/repo
      - http://github.com/owner/repo
      - github.com/owner/repo
      - owner/repo
      - owner/repo.git

    Returns 'owner/repo' or raises ValueError on invalid input.
    """
    if not raw or not isinstance(raw, str):
        raise ValueError("Empty repository string")
    s = raw.strip()
    # Strip trailing .git
    if s.endswith(".git"):
        s = s[: -4]
    # Remove common prefixes
    for prefix in ("https://github.com/", "http://github.com/", "github.com/"):
        if s.startswith(prefix):
            s = s[len(prefix) :]
            break
    # Remove any leading/trailing slashes
    s = s.strip("/")
    parts = s.split("/")
    if len(parts) < 2:
        raise ValueError("Invalid repository format. Expected owner/repo or a full GitHub URL.")
    owner = parts[0].strip()
    repo = parts[1].strip()
    if not owner or not repo:
        raise ValueError("Invalid repository owner/name")
    return f"{owner}/{repo}"


def _load_repos() -> List[str]:
    if not REPOS_FILE.exists():
        return []
    try:
        with REPOS_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                # Ensure strings only
                return [str(x) for x in data]
            return []
    except Exception:
        logger.warning("Failed to read repos.json; returning empty list.")
        return []


def _save_repos(repos: List[str]) -> None:
    # Deduplicate while preserving order
    seen = set()
    ordered = []
    for r in repos:
        if r not in seen:
            seen.add(r)
            ordered.append(r)
    with REPOS_FILE.open("w", encoding="utf-8") as f:
        json.dump(ordered, f, indent=2)


def _ok(payload: dict, status: int = 200):
    return jsonify(payload), status


def _error(message: str, status: int = 400):
    return jsonify({"error": message}), status


# Flask application
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route("/api/add_repo", methods=["POST"])
def add_repo():
    try:
        payload = request.get_json(silent=True) or {}
        raw = (payload.get("repo_url") or "").strip()
        if not raw:
            return _error("Missing 'repo_url' in request body.", 400)
        try:
            canonical = _normalize_repo(raw)
        except ValueError as e:
            return _error(str(e), 400)

        # Use canonical owner/repo for persistence and operations
        repos = _load_repos()
        if canonical in repos:
            return _ok({"message": "Repository already added", "repo": canonical})

        logger.info("Adding repository to vector DB: %s", canonical)
        # Use owner/repo format which the GithubLoader understands
        _embed_app.add(f"repo:{canonical} type:repo", data_type="github", loader=loader, metadata={"github_repo": canonical})

        # Persist canonical form if successful
        repos.append(canonical)
        _save_repos(repos)

        return _ok({"message": "Repository added successfully!", "repo": canonical})
    except Exception as e:
        logger.exception("/api/add_repo failed: %s", e)
        return _error(f"Failed to add repository. Reason: {str(e)}", 500)


@app.route("/api/get_repos", methods=["GET"])
def get_repos():
    try:
        repos = _load_repos()
        return _ok({"repos": repos})
    except Exception as e:
        logger.exception("/api/get_repos failed: %s", e)
        return _error(f"Failed to read repositories. Reason: {str(e)}", 500)


@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        payload = request.get_json(silent=True) or {}
        raw = (payload.get("repo_url") or "").strip()
        query = (payload.get("query") or "").strip()
        if not raw:
            return _error("Missing 'repo_url' in request body.", 400)
        if not query:
            return _error("Missing 'query' in request body.", 400)

        # Restrict context to selected repository using 'where' as specified in README
        try:
            canonical = _normalize_repo(raw)
        except ValueError as e:
            return _error(str(e), 400)

        logger.info("Querying repo: %s", canonical)
        # Query using canonical owner/repo as the data_source identifier
        answer = _embed_app.query(query, where={"github_repo": canonical})
        return _ok({"answer": answer})
    except Exception as e:
        logger.exception("/api/chat failed: %s", e)
        return _error(f"Failed to generate answer. Reason: {str(e)}", 500)


@app.route("/api/health", methods=["GET"])
def health():
    return _ok({"status": "ok"})


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "true").lower() == "true"
    app.run(host=host, port=port, debug=debug)
