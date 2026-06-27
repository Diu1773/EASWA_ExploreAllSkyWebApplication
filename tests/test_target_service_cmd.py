import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import target_service


def test_stellar_cmd_topic_combines_variable_and_eclipsing_targets():
    response = target_service.list_targets("stellar_cmd")
    topic_ids = {target.topic_id for target in response.targets}

    assert len(response.targets) == 6
    assert topic_ids == {"variable_star", "eclipsing_binary"}
