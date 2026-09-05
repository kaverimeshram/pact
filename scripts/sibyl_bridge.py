#!/usr/bin/env python3
"""
PACT - Sibyl Memory Python Bridge
Direct interface to official sibyl_memory_client.MemoryClient
"""
import sys
import json
import os
from pathlib import Path

# Ensure ~/.local/bin or virtualenv packages are on sys.path if needed
try:
    from sibyl_memory_client import MemoryClient
except ImportError:
    # Try importing from standard uv tool location if run directly
    import site
    user_site = site.getusersitepackages()
    if user_site and user_site not in sys.path:
        sys.path.append(user_site)
    try:
        from sibyl_memory_client import MemoryClient
    except ImportError as e:
        sys.stderr.write(f"Error importing sibyl_memory_client: {e}\n")
        sys.exit(1)


def get_client():
    db_path = os.environ.get("SIBYL_DB_PATH", os.path.expanduser("~/.sibyl-memory/memory.db"))
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    return MemoryClient.local(path=db_path)


def handle_command(cmd, args):
    client = get_client()

    if cmd == "status":
        db_path = os.environ.get("SIBYL_DB_PATH", os.path.expanduser("~/.sibyl-memory/memory.db"))
        return {
            "status": "connected",
            "db_path": db_path,
            "exists": os.path.exists(db_path),
            "schema_version": client.schema_version() if hasattr(client, "schema_version") else 1
        }

    elif cmd == "set_entity":
        category = args.get("category")
        name = args.get("name")
        body = args.get("body")
        status = args.get("status")
        res = client.set_entity(category, name, body, status=status)
        return res

    elif cmd == "get_entity":
        category = args.get("category")
        name = args.get("name")
        try:
            res = client.get_entity(category, name)
            return {"found": True, "entity": res}
        except Exception as e:
            return {"found": False, "error": str(e)}

    elif cmd == "list_entities":
        category = args.get("category")
        limit = args.get("limit", 100)
        res = client.list_entities(category=category, limit=limit)
        return res

    elif cmd == "delete_entity":
        category = args.get("category")
        name = args.get("name")
        if hasattr(client, "delete_entity"):
            client.delete_entity(category, name)
            return {"deleted": True}
        elif hasattr(client, "archive_entity"):
            client.archive_entity(category, name, reason="deleted via bridge")
            return {"archived": True}
        return {"ok": True}

    elif cmd == "write_event":
        evaluated = args.get("evaluated")
        acted = args.get("acted")
        forward = args.get("forward")
        extra = args.get("extra")
        ev_id = client.write_event(
            evaluated=evaluated,
            acted=acted,
            forward=forward,
            extra=extra
        )
        return {"id": ev_id}

    elif cmd == "read_events":
        limit = args.get("limit", 50)
        res = client.read_events(limit=limit)
        return res

    elif cmd == "search":
        query = args.get("query")
        tiers = args.get("tiers")
        res = client.search(query)
        # res is SearchResults object containing hits list
        hits = []
        for h in res:
            hits.append({
                "tier": getattr(h, "tier", None) if not isinstance(h, dict) else h.get("tier"),
                "key": getattr(h, "key", None) if not isinstance(h, dict) else h.get("key"),
                "category": getattr(h, "category", None) if not isinstance(h, dict) else h.get("category"),
                "body": getattr(h, "body", None) if not isinstance(h, dict) else h.get("body"),
                "snippet": getattr(h, "snippet", None) if not isinstance(h, dict) else h.get("snippet"),
                "rank": getattr(h, "rank", 0) if not isinstance(h, dict) else h.get("rank", 0),
                "ts": getattr(h, "ts", None) if not isinstance(h, dict) else h.get("ts"),
            })
        verdict_val = getattr(res, "verdict", "ok")
        verdict_str = str(getattr(verdict_val, "code", verdict_val)) if verdict_val is not None else "ok"
        return {
            "verdict": verdict_str,
            "hits": hits
        }

    elif cmd == "clear_store":
        # Clean entities, journal_events, state_documents, FTS5 virtual tables and search_shadow
        db_path = os.environ.get("SIBYL_DB_PATH", os.path.expanduser("~/.sibyl-memory/memory.db"))
        import sqlite3
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        for tbl in [
            "journal_events", "journal_events_fts",
            "entities", "entities_fts",
            "state_documents", "state_documents_fts",
            "reference_documents", "reference_documents_fts",
            "search_shadow"
        ]:
            try:
                c.execute(f"DELETE FROM {tbl};")
            except Exception:
                pass
        conn.commit()
        conn.close()
        return {"cleared": True}

    else:
        raise ValueError(f"Unknown command: {cmd}")


def main():
    if len(sys.argv) < 2:
        # Read from stdin
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({"error": "No input provided"}))
            sys.exit(1)
        data = json.loads(raw)
        cmd = data.get("command")
        args = data.get("args", {})
    else:
        cmd = sys.argv[1]
        args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}

    try:
        result = handle_command(cmd, args)
        print(json.dumps({"success": True, "data": result}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
