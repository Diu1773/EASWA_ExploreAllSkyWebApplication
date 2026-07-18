import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import config


# The size cap is the guard that actually prevents a huge JSON body from
# exhausting the 512 MB instance: the blow-up happens during parsing, before
# Pydantic validation (or any downsampling) could look at the payload.
def test_fit_endpoints_take_the_tighter_cap():
    """Both fit routes carry only light-curve points and are the heaviest.

    /kmtnet/fit matters most: it runs a Levenberg-Marquardt curve_fit and has
    neither a rate limit nor a concurrency gate, so this cap is its only bound.
    """
    assert config.body_limit_for_path("/api/transit/fit") == config.MAX_FIT_REQUEST_BODY_BYTES
    assert (
        config.body_limit_for_path("/api/transit/fit-stream")
        == config.MAX_FIT_REQUEST_BODY_BYTES
    )
    assert config.body_limit_for_path("/api/kmtnet/fit") == config.MAX_FIT_REQUEST_BODY_BYTES


def test_other_endpoints_take_the_general_cap():
    """Draft autosave is the largest legitimate body — its envelope embeds the
    whole photometry response, every light-curve point included."""
    for path in ("/api/drafts/mine/abc", "/api/records/mine", "/", "/assets/index.js"):
        assert config.body_limit_for_path(path) == config.MAX_REQUEST_BODY_BYTES


def test_fit_cap_is_tighter_than_the_general_one_but_still_roomy():
    """~6x headroom over the largest real fit request (a full 200 s-cadence
    sector is ~12k points ≈ 1.2 MB), and well under the general cap."""
    assert config.MAX_FIT_REQUEST_BODY_BYTES < config.MAX_REQUEST_BODY_BYTES
    assert config.MAX_FIT_REQUEST_BODY_BYTES >= 4 * 1024 * 1024
