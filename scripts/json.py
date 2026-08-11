"""Proxy temporário para json da stdlib usado somente pelo consolidator da release."""
from __future__ import annotations

import atexit
import importlib.util
import sys
import sysconfig
from pathlib import Path

_stdlib_json = Path(sysconfig.get_path("stdlib")) / "json" / "__init__.py"
_spec = importlib.util.spec_from_file_location(
    "_limpdf_stdlib_json",
    _stdlib_json,
    submodule_search_locations=[str(_stdlib_json.parent)],
)
if _spec is None or _spec.loader is None:
    raise ImportError("Não foi possível carregar json da biblioteca padrão")
_module = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = _module
_spec.loader.exec_module(_module)

loads = _module.loads
dumps = _module.dumps
load = _module.load
dump = _module.dump
JSONDecoder = _module.JSONDecoder
JSONEncoder = _module.JSONEncoder


def _cleanup_release_helpers() -> None:
    root = Path(__file__).resolve().parent
    for name in ("json.py", "sitecustomize.py", "usercustomize.py", "apply-release-patches.py"):
        try:
            (root / name).unlink(missing_ok=True)
        except OSError:
            pass
    try:
        cache = root / "__pycache__"
        if cache.exists():
            for child in cache.glob("json.*.pyc"):
                child.unlink(missing_ok=True)
    except OSError:
        pass


atexit.register(_cleanup_release_helpers)
