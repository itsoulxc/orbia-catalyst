import sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; sys.path[:0]=[str(ROOT/"server"),str(ROOT/"training")]
from adapters import AdapterRegistry
from gate import promote
from router import route
from hw_probe import suggested
from verifier import verify

class EfficiencyLadderTests(unittest.TestCase):
    def test_verifier_runs_python_fixture(self): self.assertTrue(verify(ROOT/"eval/fixtures/python_compile", "compile+test", 20).ok)
    def test_router_is_off_by_default(self): self.assertEqual(route("debug failing test", 9).model_id, "prism-2.1")
    def test_probe_defaults_are_conservative(self): self.assertEqual(suggested("zenith-2.1", {"ram_gb":8,"logical_cores":4})["kv_type"], "q4_0")
    def test_adapter_rollback(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            registry=AdapterRegistry(Path(directory)/"adapters.json"); registry.activate("spark","v1"); registry.activate("spark","v2"); self.assertEqual(registry.rollback("spark"), "v1")
    def test_gate_rejects_category_regression(self): self.assertFalse(promote({"pass_rate":.5,"pass_rate_by_category":{"debugging":.5}}, {"pass_rate":.5,"pass_rate_by_category":{"debugging":.47}})[0])
