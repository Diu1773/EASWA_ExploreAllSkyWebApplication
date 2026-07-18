import sys
from pathlib import Path
from urllib.error import URLError


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from adapters.transit_archive import TransitArchive
import adapters.transit_archive as transit_archive_module


def test_list_targets_returns_empty_when_live_query_has_no_matches(monkeypatch):
    archive = TransitArchive()

    monkeypatch.setattr(transit_archive_module, "_live_target_catalog", lambda *args: [])

    result = archive.list_targets(
        "exoplanet_transit",
        limit=50,
        min_depth_pct=10.0,
        max_period_days=5.0,
        max_host_vmag=13.0,
    )

    assert result == []


def test_list_targets_falls_back_only_on_live_query_failure(monkeypatch):
    archive = TransitArchive()

    def raise_network_error(*args):
        raise URLError("offline")

    monkeypatch.setattr(transit_archive_module, "_live_target_catalog", raise_network_error)

    result = archive.list_targets("exoplanet_transit", limit=3)

    assert result == []


_WASP_6_B = {
    "id": "wasp_6_b",
    "name": "WASP-6 b",
    "ra": 348.1450,
    "dec": -22.6741,
    "constellation": "Aquarius",
    "type": "Transit Planet",
    "period_days": 3.361,
    "magnitude_range": "11.92 V host",
    "transit_depth_pct": 2.41,
    "topic_id": "exoplanet_transit",
    "data_source": "nasa_exoplanet_archive",
}

_OTHER_PLANET = {
    "id": "other_planet",
    "name": "Other b",
    "ra": 10.0,
    "dec": 10.0,
    "constellation": "Cetus",
    "type": "Transit Planet",
    "period_days": 1.0,
    "magnitude_range": "10.00 V host",
    "transit_depth_pct": 30.0,
    "topic_id": "exoplanet_transit",
    "data_source": "nasa_exoplanet_archive",
}


def _stub_bundled_pin(monkeypatch, live_targets):
    """wasp_6_b is the bundled target; nothing here touches the network."""
    monkeypatch.setattr(
        transit_archive_module, "_live_target_catalog", lambda *args: list(live_targets)
    )
    monkeypatch.setattr(transit_archive_module, "_bundled_target_ids", lambda: ["wasp_6_b"])
    monkeypatch.setattr(
        transit_archive_module,
        "_live_target_by_id",
        lambda target_id: _WASP_6_B if target_id == "wasp_6_b" else None,
    )


def test_bundled_target_is_pinned_ahead_of_the_top_n_limit(monkeypatch):
    """The instant-analysis demo target must survive the top-N cut.

    WASP-6 b ranks below the default 20 of the live catalog, so the sky map had
    no marker for the very target the classroom demo depends on.
    """
    archive = TransitArchive()
    _stub_bundled_pin(monkeypatch, [_OTHER_PLANET])

    result = archive.list_targets(
        "exoplanet_transit",
        limit=1,
        min_depth_pct=1.0,
        max_period_days=5.0,
        max_host_vmag=13.0,
    )

    assert [target["id"] for target in result] == ["wasp_6_b", "other_planet"]


def test_bundled_target_is_not_pinned_when_it_fails_the_filters(monkeypatch):
    """Pinning beats the limit, not the criteria.

    Asking for depth >= 10% must not hand back the 2.41% bundled planet — that
    would misreport the data the learner asked for.
    """
    archive = TransitArchive()
    _stub_bundled_pin(monkeypatch, [_OTHER_PLANET])

    result = archive.list_targets(
        "exoplanet_transit",
        limit=50,
        min_depth_pct=10.0,
        max_period_days=5.0,
        max_host_vmag=13.0,
    )

    assert [target["id"] for target in result] == ["other_planet"]


def test_get_target_uses_exact_lookup_on_cache_miss(monkeypatch):
    archive = TransitArchive()
    expected = {
        "id": "wasp_52_b",
        "name": "WASP-52 b",
        "ra": 348.4947931,
        "dec": 8.7610793,
        "constellation": "Pegasus",
        "type": "Transit Planet",
        "period_days": 1.7497798,
        "magnitude_range": "12.19 V host",
        "description": "cached later",
        "topic_id": "exoplanet_transit",
        "data_source": "nasa_exoplanet_archive",
    }

    monkeypatch.setattr(
        transit_archive_module,
        "_live_target_by_id",
        lambda target_id: expected if target_id == "wasp_52_b" else None,
    )

    result = archive.get_target("wasp_52_b")

    assert result == expected


def test_candidate_target_names_include_common_hyphenated_forms():
    candidates = transit_archive_module._candidate_target_names("hat_p_7_b")

    assert "hat p 7 b" in candidates
    assert "hat-p-7 b" in candidates


def test_list_observations_returns_empty_when_sector_lookup_fails(monkeypatch):
    archive = TransitArchive()
    archive._targets_by_id["live_target"] = {
        "id": "live_target",
        "name": "Live Target",
        "ra": 12.3,
        "dec": -45.6,
        "topic_id": "exoplanet_transit",
    }

    transit_archive_module._sector_observations.cache_clear()

    def raise_network_error(*args, **kwargs):
        raise URLError("offline")

    monkeypatch.setattr(transit_archive_module, "urlopen", raise_network_error)

    result = archive.list_observations("live_target")

    assert result == []
